from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)

    tags = relationship("UserVoterTag", back_populates="user")

    # Per-user allowed counties for voter visibility
    county_access = relationship(
        "UserCountyAccess",
        back_populates="user",
        cascade="all, delete-orphan",
    )


class Voter(Base):
    __tablename__ = "voters"

    id = Column(Integer, primary_key=True, index=True)
    voter_id = Column(String, unique=True, index=True, nullable=False)

    # Basic name + address
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    zip_code = Column(String, nullable=True)

    # Extra fields for voter data
    county = Column(String, nullable=True)
    precinct = Column(String, nullable=True)
    registered_party = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)

    # Whether this voter has voted (from imported "voted" file)
    has_voted = Column(Boolean, default=False)

    # Freeform notes (editable in tags dashboard)
    note = Column(String, nullable=True)

    tags = relationship("UserVoterTag", back_populates="voter")


class UserVoterTag(Base):
    __tablename__ = "user_voter_tags"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    voter_id = Column(Integer, ForeignKey("voters.id"), nullable=False)

    user = relationship("User", back_populates="tags")
    voter = relationship("Voter", back_populates="tags")


class UserCountyAccess(Base):
    __tablename__ = "user_county_access"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    county = Column(String, nullable=False)

    user = relationship("User", back_populates="county_access")

    __table_args__ = (
        UniqueConstraint("user_id", "county", name="uq_user_county_access"),
    )


class Branding(Base):
    __tablename__ = "branding"

    id = Column(Integer, primary_key=True, index=True)
    app_name = Column(String, default="BOOTS ON THE GROUND")
    logo_url = Column(String, nullable=True)
