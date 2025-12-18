from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import Branding
from ..schemas import BrandingOut

router = APIRouter(prefix="/branding", tags=["branding"])


@router.get("/", response_model=BrandingOut)
def get_branding(db: Session = Depends(get_db)):
    branding = db.query(Branding).first()
    if not branding:
        branding = Branding(app_name="BOOTS ON THE GROUND", logo_url=None)
        db.add(branding)
        db.commit()
        db.refresh(branding)
    return branding
