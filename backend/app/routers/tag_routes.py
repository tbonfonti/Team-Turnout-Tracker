from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List, Optional
import csv
import io

from pydantic import BaseModel

from ..database import get_db
from ..deps import get_current_user
from ..models import Voter, UserVoterTag

router = APIRouter(prefix="/tags", tags=["tags"])


# --------------------------------------------------------------------
# Request model for contact + note updates
# --------------------------------------------------------------------
class VoterContactUpdate(BaseModel):
    phone: Optional[str] = None
    email: Optional[str] = None
    note: Optional[str] = None


# --------------------------------------------------------------------
# Tag a voter for the current user
# POST /tags/{voter_id}
# --------------------------------------------------------------------
@router.post("/{voter_id}")
def tag_voter(
    voter_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    voter = db.query(Voter).filter(Voter.id == voter_id).first()
    if not voter:
        raise HTTPException(status_code=404, detail="Voter not found")

    # Check if already tagged by this user
    existing = (
        db.query(UserVoterTag)
        .filter(UserVoterTag.user_id == user.id, UserVoterTag.voter_id == voter_id)
        .first()
    )
    if existing:
        return {"status": "already_tagged"}

    tag = UserVoterTag(user_id=user.id, voter_id=voter_id)
    db.add(tag)
    db.commit()
    return {"status": "tagged"}


# --------------------------------------------------------------------
# Untag a voter for the current user
# DELETE /tags/{voter_id}
# --------------------------------------------------------------------
@router.delete("/{voter_id}")
def untag_voter(
    voter_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    tag = (
        db.query(UserVoterTag)
        .filter(UserVoterTag.user_id == user.id, UserVoterTag.voter_id == voter_id)
        .first()
    )
    if not tag:
        raise HTTPException(status_code=404, detail="Tag not found")

    db.delete(tag)
    db.commit()
    return {"status": "untagged"}


# --------------------------------------------------------------------
# Get the current user's tagged voters (dashboard)
# GET /tags/dashboard
# --------------------------------------------------------------------
@router.get("/dashboard")
def get_dashboard(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    tags = (
        db.query(UserVoterTag)
        .filter(UserVoterTag.user_id == user.id)
        .all()
    )
    voter_ids = [t.voter_id for t in tags]
    if not voter_ids:
        return []

    voters = db.query(Voter).filter(Voter.id.in_(voter_ids)).all()

    # Return explicit dicts so we can include note without touching schemas.py
    out = []
    for v in voters:
        out.append(
            {
                "id": v.id,
                "voter_id": v.voter_id,
                "first_name": v.first_name,
                "last_name": v.last_name,
                "address": v.address,
                "city": v.city,
                "state": v.state,
                "zip_code": v.zip_code,
                "precinct": v.precinct,
                "registered_party": v.registered_party,
                "phone": v.phone,
                "email": v.email,
                "has_voted": v.has_voted,
                "note": v.note,
            }
        )
    return out


# --------------------------------------------------------------------
# Update contact info (phone/email/note) for a tagged voter
# PATCH /tags/{voter_id}/contact
# Only allowed if this user has that voter tagged
# --------------------------------------------------------------------
@router.patch("/{voter_id}/contact")
def update_tagged_voter_contact(
    voter_id: int,
    payload: VoterContactUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    # Ensure the current user has this voter tagged
    tag = (
        db.query(UserVoterTag)
        .filter(UserVoterTag.user_id == user.id, UserVoterTag.voter_id == voter_id)
        .first()
    )
    if not tag:
        raise HTTPException(
            status_code=404,
            detail="You do not have this voter tagged.",
        )

    voter = db.query(Voter).filter(Voter.id == voter_id).first()
    if not voter:
        raise HTTPException(status_code=404, detail="Voter not found")

    if payload.phone is not None:
        voter.phone = payload.phone
    if payload.email is not None:
        voter.email = payload.email
    if payload.note is not None:
        voter.note = payload.note

    db.commit()
    db.refresh(voter)

    return {
        "id": voter.id,
        "voter_id": voter.voter_id,
        "first_name": voter.first_name,
        "last_name": voter.last_name,
        "address": voter.address,
        "city": voter.city,
        "state": voter.state,
        "zip_code": voter.zip_code,
        "precinct": voter.precinct,
        "registered_party": voter.registered_party,
        "phone": voter.phone,
        "email": voter.email,
        "has_voted": voter.has_voted,
        "note": voter.note,
    }


# --------------------------------------------------------------------
# Export call list (for tagged voters who have NOT voted)
# GET /tags/dashboard/export-call-list
# --------------------------------------------------------------------
@router.get("/dashboard/export-call-list")
def export_call_list(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    tags = (
        db.query(UserVoterTag)
        .join(Voter, UserVoterTag.voter_id == Voter.id)
        .filter(UserVoterTag.user_id == user.id, Voter.has_voted == False)
        .all()
    )

    voter_ids = [t.voter_id for t in tags]
    if not voter_ids:
        # Empty CSV
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(
            [
                "voter_id",
                "first_name",
                "last_name",
                "address",
                "city",
                "state",
                "zip_code",
                "precinct",
                "registered_party",
                "phone",
                "email",
                "note",
            ]
        )
        resp = Response(
            content=output.getvalue(),
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="call_list.csv"'},
        )
        return resp

    voters = db.query(Voter).filter(Voter.id.in_(voter_ids)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(
        [
            "voter_id",
            "first_name",
            "last_name",
            "address",
            "city",
            "state",
            "zip_code",
            "precinct",
            "registered_party",
            "phone",
            "email",
            "note",
        ]
    )
    for v in voters:
        writer.writerow(
            [
                v.voter_id,
                v.first_name,
                v.last_name,
                v.address or "",
                v.city or "",
                v.state or "",
                v.zip_code or "",
                v.precinct or "",
                v.registered_party or "",
                v.phone or "",
                v.email or "",
                v.note or "",
            ]
        )

    resp = Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="call_list.csv"'},
    )
    return resp