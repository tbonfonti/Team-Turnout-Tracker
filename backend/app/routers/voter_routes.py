# backend/app/routers/voter_routes.py

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from typing import Optional

from app.database import get_db
from app.deps import get_current_user
from app.models import Voter
from app.schemas import VoterSearchResponse

router = APIRouter(prefix="/voters", tags=["voters"])


@router.get("/", response_model=VoterSearchResponse)
def search_voters(
    q: Optional[str] = Query(None),
    field: Optional[str] = Query(
        None,
        description="Which field to search by (e.g. last_name, city, voter_id). Use 'all' or omit for broad search.",
    ),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=50),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    """
    Search voters.

    Performance notes:
    - For indexed fields (last_name, city, county) we use lower(...) and ILIKE,
      which allows use of the GIN trigram indexes we created.
    - For 'all' search, we still OR across multiple columns, but we do it using
      lower(...) so the same indexes can help when the query matches those fields.
    """

    # Normalize page_size
    if page_size not in (10, 25, 50):
        if page_size < 10:
            page_size = 10
        elif page_size < 25:
            page_size = 25
        else:
            page_size = 50

    base_query = db.query(Voter)

    if q:
        q_lower = q.lower()
        q_like = f"%{q_lower}%"

        # Map of allowed field names to lower(column) expressions
        field_map = {
            "first_name": func.lower(Voter.first_name),
            "last_name": func.lower(Voter.last_name),
            "address": func.lower(Voter.address),
            "city": func.lower(Voter.city),
            "state": func.lower(Voter.state),
            "zip_code": func.lower(Voter.zip_code),
            "registered_party": func.lower(Voter.registered_party),
            "phone": func.lower(Voter.phone),
            "email": func.lower(Voter.email),
            "voter_id": func.lower(Voter.voter_id),
            "county": func.lower(Voter.county),
        }

        if field and field != "all":
            key = field.strip().lower()
            column = field_map.get(key)
            if column is not None:
                base_query = base_query.filter(column.like(q_like))
            else:
                # Unknown field -> safe fallback to broad search
                base_query = base_query.filter(
                    or_(
                        func.lower(Voter.first_name).like(q_like),
                        func.lower(Voter.last_name).like(q_like),
                        func.lower(Voter.address).like(q_like),
                        func.lower(Voter.city).like(q_like),
                        func.lower(Voter.state).like(q_like),
                        func.lower(Voter.zip_code).like(q_like),
                        func.lower(Voter.registered_party).like(q_like),
                        func.lower(Voter.email).like(q_like),
                        func.lower(Voter.phone).like(q_like),
                        func.lower(Voter.voter_id).like(q_like),
                        func.lower(Voter.county).like(q_like),
                    )
                )
        else:
            # Broad "all fields" search (still using lower(...) so indexes on
            # last_name/city/county help if the query matches them)
            base_query = base_query.filter(
                or_(
                    func.lower(Voter.first_name).like(q_like),
                    func.lower(Voter.last_name).like(q_like),
                    func.lower(Voter.address).like(q_like),
                    func.lower(Voter.city).like(q_like),
                    func.lower(Voter.state).like(q_like),
                    func.lower(Voter.zip_code).like(q_like),
                    func.lower(Voter.registered_party).like(q_like),
                    func.lower(Voter.email).like(q_like),
                    func.lower(Voter.phone).like(q_like),
                    func.lower(Voter.voter_id).like(q_like),
                    func.lower(Voter.county).like(q_like),
                )
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