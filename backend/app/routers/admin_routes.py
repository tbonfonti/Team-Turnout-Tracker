# backend/app/routers/admin_routes.py

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
import os
import uuid
from typing import Optional
from app.database import get_db
from app.models import User, Voter, UserVoterTag, Branding
from app.schemas import BrandingOut
from app.deps import get_current_admin

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
# Admin: Tag Overview (with optional filtering by user)
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
# Admin: Upload Branding Logo
#   POST /admin/branding/logo
# -----------------------------------------------------
@router.post("/branding/logo", response_model=BrandingOut)
async def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin),
):
    ext = os.path.splitext(file.filename)[1]
    if ext.lower() not in [".jpg", ".jpeg", ".png", ".gif", ".webp"]:
        raise HTTPException(status_code=400, detail="Invalid file type.")

    filename = f"logo_{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(STATIC_DIR, filename)

    # Save the uploaded file
    contents = await file.read()
    with open(filepath, "wb") as f:
        f.write(contents)

    # Upsert Branding row
    branding = db.query(Branding).first()
    if not branding:
        branding = Branding()
        db.add(branding)

    branding.logo_url = f"/static/{filename}"

    db.commit()
    db.refresh(branding)

    return branding


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