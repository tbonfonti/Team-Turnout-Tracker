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


class Voter(Base):
    __tablename__ = "voters"

    id = Column(Integer, primary_key=True, index=True)
    voter_id = Column(String, unique=True, index=True, nullable=False)
    first_name = Column(String, index=True, nullable=False)
    last_name = Column(String, index=True, nullable=False)
    address = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    email = Column(String, nullable=True)
    has_voted = Column(Boolean, default=False)

    tags = relationship("UserVoterTag", back_populates="voter")


class UserVoterTag(Base):
    __tablename__ = "user_voter_tags"
    __table_args__ = (UniqueConstraint("user_id", "voter_id", name="uix_user_voter"),)

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    voter_id = Column(Integer, ForeignKey("voters.id"), nullable=False)

    user = relationship("User", back_populates="tags")
    voter = relationship("Voter", back_populates="tags")


class Branding(Base):
    __tablename__ = "branding"

    id = Column(Integer, primary_key=True, index=True)
    app_name = Column(String, default="Team Turnout Tracking")
    logo_url = Column(String, nullable=True)
