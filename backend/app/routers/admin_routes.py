# backend/app/routers/admin_routes.py

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import User, Voter, UserVoterTag, Branding
from app.schemas import BrandingResponse
from app.auth import get_current_admin
from sqlalchemy import func
import os
import uuid

router = APIRouter(prefix="/admin", tags=["Admin"])

STATIC_DIR = "static"
os.makedirs(STATIC_DIR, exist_ok=True)


# -----------------------------------------------------
#  Admin: List Users
# -----------------------------------------------------
@router.get("/users")
def list_users(db: Session = Depends(get_db), current_admin=Depends(get_current_admin)):
    users = db.query(User).order_by(User.first_name, User.last_name).all()

    return [
        {
            "id": u.id,
            "first_name": u.first_name,
            "last_name": u.last_name,
            "email": u.email,
            "is_admin": u.is_admin
        }
        for u in users
    ]


# -----------------------------------------------------
# Admin: Tag Overview (with optional filtering)
# -----------------------------------------------------
@router.get("/tags-overview")
def get_tag_overview(
    user_id: int | None = None,
    db: Session = Depends(get_db),
    current_admin=Depends(get_current_admin)
):
    query = (
        db.query(
            User.id,
            User.first_name,
            User.last_name,
            func.count(UserVoterTag.voter_id).label("tag_count")
        )
        .join(UserVoterTag, User.id == UserVoterTag.user_id, isouter=True)
        .group_by(User.id)
    )

    if user_id:
        query = query.filter(User.id == user_id)

    results = query.all()

    return [
        {
            "user_id": r.id,
            "first_name": r.first_name,
            "last_name": r.last_name,
            "tag_count": r.tag_count,
        }
        for r in results
    ]


# -----------------------------------------------------
# Admin: Upload Branding Logo
# -----------------------------------------------------
@router.post("/branding/logo", response_model=BrandingResponse)
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

    with open(filepath, "wb") as f:
        f.write(await file.read())

    branding = db.query(Branding).first()
    if not branding:
        branding = Branding()
        db.add(branding)

    branding.logo_url = f"/static/{filename}"
    db.commit()
    db.refresh(branding)

    return branding


# -----------------------------------------------------
# Get Branding (logo, app name, colors)
# -----------------------------------------------------
@router.get("/branding", response_model=BrandingResponse)
def get_branding(db: Session = Depends(get_db)):
    branding = db.query(Branding).first()
    if not branding:
        return BrandingResponse(logo_url=None, app_name="Team Turnout Tracker")

    return branding
