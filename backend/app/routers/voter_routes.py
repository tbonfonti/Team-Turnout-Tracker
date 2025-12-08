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
    field: Optional[str] = Query(None, description="Which field to search by"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=50),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Search voters.

    If `field` is provided, only that column is searched (case-insensitive).
    Otherwise, a broad multi-field search is performed.
    """
    if page_size not in (10, 25, 50):
        if page_size < 10:
            page_size = 10
        elif page_size < 25:
            page_size = 25
        else:
            page_size = 50

    base_query = db.query(Voter)

    if q:
        q_like = f"%{q}%"

        field_map = {
            "first_name": Voter.first_name,
            "last_name": Voter.last_name,
            "address": Voter.address,
            "city": Voter.city,
            "state": Voter.state,
            "zip_code": Voter.zip_code,
            "county": Voter.county,
            "registered_party": Voter.registered_party,
            "phone": Voter.phone,
            "email": Voter.email,
            "voter_id": Voter.voter_id,
        }

        if field:
            key = field.strip().lower()
            column = field_map.get(key)
            if column is not None:
                base_query = base_query.filter(column.ilike(q_like))
            else:
                base_query = base_query.filter(
                    (Voter.first_name.ilike(q_like))
                    | (Voter.last_name.ilike(q_like))
                    | (Voter.address.ilike(q_like))
                    | (Voter.city.ilike(q_like))
                    | (Voter.state.ilike(q_like))
                    | (Voter.zip_code.ilike(q_like))
                    | (Voter.county.ilike(q_like))
                    | (Voter.registered_party.ilike(q_like))
                    | (Voter.email.ilike(q_like))
                    | (Voter.phone.ilike(q_like))
                    | (Voter.voter_id.ilike(q_like))
                )
        else:
            base_query = base_query.filter(
                (Voter.first_name.ilike(q_like))
                | (Voter.last_name.ilike(q_like))
                | (Voter.address.ilike(q_like))
                | (Voter.city.ilike(q_like))
                | (Voter.state.ilike(q_like))
                | (Voter.zip_code.ilike(q_like))
                | (Voter.county.ilike(q_like))
                | (Voter.registered_party.ilike(q_like))
                | (Voter.email.ilike(q_like))
                | (Voter.phone.ilike(q_like))
                | (Voter.voter_id.ilike(q_like))
            )

    total = base_query.count()

    voters = (
        base_query.order_by(Voter.last_name.asc(), Voter.first_name.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return {
        "voters": voters,
        "total": total,
        "page": page,
        "page_size": page_size,
    }
