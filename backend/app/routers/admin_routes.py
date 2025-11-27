import csv
import io
import os
import secrets
from typing import List

from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_admin
from ..models import Voter, User, Branding
from ..schemas import InviteUserRequest, UserOut, BrandingOut
from ..auth import get_password_hash

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
        phone = row.get("phone") or row.get("Phone") or None
        email = row.get("email") or row.get("Email") or None

        voter = db.query(Voter).filter(Voter.voter_id == voter_id).first()
        if voter:
            voter.first_name = first_name
            voter.last_name = last_name
            voter.address = address
            voter.phone = phone
            voter.email = email
        else:
            voter = Voter(
                voter_id=voter_id,
                first_name=first_name or "",
                last_name=last_name or "",
                address=address,
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
    deleted = db.query(Voter).delete()
    db.commit()
    return {"deleted": deleted}


@router.post("/users/invite", response_model=UserOut)
def invite_user(
    payload: InviteUserRequest,
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    temp_password = secrets.token_urlsafe(8)
    user = User(
        email=payload.email,
        full_name=payload.full_name,
        hashed_password=get_password_hash(temp_password),
        is_admin=False,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    # Attach temp password in response (not stored as plain text)
    user.temp_password = temp_password  # type: ignore[attr-defined]
    return user


@router.post("/branding/logo", response_model=BrandingOut)
async def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    uploads_dir = "uploads"
    os.makedirs(uploads_dir, exist_ok=True)
    file_ext = os.path.splitext(file.filename)[1]
    filename = f"logo_{secrets.token_hex(8)}{file_ext}"
    filepath = os.path.join(uploads_dir, filename)

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
