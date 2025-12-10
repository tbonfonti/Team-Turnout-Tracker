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
        orm_mode = True


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

    city: Optional[str] = None
    state: Optional[str] = None
    zip_code: Optional[str] = None
    registered_party: Optional[str] = None

    phone: Optional[str] = None
    email: Optional[str] = None
    county: Optional[str] = None
    precinct: Optional[str] = None

class VoterOut(VoterBase):
    id: int
    has_voted: bool

    class Config:
        orm_mode = True


class VoterSearchResponse(BaseModel):
    voters: List[VoterOut]
    total: int
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