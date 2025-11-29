from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Optional
import os
import shutil
import uuid

from app.database import get_db
from app import models, schemas
from app.auth import get_current_admin
from app.paths import UPLOADS_DIR

router = APIRouter(
    prefix="/admin",
    tags=["admin"],
)

# This must match what you mount as /static in main.py
# main.py uses StaticFiles(directory=UPLOADS_DIR, ...),
# so we save logos into UPLOADS_DIR here.
STATIC_DIR = UPLOADS_DIR
os.makedirs(STATIC_DIR, exist_ok=True)


@router.get("/users", response_model=List[schemas.UserOut])
def list_users(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
):
    """
    Return all users, sorted by id (admins + regular users).
    """
    return db.query(models.User).order_by(models.User.id).all()


@router.get("/tags-overview")
def get_tag_overview(
    user_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
):
    """
    Admin-only endpoint to see how many voters each user has tagged.

    If user_id is provided, limit results to that user (for filtering
    in the admin UI).
    """
    query = (
        db.query(
            models.User.id.label("user_id"),
            models.User.email.label("user_email"),
            models.User.full_name.label("user_full_name"),
            func.count(models.UserVoterTag.id).label("tag_count"),
        )
        .join(models.UserVoterTag, models.User.id == models.UserVoterTag.user_id)
        .group_by(models.User.id, models.User.email, models.User.full_name)
    )

    if user_id is not None:
        query = query.filter(models.User.id == user_id)

    rows = query.all()

    return [
        {
            "user_id": row.user_id,
            "user_email": row.user_email,
            "user_full_name": row.user_full_name,
            "tag_count": row.tag_count,
        }
        for row in rows
    ]


@router.get("/branding", response_model=schemas.BrandingOut)
def get_branding(
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
):
    """
    Get current branding (app name + logo URL).
    Creates a default record if one does not exist.
    """
    branding = db.query(models.Branding).first()
    if branding is None:
        branding = models.Branding(app_name="Team Turnout Tracking")
        db.add(branding)
        db.commit()
        db.refresh(branding)
    return branding


@router.post("/branding", response_model=schemas.BrandingOut)
def update_branding(
    branding_in: schemas.BrandingOut,
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
):
    """
    Update the app name. Logo URL is controlled by the logo upload endpoint.
    """
    branding = db.query(models.Branding).first()
    if branding is None:
        branding = models.Branding(app_name=branding_in.app_name)
        db.add(branding)
    else:
        branding.app_name = branding_in.app_name

    db.commit()
    db.refresh(branding)
    return branding


@router.post("/branding/logo", response_model=schemas.BrandingOut)
async def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_admin: models.User = Depends(get_current_admin),
):
    """
    Upload a logo image, save it under STATIC_DIR (UPLOADS_DIR),
    and update branding.logo_url to /static/<filename>.
    """
    filename = file.filename or "logo"
    _, ext = os.path.splitext(filename)
    ext = ext.lower()

    allowed_exts = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
    if ext not in allowed_exts:
        raise HTTPException(status_code=400, detail="Unsupported file type.")

    unique_name = f"logo_{uuid.uuid4().hex}{ext}"
    dest_path = os.path.join(STATIC_DIR, unique_name)

    try:
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    finally:
        file.file.close()

    branding = db.query(models.Branding).first()
    if branding is None:
        branding = models.Branding(app_name="Team Turnout Tracking")
        db.add(branding)

    # This URL matches the StaticFiles mount in main.py: app.mount("/static", StaticFiles(directory=UPLOADS_DIR), name="static")
    branding.logo_url = f"/static/{unique_name}"

    db.commit()
    db.refresh(branding)
    return branding