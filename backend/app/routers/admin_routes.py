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
        name = row.get("name") or f"{row.get('first_name', '').strip()} {row.get('last_name', '').strip()}".strip()
        if not name:
            continue
        address = row.get("address", None)
        phone = row.get("phone", None)
        email = row.get("email", None)

        voter = db.query(Voter).filter(Voter.voter_id == voter_id).first()
        if voter:
            voter.name = name
            voter.address = address
            voter.phone = phone
            voter.email = email
        else:
            voter = Voter(
                voter_id=voter_id,
                name=name,
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
    # Expect a CSV with a column "voterID" or a simple list
    reader = csv.reader(io.StringIO(text))
    header = next(reader, None)
    voter_ids: List[str] = []

    if header and ("voterID" in header or "voter_id" in header):
        idx = header.index("voterID") if "voterID" in header else header.index("voter_id")
        for row in reader:
            if len(row) > idx:
                voter_ids.append(row[idx])
    else:
        # first line was a voter id
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
def delete_all_voters(db: Session = Depends(get_db), admin=Depends(get_current_admin)):
    deleted = db.query(Voter).delete()
    db.commit()
    return {"deleted": deleted}


@router.post("/users/invite", response_model=UserOut)
def invite_user(payload: InviteUserRequest, db: Session = Depends(get_db), admin=Depends(get_current_admin)):
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

    # NOTE: In a real app, email the temp_password.
    # Here we return it so the admin can share it securely.
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
        branding = Branding(app_name="Team Turnout Tracking", logo_url=f"/static/{filename}")
        db.add(branding)
    else:
        branding.logo_url = f"/static/{filename}"
    db.commit()
    db.refresh(branding)
    return branding
