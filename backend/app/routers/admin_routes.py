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

router = APIRouter(prefix="/admin", tags=["Admin"])

# Directory where logos are stored
STATIC_DIR = "static"
os.makedirs(STATIC_DIR, exist_ok=True)


# -----------------------------------------------------
# Admin: List Users
# -----------------------------------------------------
@router.get("/users")
def list_users(
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    Return a simple list of users for the admin filter dropdown.
    Uses User.full_name (since User does not have first_name/last_name).
    """
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
# Admin: Create User (direct, no email invite)
#   POST /admin/users/create
# -----------------------------------------------------
@router.post("/users/create", response_model=UserOut)
def create_user(
    payload: InviteUserRequest,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    Create a new user directly (admin-only), with a password and optional admin flag.
    This is what the frontend's Admin Panel "Create User" form calls.
    """
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
# Admin: Tag Overview (with optional filtering by user)
#   GET /admin/tags/overview
# -----------------------------------------------------
@router.get("/tags/overview")
def admin_tag_overview(
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    """
    Admin view of all tags, optionally filtered by user_id.
    Returns one row per (user, voter) tag.
    """
    # Base query joining users, tags, and voters
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

    # Optional filter by user_id
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
# Admin: Import voters (full list)
#   POST /admin/voters/import
#   Expects a CSV file. For each row:
#     - if voter_id exists, update the voter fields
#     - else, create a new Voter row
# -----------------------------------------------------
@router.post("/voters/import")
async def import_voters(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin: User = Depends(get_current_admin),
):
    # Read file content
    content = await file.read()
    text = content.decode("utf-8", errors="ignore")
    reader = csv.DictReader(io.StringIO(text))

    created = 0
    updated = 0

    for row in reader:
        voter_id = (
            row.get("voter_id")
            or row.get("VOTER_ID")
            or row.get("VoterID")
            or row.get("VOTERID")
        )
        if not voter_id:
            continue

        voter = db.query(Voter).filter(Voter.voter_id == voter_id).first()
        if voter is None:
            voter = Voter(voter_id=voter_id)
            db.add(voter)
            created += 1
        else:
            updated += 1

        # Optional fields
        voter.first_name = row.get("first_name") or row.get("FIRST_NAME") or voter.first_name
        voter.last_name = row.get("last_name") or row.get("LAST_NAME") or voter.last_name
        voter.address = row.get("address") or row.get("ADDRESS") or voter.address
        voter.city = row.get("city") or row.get("CITY") or voter.city
        voter.state = row.get("state") or row.get("STATE") or voter.state
        voter.zip_code = row.get("zip_code") or row.get("ZIP_CODE") or voter.zip_code
        voter.registered_party = (
            row.get("registered_party")
            or row.get("REGISTERED_PARTY")
            or voter.registered_party
        )
        voter.phone = row.get("phone") or row.get("PHONE") or voter.phone
        voter.email = row.get("email") or row.get("EMAIL") or voter.email

    db.commit()
    return {"status": "ok", "created": created, "updated": updated}


# -----------------------------------------------------
# Admin: Import list of voters who have voted
#   POST /admin/voters/import-voted
#   Expects a CSV with at least a voter_id column.
#   Marks has_voted = True for those voters.
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

    for row in reader:
        voter_id = (
            row.get("voter_id")
            or row.get("VOTER_ID")
            or row.get("VoterID")
            or row.get("VOTERID")
        )
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
#   POST /admin/branding/logo
# -----------------------------------------------------
@router.post("/branding/logo", response_model=BrandingOut)
async def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin=Depends(get_current_admin),
):
    # Ensure folder exists
    os.makedirs(STATIC_DIR, exist_ok=True)

    ext = os.path.splitext(file.filename)[1].lower()
    filename = f"logo_{uuid.uuid4().hex}{ext}"

    filepath = os.path.join(STATIC_DIR, filename)

    with open(filepath, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # Update DB
    branding = db.query(Branding).first()
    if not branding:
        branding = Branding(logo_filename=filename)
        db.add(branding)
    else:
        branding.logo_filename = filename

    db.commit()
    db.refresh(branding)

    return {"logo_url": f"/static/{filename}"}


# -----------------------------------------------------
# Admin: Get Branding (logo, app name, colors)
#   GET /admin/branding
# -----------------------------------------------------
@router.get("/branding", response_model=BrandingOut)
def get_branding(
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    branding = db.query(Branding).first()
    if not branding:
        # sensible default if nothing is set yet
        return BrandingOut(logo_url=None, app_name="Team Turnout Tracker")

    return branding