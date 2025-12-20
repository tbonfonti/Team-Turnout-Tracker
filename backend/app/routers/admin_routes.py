# backend/app/routers/admin_routes.py

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
import os
import uuid
import csv
import io
import shutil
from typing import Optional, List

from app.database import get_db
from app.models import User, Voter, UserVoterTag, Branding, UserCountyAccess
from app.schemas import BrandingOut, InviteUserRequest, UserOut, CountyAccessUpdate, TagOverviewItem
from app.deps import get_current_admin
from ..paths import UPLOADS_DIR

router = APIRouter(prefix="/admin", tags=["Admin"])


# -----------------------------------------------------
# Helper: ensure uploads directory exists
# -----------------------------------------------------
def ensure_uploads_dir():
    os.makedirs(UPLOADS_DIR, exist_ok=True)
    return UPLOADS_DIR


# -----------------------------------------------------
# Admin: List users
# -----------------------------------------------------
@router.get("/users", response_model=list[UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    users = db.query(User).order_by(User.email.asc()).all()
    return users


# -----------------------------------------------------
# Admin: Create user (invite replacement)
# -----------------------------------------------------
@router.post("/users", response_model=UserOut)
def create_user(
    payload: InviteUserRequest,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")

    from app.auth import get_password_hash  # imported lazily to avoid circular

    new_user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        is_admin=payload.is_admin,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


# -----------------------------------------------------
# Admin: Import voters CSV
# -----------------------------------------------------
@router.post("/import/voters")
def import_voters(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    content = file.file.read().decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(content))

    imported = 0
    updated = 0

    for row in reader:
        voter_id = row.get("voter_id") or row.get("VoterID") or row.get("VOTER_ID")
        if not voter_id:
            # Skip any rows without a voter_id
            continue

        voter = db.query(Voter).filter(Voter.voter_id == voter_id).first()
        if voter:
            # Update some fields if they exist in the CSV
            voter.first_name = row.get("first_name") or voter.first_name
            voter.last_name = row.get("last_name") or voter.last_name
            voter.address = row.get("address") or voter.address
            voter.city = row.get("city") or voter.city
            voter.state = row.get("state") or voter.state
            voter.zip_code = row.get("zip_code") or voter.zip_code
            voter.county = row.get("county") or voter.county
            voter.precinct = row.get("precinct") or voter.precinct
            voter.registered_party = row.get("registered_party") or voter.registered_party
            voter.phone = row.get("phone") or voter.phone
            voter.email = row.get("email") or voter.email
            updated += 1
        else:
            voter = Voter(
                voter_id=voter_id,
                first_name=row.get("first_name") or "",
                last_name=row.get("last_name") or "",
                address=row.get("address"),
                city=row.get("city"),
                state=row.get("state"),
                zip_code=row.get("zip_code"),
                county=row.get("county"),
                precinct=row.get("precinct"),
                registered_party=row.get("registered_party"),
                phone=row.get("phone"),
                email=row.get("email"),
            )
            db.add(voter)
            imported += 1

    db.commit()

    return {
        "imported": imported,
        "updated": updated,
    }


# -----------------------------------------------------
# Admin: Import voted CSV
# -----------------------------------------------------
@router.post("/import/voted")
def import_voted(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    if not file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    content = file.file.read().decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(content))

    updated = 0
    not_found = 0

    for row in reader:
        voter_id = row.get("voter_id") or row.get("VoterID") or row.get("VOTER_ID")
        if not voter_id:
            continue

        voter = db.query(Voter).filter(Voter.voter_id == voter_id).first()
        if voter:
            voter.has_voted = True
            updated += 1
        else:
            not_found += 1

    db.commit()

    return {
        "updated_voted": updated,
        "not_found": not_found,
    }


# -----------------------------------------------------
# Admin: Delete all voters
# -----------------------------------------------------
@router.delete("/voters")
def delete_all_voters(
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    # Delete tags first
    db.query(UserVoterTag).delete()
    # Then voters
    db.query(Voter).delete()
    db.commit()
    return {"status": "ok", "message": "All voters deleted."}


# -----------------------------------------------------
# Admin: Upload logo + update branding
# -----------------------------------------------------
@router.post("/branding/logo", response_model=BrandingOut)
def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    # Ensure uploads directory
    uploads_dir = ensure_uploads_dir()

    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".png", ".jpg", ".jpeg", ".gif", ".webp"]:
        raise HTTPException(
            status_code=400,
            detail="Only image files (.png, .jpg, .jpeg, .gif, .webp) are allowed",
        )

    new_filename = f"logo_{uuid.uuid4().hex}{ext}"

    # Filesystem path on disk (persistent)
    file_path_fs = os.path.join(uploads_dir, new_filename)

    # Public URL path (what the frontend should request)
    logo_url = f"/uploads/{new_filename}"

    with open(file_path_fs, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    branding = db.query(Branding).first()
    if not branding:
        branding = Branding(app_name="BOOTS ON THE GROUND", logo_url=logo_url)
        db.add(branding)
    else:
        branding.logo_url = logo_url

    db.commit()
    db.refresh(branding)
    return branding


# -----------------------------------------------------
# Admin: Tags overview
# -----------------------------------------------------
@router.get("/tags/overview", response_model=list[dict])
def tag_overview(
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    """
    Returns a list of tagged voters for either:
      - a specific user_id, or
      - all users if user_id is not provided.

    Each item includes:
      - user info (id, email, full_name)
      - voter info (id, voter_id, first/last name, county, precinct, has_voted)
    """
    query = db.query(UserVoterTag, User, Voter).join(User, UserVoterTag.user_id == User.id).join(
        Voter, UserVoterTag.voter_id == Voter.id
    )

    if user_id is not None:
        query = query.filter(UserVoterTag.user_id == user_id)

    rows = query.all()

    results = []
    for tag, user, voter in rows:
        results.append(
            {
                "user_id": user.id,
                "user_email": user.email,
                "user_full_name": user.full_name,
                "voter_internal_id": voter.id,
                "voter_voter_id": voter.voter_id,
                "first_name": voter.first_name,
                "last_name": voter.last_name,
                "has_voted": voter.has_voted,
                "county": voter.county,
                "precinct": voter.precinct,
            }
        )

    return results


# -----------------------------------------------------
# Admin: List distinct counties from voter file
# -----------------------------------------------------
@router.get("/counties", response_model=List[str])
def list_counties(
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    rows = (
        db.query(Voter.county)
        .filter(Voter.county.isnot(None))
        .filter(func.trim(Voter.county) != "")
        .distinct()
        .order_by(Voter.county.asc())
        .all()
    )
    return [r[0] for r in rows]


# -----------------------------------------------------
# Admin: Get a specific user's allowed counties
# -----------------------------------------------------
@router.get("/users/{user_id}/county-access", response_model=List[str])
def get_user_county_access(
    user_id: int,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    rows = (
        db.query(UserCountyAccess)
        .filter(UserCountyAccess.user_id == user_id)
        .all()
    )
    return [r.county for r in rows]


# -----------------------------------------------------
# Admin: Set a specific user's allowed counties
# -----------------------------------------------------
@router.put("/users/{user_id}/county-access", response_model=List[str])
def update_user_county_access(
    user_id: int,
    payload: CountyAccessUpdate,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # Normalize + de-duplicate
    allowed: List[str] = []
    for c in payload.allowed_counties:
        if c is None:
            continue
        c_norm = c.strip()
        if not c_norm:
            continue
        if c_norm not in allowed:
            allowed.append(c_norm)

    # Wipe old rows
    db.query(UserCountyAccess).filter(UserCountyAccess.user_id == user_id).delete()

    # Insert new ones
    for c in allowed:
        db.add(UserCountyAccess(user_id=user_id, county=c))

    db.commit()
    return allowed


# -----------------------------------------------------
# Admin: Get Branding
# -----------------------------------------------------
@router.get("/branding", response_model=BrandingOut)
def get_branding(
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    branding = db.query(Branding).first()
    if not branding:
        return BrandingOut(logo_url=None, app_name="BOOTS ON THE GROUND")

    return branding

@router.get("/tags/overview", response_model=list[TagOverviewItem])
def admin_tag_overview(
    user_id: Optional[int] = Query(default=None),
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    q = (
        db.query(UserVoterTag, User, Voter)
        .join(User, User.id == UserVoterTag.user_id)
        .join(Voter, Voter.id == UserVoterTag.voter_id)
    )

    if user_id is not None:
        q = q.filter(User.id == user_id)

    rows = q.order_by(User.email.asc(), Voter.last_name.asc(), Voter.first_name.asc()).all()

    return [
        TagOverviewItem(
            user_id=u.id,
            user_email=u.email,
            user_full_name=u.full_name,
            voter_internal_id=v.id,
            voter_voter_id=v.voter_id,
            first_name=v.first_name,
            last_name=v.last_name,
            has_voted=v.has_voted,
            county=v.county,
            precinct=v.precinct,
        )
        for (uvt, u, v) in rows
    ]