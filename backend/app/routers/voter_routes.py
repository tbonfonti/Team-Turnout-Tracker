# backend/app/routers/voter_routes.py

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.database import get_db
from app.deps import get_current_user
from app.models import Voter, UserCountyAccess
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

    Uses ILIKE so text-pattern indexes (trigram / btree) can be used.

    For multi-word queries (e.g. "Allison Murphy"):
      - We split into terms ["Allison", "Murphy"].
      - For `field="all"` we require each term to appear in at least one
        of the searchable columns (AND of ORs), so someone with
        first_name="Allison", last_name="Murphy" will be matched.
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

    # Restrict non-admin users to only the counties they are allowed to see
    if not user.is_admin:
        allowed_rows = (
            db.query(UserCountyAccess.county)
            .filter(UserCountyAccess.user_id == user.id)
            .all()
        )
        allowed_counties = [r[0] for r in allowed_rows if r[0] is not None]

        if allowed_counties:
            base_query = base_query.filter(Voter.county.in_(allowed_counties))
        else:
            # User has no assigned counties => no voters visible
            base_query = base_query.filter(False)

    if q:
        q = q.strip()
        if q:
            terms = [t for t in q.split() if t]

            # If no terms (e.g. user typed just spaces), fall back to simple listing
            if not terms:
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

            normalized_field = (field or "all").strip().lower()

            if normalized_field != "all" and normalized_field in field_map:
                # Single-column search
                col = field_map[normalized_field]
                # All terms must appear in that column (AND of ILIKE)
                conditions = [
                    col.ilike(f"%{term}%") for term in terms
                ]
                base_query = base_query.filter(and_(*conditions))
            else:
                # Broad multi-field search:
                # For each term, build an OR across all searchable columns,
                # then AND those groups together so each term appears somewhere.
                per_term_conditions = []
                for term in terms:
                    like_pattern = f"%{term}%"
                    per_term_conditions.append(
                        or_(
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
                            Voter.precinct.ilike(like_pattern),
                        )
                    )

                # AND the per-term OR groups together
                base_query = base_query.filter(and_(*per_term_conditions))

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
