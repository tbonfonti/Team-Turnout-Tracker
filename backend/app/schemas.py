# backend/app/schemas.py

from pydantic import BaseModel, EmailStr
from typing import Optional, List


class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class UserBase(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None


class UserCreate(UserBase):
    password: str
    is_admin: bool = False


class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str]
    is_admin: bool

    class Config:
        orm_mode = True


class UserMe(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str]
    is_admin: bool

    class Config:
        orm_mode = True


class InviteUserRequest(BaseModel):
    email: EmailStr
    full_name: Optional[str] = None
    password: str
    is_admin: bool = False
    allowed_counties: List[str] = []


class VoterBase(BaseModel):
    voter_id: str
    first_name: str
    last_name: str
    address: Optional[str] = None


class VoterCreate(VoterBase):
    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    county: Optional[str] = None
    precinct: Optional[str] = None
    registered_party: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    has_voted: bool = False
    note: Optional[str] = None


class VoterOut(BaseModel):
    id: int
    voter_id: str
    first_name: str
    last_name: str
    address: Optional[str]
    city: Optional[str]
    state: Optional[str]
    zip_code: Optional[str]
    county: Optional[str]
    precinct: Optional[str]
    registered_party: Optional[str]
    phone: Optional[str]
    email: Optional[str]
    has_voted: bool
    note: Optional[str]

    class Config:
        orm_mode = True


class VoterSearchResponse(BaseModel):
    voters: List[VoterOut]
    total: Optional[int] = None
    has_more: bool
    page: int
    page_size: int


class BrandingOut(BaseModel):
    app_name: str
    logo_url: Optional[str] = None

    class Config:
        orm_mode = True


class TagOverviewItem(BaseModel):
    user_id: int
    user_email: EmailStr
    user_full_name: Optional[str]
    voter_internal_id: int
    voter_voter_id: str
    first_name: str
    last_name: str
    has_voted: bool
    county: Optional[str] = None
    precinct: Optional[str] = None


class CountyAccessUpdate(BaseModel):
    allowed_counties: List[str] = []
