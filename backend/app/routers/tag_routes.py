from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List, Optional
import csv
import io

from pydantic import BaseModel

from ..database import get_db
from ..deps import get_current_user
from ..models import Voter, UserVoterTag, UserCountyAccess

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

    # Non-admin users cannot tag voters outside their allowed counties
    if not user.is_admin:
        allowed_rows = (
            db.query(UserCountyAccess.county)
            .filter(UserCountyAccess.user_id == user.id)
            .all()
        )
        allowed_counties = [r[0] for r in allowed_rows if r[0] is not None]

        if allowed_counties:
            if voter.county not in allowed_counties:
                raise HTTPException(
                    status_code=403,
                    detail="You are not allowed to tag voters in this county.",
                )
        else:
            raise HTTPException(
                status_code=403,
                detail="You have not been granted access to any counties.",
            )

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

    if user.is_admin:
        # Admins see all tagged voters
        voters = db.query(Voter).filter(Voter.id.in_(voter_ids)).all()
    else:
        # Restrict tagged voters to allowed counties
        allowed_rows = (
            db.query(UserCountyAccess.county)
            .filter(UserCountyAccess.user_id == user.id)
            .all()
        )
        allowed_counties = [r[0] for r in allowed_rows if r[0] is not None]

        if not allowed_counties:
            return []

        voters = (
            db.query(Voter)
            .filter(
                Voter.id.in_(voter_ids),
                Voter.county.in_(allowed_counties),
            )
            .all()
        )

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
                "county": v.county,
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
# Export tagged voters as CSV
# GET /tags/export
# --------------------------------------------------------------------
@router.get("/export")
def export_tags(
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
        # Return an empty CSV
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


# --------------------------------------------------------------------
# Update contact info & note for a tagged voter
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
        raise HTTPException(status_code=403, detail="You do not have this voter tagged")

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
    return {"status": "updated"}
