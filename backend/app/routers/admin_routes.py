# backend/app/routers/admin_routes.py

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
import os
import uuid
import csv
import io
import shutil
from typing import Optional

from app.database import get_db
from app.models import User, Voter, UserVoterTag, Branding
from app.schemas import BrandingOut, InviteUserRequest, UserOut
from app.deps import get_current_admin
from app.auth import get_password_hash
from app.paths import STATIC_DIR, LOGO_PATH

router = APIRouter(prefix="/admin", tags=["Admin"])


# -----------------------------------------------------
# Admin: List Users
# -----------------------------------------------------
@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    users = db.query(User).order_by(User.full_name).all()
    return [
        {
            "id": u.id,
            "full_name": u.full_name,
            "email": u.email,
        }
        for u in users
    ]


# -----------------------------------------------------
# Admin: Create User (direct)
# -----------------------------------------------------
@router.post("/users/create", response_model=UserOut)
def create_user(
    payload: InviteUserRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="A user with this email already exists.",
        )

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


# -----------------------------------------------------
# Admin: Tag Overview
# -----------------------------------------------------
@router.get("/tags/overview")
def admin_tag_overview(
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    query = (
        db.query(
            UserVoterTag.user_id.label("user_id"),
            User.full_name.label("user_full_name"),
            User.email.label("user_email"),
            Voter.id.label("voter_id"),
            Voter.voter_id.label("voter_voter_id"),
            Voter.first_name.label("voter_first_name"),
            Voter.last_name.label("voter_last_name"),
            Voter.has_voted.label("has_voted"),
        )
        .join(User, User.id == UserVoterTag.user_id)
        .join(Voter, Voter.id == UserVoterTag.voter_id)
    )

    if user_id is not None:
        query = query.filter(UserVoterTag.user_id == user_id)

    results = query.order_by(User.full_name, Voter.last_name, Voter.first_name).all()

    overview = []
    for row in results:
        overview.append(
            {
                "user_id": row.user_id,
                "user_full_name": row.user_full_name,
                "user_email": row.user_email,
                "voter_id": row.voter_id,
                "voter_voter_id": row.voter_voter_id,
                "first_name": row.voter_first_name,
                "last_name": row.voter_last_name,
                "has_voted": bool(row.has_voted),
            }
        )

    return overview


# -----------------------------------------------------
# Helper: normalize header names for CSV
# -----------------------------------------------------
def _normalize_header(name: str) -> str:
    return name.strip().lower().replace(" ", "").replace("_", "")


def _detect_voter_id_header(fieldnames):
    if not fieldnames:
        return None

    header_map = {}
    for original in fieldnames:
        norm = _normalize_header(original)
        header_map[norm] = original

    for candidate_norm in ("voterid", "voter_id", "voteridentifier"):
        if candidate_norm in header_map:
            return header_map[candidate_norm]

    candidates = []
    for original in fieldnames:
        norm = _normalize_header(original)
        if "voter" in norm and "id" in norm:
            candidates.append(original)
    if len(candidates) == 1:
        return candidates[0]

    return None


# -----------------------------------------------------
# Admin: Import voters (full list)
# -----------------------------------------------------
@router.post("/voters/import")
async def import_voters(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    content = await file.read()
    text = content.decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(text))

    created = 0
    updated = 0

    voter_id_header = _detect_voter_id_header(reader.fieldnames)

    for row in reader:
        voter_id_raw = None
        if voter_id_header:
            voter_id_raw = row.get(voter_id_header)
        else:
            voter_id_raw = (
                row.get("voter_id")
                or row.get("VOTER_ID")
                or row.get("VoterID")
                or row.get("VOTERID")
            )

        if not voter_id_raw:
            continue
        voter_id = str(voter_id_raw).strip()
        if not voter_id:
            continue

        voter = db.query(Voter).filter(Voter.voter_id == voter_id).first()
        if voter is None:
            voter = Voter(voter_id=voter_id)
            db.add(voter)
            created += 1
        else:
            updated += 1

        def get_field(*names):
            for name in names:
                if name in row and row[name]:
                    return row[name]
            for key, value in row.items():
                if key.lower() in [n.lower() for n in names] and value:
                    return value
            return None

        fn = get_field("first_name", "FIRST_NAME", "FirstName")
        ln = get_field("last_name", "LAST_NAME", "LastName")
        addr = get_field("address", "ADDRESS")
        city = get_field("city", "CITY")
        state = get_field("state", "STATE")
        zip_code = get_field("zip_code", "ZIP_CODE", "zip", "ZIP")
        county = get_field("county", "COUNTY")
        party = get_field("registered_party", "REGISTERED_PARTY", "party", "PARTY")
        phone = get_field("phone", "PHONE")
        email = get_field("email", "EMAIL")
        precinct = get_field("precinct", "PRECINCT")

        if fn is not None:
            voter.first_name = fn
        if ln is not None:
            voter.last_name = ln
        if addr is not None:
            voter.address = addr
        if city is not None:
            voter.city = city
        if state is not None:
            voter.state = state
        if zip_code is not None:
            voter.zip_code = zip_code
        if county is not None:
            voter.county = county
        if party is not None:
            voter.registered_party = party
        if phone is not None:
            voter.phone = phone
        if email is not None:
            voter.email = email
        if precinct is not None:
            voter.precinct = precinct

    db.commit()
    return {"status": "ok", "created": created, "updated": updated}


# -----------------------------------------------------
# Admin: Import voters who have voted
# -----------------------------------------------------
@router.post("/voters/import-voted")
async def import_voted(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    content = await file.read()
    text = content.decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(text))

    updated = 0
    not_found = 0

    voter_id_header = _detect_voter_id_header(reader.fieldnames)

    for row in reader:
        voter_id_raw = None
        if voter_id_header:
            voter_id_raw = row.get(voter_id_header)
        else:
            voter_id_raw = (
                row.get("voter_id")
                or row.get("VOTER_ID")
                or row.get("VoterID")
                or row.get("VOTERID")
            )

        if not voter_id_raw:
            continue

        voter_id = str(voter_id_raw).strip()
        if not voter_id:
            continue

        voter = db.query(Voter).filter(Voter.voter_id == voter_id).first()
        if voter is None:
            not_found += 1
            continue

        if not voter.has_voted:
            voter.has_voted = True
            updated += 1

    db.commit()
    return {"status": "ok", "updated": updated, "not_found": not_found}


# -----------------------------------------------------
# Admin: Upload Branding Logo
# -----------------------------------------------------
@router.post("/branding/logo", response_model=BrandingOut)
async def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    os.makedirs(STATIC_DIR, exist_ok=True)

    with open(LOGO_PATH, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    branding = db.query(Branding).first()
    if not branding:
        branding = Branding(
            app_name="BOOTS ON THE GROUND",
            logo_url="/static/logo.png",
        )
        db.add(branding)
    else:
        branding.logo_url = "/static/logo.png"

    db.commit()
    db.refresh(branding)
    return branding


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