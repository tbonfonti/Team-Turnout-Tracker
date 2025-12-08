# backend/app/routers/voter_routes.py

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.deps import get_current_user
from app.models import Voter
from app.schemas import VoterSearchResponse

router = APIRouter(prefix="/voters", tags=["Voters"])


@router.get("/", response_model=VoterSearchResponse)
def search_voters(
    q: Optional[str] = Query(
        None,
        description="Free-text search term. Used with ILIKE on one or more fields.",
    ),
    field: Optional[str] = Query(
        "all",
        description=(
            "Which field to search by. "
            "Allowed: all, first_name, last_name, address, city, state, "
            "zip_code, registered_party, phone, email, voter_id, county."
        ),
    ),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=50),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Search voters.

    - If `field` is "all" or omitted, we do a broad multi-field search.
    - If `field` is a specific column (e.g. 'last_name', 'city', 'voter_id'),
      we restrict the search to that column only.

    Uses ILIKE so the trigram indexes on the underlying columns can be used
    (no wrapping in lower(...)).
    """

    # Normalize page_size to one of the allowed buckets for consistency
    if page_size not in (10, 25, 50):
        if page_size < 10:
            page_size = 10
        elif page_size < 25:
            page_size = 25
        else:
            page_size = 50

    base_query = db.query(Voter)

    if q:
        q = q.strip()
        if q:
            like_pattern = f"%{q}%"

            # Map of allowed field names to columns
            field_map = {
                "first_name": Voter.first_name,
                "last_name": Voter.last_name,
                "address": Voter.address,
                "city": Voter.city,
                "state": Voter.state,
                "zip_code": Voter.zip_code,
                "registered_party": Voter.registered_party,
                "phone": Voter.phone,
                "email": Voter.email,
                "voter_id": Voter.voter_id,
                "county": Voter.county,
            }

            normalized_field = (field or "all").strip().lower()

            if normalized_field != "all" and normalized_field in field_map:
                # Targeted search on a single column (best for performance)
                col = field_map[normalized_field]
                base_query = base_query.filter(col.ilike(like_pattern))
            else:
                # Broad multi-field search, still using ILIKE so trigram
                # indexes on those columns can help.
                conditions = [
                    Voter.first_name.ilike(like_pattern),
                    Voter.last_name.ilike(like_pattern),
                    Voter.address.ilike(like_pattern),
                    Voter.city.ilike(like_pattern),
                    Voter.state.ilike(like_pattern),
                    Voter.zip_code.ilike(like_pattern),
                    Voter.registered_party.ilike(like_pattern),
                    Voter.email.ilike(like_pattern),
                    Voter.phone.ilike(like_pattern),
                    Voter.voter_id.ilike(like_pattern),
                    Voter.county.ilike(like_pattern),
                ]
                base_query = base_query.filter(or_(*conditions))

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
