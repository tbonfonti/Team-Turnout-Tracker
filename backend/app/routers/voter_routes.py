# backend/app/routers/voter_routes.py

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from app.database import get_db
from app.deps import get_current_user
from app.models import Voter, UserCountyAccess
from app.schemas import VoterSearchResponse

router = APIRouter(prefix="/voters", tags=["Voters"])


@router.get("/", response_model=VoterSearchResponse)
def search_voters(
    q: Optional[str] = Query(None, description="Search query (text)"),
    field: str = Query(
        "all",
        description=(
            "Which field to search by. "
            "Allowed: all, first_name, last_name, address, city, state, "
            "zip_code, registered_party, phone, email, voter_id, county, precinct."
        ),
    ),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=50),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    # Normalize page_size to one of the allowed buckets for consistency
    if page_size not in (10, 25, 50):
        if page_size < 10:
            page_size = 10
        elif page_size < 25:
            page_size = 25
        else:
            page_size = 50

    base_query = db.query(Voter)

    # ---------------------------
    # County permissions
    # ---------------------------
    if not getattr(user, "is_admin", False):
        allowed_counties = [
            r[0]
            for r in db.query(UserCountyAccess.county)
            .filter(UserCountyAccess.user_id == user.id)
            .all()
        ]

        # If user has no counties assigned, they can see no voters
        if not allowed_counties:
            return {
                "voters": [],
                "total": 0,
                "has_more": False,
                "page": page,
                "page_size": page_size,
            }

        base_query = base_query.filter(Voter.county.in_(allowed_counties))

    # ---------------------------
    # Search logic
    # ---------------------------
    normalized_field = (field or "all").strip().lower()

    if q:
        q = q.strip()
    else:
        q = ""

    terms = [t for t in q.split() if t]

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
        "precinct": Voter.precinct,
    }

    if terms:
        # Specific column search
        if normalized_field != "all" and normalized_field in field_map:
            col = field_map[normalized_field]
            conditions = [col.ilike(f"%{term}%") for term in terms]
            base_query = base_query.filter(and_(*conditions))
            base_query = base_query.order_by(Voter.last_name.asc(), Voter.first_name.asc())

        else:
            # ---------------------------
            # NEW: smarter "all" search
            # ---------------------------

            # 1) If query looks like a name (exactly 2 terms), search first/last only.
            # Use PREFIX matching first to reduce noise and improve speed.
            if len(terms) == 2:
                t1, t2 = terms[0], terms[1]

                base_query = base_query.filter(
                    or_(
                        and_(
                            func.lower(Voter.first_name).like(func.lower(f"{t1}%")),
                            func.lower(Voter.last_name).like(func.lower(f"{t2}%")),
                        ),
                        and_(
                            func.lower(Voter.first_name).like(func.lower(f"{t2}%")),
                            func.lower(Voter.last_name).like(func.lower(f"{t1}%")),
                        ),
                    )
                )
                base_query = base_query.order_by(Voter.last_name.asc(), Voter.first_name.asc())

            else:
                # 2) Otherwise: Postgres FTS on search_tsv (ranked)
                # NOTE: requires `search_tsv` column in DB + GIN index
                qtext = " ".join(terms)
                tsq = func.plainto_tsquery("simple", func.lower(qtext))

                base_query = base_query.filter(Voter.search_tsv.op("@@")(tsq))
                base_query = base_query.order_by(func.ts_rank(Voter.search_tsv, tsq).desc())

    else:
        # No query: browsing list (fast sort)
        base_query = base_query.order_by(Voter.last_name.asc(), Voter.first_name.asc())

    # ---------------------------
    # Pagination WITHOUT COUNT(*)
    # ---------------------------
    offset = (page - 1) * page_size

    # Fetch one extra row so we can compute has_more
    rows = base_query.offset(offset).limit(page_size + 1).all()
    has_more = len(rows) > page_size
    voters = rows[:page_size]

    # Only compute total when browsing (q empty)
    total = None
    if not terms:
        total = db.query(func.count(Voter.id)).select_from(Voter).scalar()
        # If non-admin, total should reflect county restriction
        if not getattr(user, "is_admin", False):
            allowed_counties = [
                r[0]
                for r in db.query(UserCountyAccess.county)
                .filter(UserCountyAccess.user_id == user.id)
                .all()
            ]
            if allowed_counties:
                total = (
                    db.query(func.count(Voter.id))
                    .filter(Voter.county.in_(allowed_counties))
                    .scalar()
                )
            else:
                total = 0

    return {
        "voters": voters,
        "total": total,
        "has_more": has_more,
        "page": page,
        "page_size": page_size,
    }
