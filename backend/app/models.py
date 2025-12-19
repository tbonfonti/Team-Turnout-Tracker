# backend/app/models.py

from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import TSVECTOR

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=True)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)

    tags = relationship("UserVoterTag", back_populates="user", cascade="all, delete-orphan")
    county_access = relationship("UserCountyAccess", back_populates="user", cascade="all, delete-orphan")


class Voter(Base):
    __tablename__ = "voters"

    id = Column(Integer, primary_key=True, index=True)

    voter_id = Column(String, unique=True, index=True, nullable=False)

    first_name = Column(String, index=True, nullable=False)
    last_name = Column(String, index=True, nullable=False)

    address = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    zip_code = Column(String, nullable=True)

    registered_party = Column(String, nullable=True)

    county = Column(String, nullable=True)
    precinct = Column(String, nullable=True)

    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)

    has_voted = Column(Boolean, default=False)
    note = Column(String, nullable=True)

    # Optional: only used if you created it in Postgres as a generated column
    # If the DB column exists, defining it here allows SQLAlchemy to query it.
    search_tsv = Column(TSVECTOR, nullable=True)

    tags = relationship("UserVoterTag", back_populates="voter", cascade="all, delete-orphan")


class UserVoterTag(Base):
    __tablename__ = "user_voter_tags"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    voter_id = Column(Integer, ForeignKey("voters.id"), nullable=False)

    user = relationship("User", back_populates="tags")
    voter = relationship("Voter", back_populates="tags")

    __table_args__ = (UniqueConstraint("user_id", "voter_id", name="uq_user_voter_tag"),)


class UserCountyAccess(Base):
    __tablename__ = "user_county_access"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    county = Column(String, nullable=False)

    user = relationship("User", back_populates="county_access")

    __table_args__ = (UniqueConstraint("user_id", "county", name="uq_user_county_access"),)


class Branding(Base):
    __tablename__ = "branding"

    id = Column(Integer, primary_key=True, index=True)
    app_name = Column(String, default="Boots on the Ground")
    logo_url = Column(String, nullable=True)
