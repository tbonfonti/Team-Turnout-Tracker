from fastapi import APIRouter, Depends, HTTPException, Response
from sqlalchemy.orm import Session
from typing import List
import csv
import io

from ..database import get_db
from ..deps import get_current_user
from ..models import Voter, UserVoterTag
from ..schemas import VoterOut

router = APIRouter(prefix="/tags", tags=["tags"])


@router.post("/{voter_id}")
def tag_voter(voter_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    voter = db.query(Voter).filter(Voter.id == voter_id).first()
    if not voter:
        raise HTTPException(status_code=404, detail="Voter not found")

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


@router.delete("/{voter_id}")
def untag_voter(voter_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
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


@router.get("/dashboard", response_model=List[VoterOut])
def get_dashboard(db: Session = Depends(get_db), user=Depends(get_current_user)):
    tags = (
        db.query(UserVoterTag)
        .filter(UserVoterTag.user_id == user.id)
        .all()
    )
    voter_ids = [t.voter_id for t in tags]
    if not voter_ids:
        return []
    voters = db.query(Voter).filter(Voter.id.in_(voter_ids)).all()
    return voters


@router.get("/dashboard/export-call-list")
def export_call_list(db: Session = Depends(get_db), user=Depends(get_current_user)):
    tags = (
        db.query(UserVoterTag)
        .join(Voter, UserVoterTag.voter_id == Voter.id)
        .filter(UserVoterTag.user_id == user.id, Voter.has_voted == False)
        .all()
    )

    voter_ids = [t.voter_id for t in tags]
    voters = db.query(Voter).filter(Voter.id.in_(voter_ids)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["voter_id", "first_name", "last_name", "address", "phone", "email"])
    for v in voters:
        writer.writerow([v.voter_id, v.first_name, v.last_name, v.address or "", v.phone or "", v.email or ""])

    resp = Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": 'attachment; filename="call_list.csv"'},
    )
    return resp
