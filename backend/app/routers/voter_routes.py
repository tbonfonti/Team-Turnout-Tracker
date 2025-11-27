from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..deps import get_current_user
from ..models import Voter
from ..schemas import VoterSearchResponse

router = APIRouter(prefix="/voters", tags=["voters"])


@router.get("/", response_model=VoterSearchResponse)
def search_voters(
    q: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    query = db.query(Voter)
    if q:
        q_like = f"%{q}%"
        query = query.filter(
            (Voter.first_name.ilike(q_like))
            | (Voter.last_name.ilike(q_like))
            | (Voter.address.ilike(q_like))
            | (Voter.email.ilike(q_like))
            | (Voter.phone.ilike(q_like))
            | (Voter.voter_id.ilike(q_like))
        )
    voters = query.order_by(Voter.last_name.asc(), Voter.first_name.asc()).limit(500).all()
    return {"voters": voters}
