from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..deps import login, get_current_user
from ..schemas import LoginRequest, Token, UserCreate, UserOut
from ..database import get_db
from ..models import User
from ..auth import get_password_hash

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login_user(credentials: LoginRequest, db: Session = Depends(get_db)):
    return login(credentials, db)


# Optional: one-time endpoint to create the first admin; you can call it then disable it.
@router.post("/create-initial-admin", response_model=UserOut)
def create_initial_admin(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        return existing
    user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        hashed_password=get_password_hash(user_in.password),
        is_admin=True,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

@router.get("/me", response_model=UserOut)
def read_me(current_user=Depends(get_current_user)):
    return current_user