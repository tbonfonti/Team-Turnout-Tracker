import csv
import io
import os
import secrets
from typing import List, Optional

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_admin
from ..models import Voter, User, Branding, UserVoterTag
from ..schemas import InviteUserRequest, UserOut, BrandingOut, TagOverviewItem
from ..auth import get_password_hash
from ..paths import UPLOADS_DIR  # <--- shared uploads directory

router = APIRouter(prefix="/admin", tags=["admin"])


def _split_name(full_name: str):
    full_name = (full_name or "").strip()
    if not full_name:
        return "", ""
    parts = full_name.split()
    if len(parts) == 1:
        return parts[0], ""
    first = " ".join(parts[:-1])
    last = parts[-1]
    return first, last


@router.post("/voters/import")
async def import_voters(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    contents = await file.read()
    text = contents.decode("utf-8")

    reader = csv.DictReader(io.StringIO(text))
    required_fields = {"name", "voterID"}
    missing = required_fields - set(reader.fieldnames or [])
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"CSV is missing required columns: {', '.join(sorted(missing))}",
        )

    imported = 0
    for row in reader:
        name = (row.get("name") or "").strip()
        voter_id = (row.get("voterID") or "").strip()
        if not name or not voter_id:
            continue

        address = (row.get("address") or "").strip() or None
        city = (row.get("city") or "").strip() or None
        state = (row.get("state") or "").strip() or None
        zip_code = (row.get("zip_code") or "").strip() or None
        registered_party = (row.get("registered_party") or "").strip() or None
        phone = (row.get("phone") or "").strip() or None
        email = (row.get("email") or "").strip() or None

        first_name, last_name = _split_name(name)

        existing = db.query(Voter).filter(Voter.voter_id == voter_id).first()
        if existing:
            existing.first_name = first_name
            existing.last_name = last_name
            existing.address = address
            existing.city = city
            existing.state = state
            existing.zip_code = zip_code
            existing.registered_party = registered_party
            existing.phone = phone
            existing.email = email
        else:
            voter = Voter(
                voter_id=voter_id,
                first_name=first_name,
                last_name=last_name,
                address=address,
                city=city,
                state=state,
                zip_code=zip_code,
                registered_party=registered_party,
                phone=phone,
                email=email,
                has_voted=False,
            )
            db.add(voter)
            imported += 1

    db.commit()
    return {"imported": imported}


@router.post("/voters/import-voted")
async def import_voted(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    contents = await file.read()
    text = contents.decode("utf-8")

    # This import expects a single column CSV with voterID as the first column.
    reader = csv.reader(io.StringIO(text))
    voter_ids = []
    for row in reader:
        if row:
            voter_ids.append(row[0])

    updated = 0
    for vid in voter_ids:
        voter = db.query(Voter).filter(Voter.voter_id == vid).first()
        if voter and not voter.has_voted:
            voter.has_voted = True
            updated += 1

    db.commit()
    return {"updated": updated}


@router.delete("/voters/delete-all")
def delete_all_voters(
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    # Delete tags first to avoid foreign key constraint errors
    deleted_tags = db.query(UserVoterTag).delete()
    deleted_voters = db.query(Voter).delete()
    db.commit()
    return {"deleted": deleted_voters, "deleted_tags": deleted_tags}


@router.post("/users/create", response_model=UserOut)
def create_user(
    payload: InviteUserRequest,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=get_password_hash(payload.password),
        is_admin=payload.is_admin,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.get("/users", response_model=List[UserOut])
def list_users(
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """List all users (admin only)."""
    return db.query(User).order_by(User.full_name, User.email).all()


@router.post("/branding/logo", response_model=BrandingOut)
async def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    # Very basic content-type check
    if not (file.content_type or "").startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    # Ensure uploads dir exists
    os.makedirs(UPLOADS_DIR, exist_ok=True)

    # Generate a random-ish filename with original extension
    ext = os.path.splitext(file.filename or "")[1]
    if not ext:
        ext = ".png"
    filename = f"logo_{secrets.token_hex(8)}{ext}"
    filepath = os.path.join(UPLOADS_DIR, filename)

    contents = await file.read()
    with open(filepath, "wb") as f:
        f.write(contents)

    # Ensure there is exactly one Branding row (id=1)
    branding = db.query(Branding).first()
    if not branding:
        branding = Branding(app_name="Team Turnout Tracking")
        db.add(branding)
        db.flush()  # assign id

    # Store the relative URL that the frontend can hit
    branding.logo_url = f"/static/{filename}"
    db.add(branding)
    db.commit()
    db.refresh(branding)
    return branding


@router.get("/tags/overview", response_model=List[TagOverviewItem])
def tags_overview(
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """
    For admins: see which users have tagged which voters.
    Optionally filter by a specific user_id.
    """
    query = (
        db.query(UserVoterTag, User, Voter)
        .join(User, UserVoterTag.user_id == User.id)
        .join(Voter, UserVoterTag.voter_id == Voter.id)
    )

    if user_id is not None:
        query = query.filter(UserVoterTag.user_id == user_id)

    rows = query.all()

    items: List[TagOverviewItem] = []
    for tag, user, voter in rows:
        items.append(
            TagOverviewItem(
                user_id=user.id,
                user_email=user.email,
                user_full_name=user.full_name,
                voter_internal_id=voter.id,
                voter_voter_id=voter.voter_id,
                first_name=voter.first_name,
                last_name=voter.last_name,
                has_voted=voter.has_voted,
            )
        )
    return items