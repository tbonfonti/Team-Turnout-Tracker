import csv
import io
import os
import secrets
from typing import List, Optional

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException, Query
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_admin
from ..models import Voter, User, Branding, UserVoterTag
from ..schemas import InviteUserRequest, UserOut, BrandingOut, TagOverviewItem
from ..auth import get_password_hash
from ..paths import UPLOADS_DIR  # shared uploads directory

router = APIRouter(prefix="/admin", tags=["admin"])


def _split_name(full_name: str):
    """Split 'Jane Doe Smith' -> ('Jane Doe', 'Smith')."""
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
    count = 0

    for row in reader:
        voter_id = row.get("voterID") or row.get("voter_id")
        if not voter_id:
            continue

        # Prefer explicit first_name / last_name if present
        first_name = row.get("first_name") or row.get("FirstName") or ""
        last_name = row.get("last_name") or row.get("LastName") or ""

        # If no separate fields, fall back to single "name" column
        if not (first_name or last_name):
            legacy_name = row.get("name") or row.get("Name") or ""
            first_name, last_name = _split_name(legacy_name)

        # Require at least something for name
        if not first_name and not last_name:
            continue

        address = row.get("address") or row.get("Address") or None

        city = row.get("city") or row.get("City") or None
        state = row.get("state") or row.get("State") or None
        zip_code = row.get("zip") or row.get("Zip") or row.get("zip_code") or None
        registered_party = (
            row.get("registered_party")
            or row.get("RegisteredParty")
            or row.get("party")
            or row.get("Party")
            or None
        )

        phone = row.get("phone") or row.get("Phone") or None
        email = row.get("email") or row.get("Email") or None

        voter = db.query(Voter).filter(Voter.voter_id == voter_id).first()
        if voter:
            voter.first_name = first_name
            voter.last_name = last_name
            voter.address = address
            voter.city = city
            voter.state = state
            voter.zip_code = zip_code
            voter.registered_party = registered_party
            voter.phone = phone
            voter.email = email
        else:
            voter = Voter(
                voter_id=voter_id,
                first_name=first_name or "",
                last_name=last_name or "",
                address=address,
                city=city,
                state=state,
                zip_code=zip_code,
                registered_party=registered_party,
                phone=phone,
                email=email,
            )
            db.add(voter)
        count += 1

    db.commit()
    return {"imported": count}


@router.post("/voters/import-voted")
async def import_voted(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    contents = await file.read()
    text = contents.decode("utf-8")
    reader = csv.reader(io.StringIO(text))
    header = next(reader, None)
    voter_ids: List[str] = []

    # If header row has voterID / voter_id
    if header and ("voterID" in header or "voter_id" in header):
        idx = header.index("voterID") if "voterID" in header else header.index("voter_id")
        for row in reader:
            if len(row) > idx:
                voter_ids.append(row[idx])
    else:
        # Either header is a single-ID row, or there is no header
        if header and len(header) == 1:
            voter_ids.append(header[0])
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


# ---------- USERS (for admins) ----------


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
    """
    List all users (for admin dropdown filter on tag overview).
    """
    return db.query(User).order_by(User.full_name, User.email).all()


# ---------- BRANDING ----------


@router.post("/branding/logo", response_model=BrandingOut)
async def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """
    Upload a logo and store it in backend/uploads.
    The URL stored in the DB is /static/<filename>,
    which maps to that folder via the mount in main.py.
    """
    file_ext = os.path.splitext(file.filename)[1]
    filename = f"logo_{secrets.token_hex(8)}{file_ext}"
    filepath = os.path.join(UPLOADS_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(await file.read())

    branding = db.query(Branding).first()
    if not branding:
        branding = Branding(
            app_name="Team Turnout Tracking",
            logo_url=f"/static/{filename}",
        )
        db.add(branding)
    else:
        branding.logo_url = f"/static/{filename}"

    db.commit()
    db.refresh(branding)
    return branding


# ---------- TAG OVERVIEW (admin) ----------


@router.get("/tags/overview", response_model=List[TagOverviewItem])
def tags_overview(
    user_id: Optional[int] = Query(default=None, description="Filter by user ID"),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    """
    For admins: see which users have tagged which voters.
    Optional filter by user_id.
    """
    query = (
        db.query(UserVoterTag, User, Voter)
        .join(User, UserVoterTag.user_id == User.id)
        .join(Voter, UserVoterTag.voter_id == Voter.id)
    )

    if user_id is not None:
        query = query.filter(User.id == user_id)

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