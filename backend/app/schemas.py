from pydantic import BaseModel, EmailStr
from typing import Optional, List


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str
    is_admin: bool = False


class UserOut(UserBase):
    id: int
    is_admin: bool

    class Config:
        orm_mode = True  # Pydantic v1-style; compatible via from_attributes in v2


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class InviteUserRequest(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    password: str
    is_admin: bool = False


class VoterBase(BaseModel):
    voter_id: str
    first_name: str
    last_name: str
    address: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None


class VoterOut(VoterBase):
    id: int
    has_voted: bool

    class Config:
        orm_mode = True


class VoterSearchResponse(BaseModel):
    voters: List[VoterOut]


class BrandingOut(BaseModel):
    app_name: str
    logo_url: Optional[str] = None

    class Config:
        orm_mode = True
