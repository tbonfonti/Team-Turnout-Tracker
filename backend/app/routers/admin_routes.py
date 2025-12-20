# backend/app/routers/admin_routes.py

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
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
from app.schemas import BrandingOut, InviteUserRequest, UserOut, CountyAccessUpdate
from app.deps import get_current_admin
from app.paths import UPLOADS_DIR

router = APIRouter(prefix="/admin", tags=["Admin"])


# -----------------------------------------------------
# Helper: ensure uploads directory exists
# -----------------------------------------------------
def ensure_uploads_dir():
    """Return the uploads directory used for branding/logo uploads.

    This is centralized in app.paths and can be overridden by the UPLOADS_DIR
    environment variable (recommended for Render Disk deployments).
    """
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
        is_admin=payload.is_admin or False,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


# -----------------------------------------------------
# Admin: Update county access for a user
# -----------------------------------------------------
@router.post("/users/{user_id}/county-access", response_model=list[str])
def update_user_county_access(
    user_id: int,
    payload: CountyAccessUpdate,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    # Clear existing
    db.query(UserCountyAccess).filter(UserCountyAccess.user_id == user_id).delete()

    # Add new
    for county in payload.counties:
        db.add(UserCountyAccess(user_id=user_id, county=county))

    db.commit()
    return payload.counties


# -----------------------------------------------------
# Admin: Get all counties present in the voter DB
# -----------------------------------------------------
@router.get("/counties", response_model=list[str])
def list_counties(
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    counties = (
        db.query(Voter.county)
        .filter(Voter.county.isnot(None))
        .group_by(Voter.county)
        .order_by(func.lower(Voter.county))
        .all()
    )
    return [c[0] for c in counties if c[0]]


# -----------------------------------------------------
# Admin: Upload voters CSV (bulk load)
# -----------------------------------------------------
@router.post("/voters/upload")
def upload_voters_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    # Read CSV into memory
    content = file.file.read().decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(content))

    created = 0
    updated = 0

    for row in reader:
        voter_id = row.get("voter_id") or row.get("VoterID") or row.get("VOTER_ID")
        if not voter_id:
            continue

        voter = db.query(Voter).filter(Voter.voter_id == voter_id).first()

        # Map fields safely
        def get_field(*names):
            for n in names:
                if n in row and row[n] is not None:
                    return row[n]
            return None

        first_name = get_field("first_name", "FirstName", "FIRST_NAME")
        last_name = get_field("last_name", "LastName", "LAST_NAME")
        county = get_field("county", "County", "COUNTY")
        precinct = get_field("precinct", "Precinct", "PRECINCT")
        has_voted_val = get_field("has_voted", "HasVoted", "HAS_VOTED")

        # Normalize has_voted
        has_voted = False
        if isinstance(has_voted_val, str):
            has_voted = has_voted_val.strip().lower() in ("1", "true", "yes", "y")
        elif has_voted_val is not None:
            try:
                has_voted = bool(int(has_voted_val))
            except Exception:
                has_voted = False

        if voter:
            # Update existing
            voter.first_name = first_name or voter.first_name
            voter.last_name = last_name or voter.last_name
            voter.county = county or voter.county
            voter.precinct = precinct or voter.precinct
            voter.has_voted = has_voted if has_voted_val is not None else voter.has_voted
            updated += 1
        else:
            # Create new
            voter = Voter(
                voter_id=voter_id,
                first_name=first_name,
                last_name=last_name,
                county=county,
                precinct=precinct,
                has_voted=has_voted,
            )
            db.add(voter)
            created += 1

    db.commit()
    return {"status": "ok", "created": created, "updated": updated}


# -----------------------------------------------------
# Admin: Upload voted CSV (mark has_voted = True)
# -----------------------------------------------------
@router.post("/voters/upload-voted")
def upload_voted_csv(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
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

    # Generate a new unique filename
    new_filename = f"logo_{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(uploads_dir, new_filename)

    # Save file
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Update or create branding record
    # IMPORTANT: Store a *URL path*, not a filesystem path.
    # The backend serves UPLOADS_DIR at /uploads via StaticFiles.
    public_logo_url = f"/uploads/{new_filename}"

    branding = db.query(Branding).first()
    if not branding:
        branding = Branding(app_name="BOOTS ON THE GROUND", logo_url=public_logo_url)
        db.add(branding)
    else:
        branding.logo_url = public_logo_url

    db.commit()
    db.refresh(branding)
    return branding


# -----------------------------------------------------
# Admin: Get branding (app name + logo url)
# -----------------------------------------------------
@router.get("/branding", response_model=BrandingOut)
def get_branding_admin(
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    branding = db.query(Branding).first()
    if not branding:
        return BrandingOut(logo_url=None, app_name="BOOTS ON THE GROUND")
    return branding


# -----------------------------------------------------
# Admin: Update app name
# -----------------------------------------------------
@router.post("/branding", response_model=BrandingOut)
def update_branding_admin(
    payload: BrandingOut,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    branding = db.query(Branding).first()
    if not branding:
        branding = Branding(app_name=payload.app_name or "BOOTS ON THE GROUND", logo_url=payload.logo_url)
        db.add(branding)
    else:
        if payload.app_name is not None:
            branding.app_name = payload.app_name
        if payload.logo_url is not None:
            branding.logo_url = payload.logo_url

    db.commit()
    db.refresh(branding)
    return branding
