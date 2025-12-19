# backend/app/routers/voter_routes.py

from typing import Optional
import re

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_, func

from app.database import get_db
from app.deps import get_current_user
from app.models import Voter, UserCountyAccess
from app.schemas import VoterSearchResponse

router = APIRouter(prefix="/voters", tags=["Voters"])


def _sanitize_term(term: str) -> str:
    """
    Keep only alphanumeric characters. This avoids tsquery syntax issues
    and prevents user input from breaking the query.
    """
    return re.sub(r"[^a-z0-9]+", "", term.lower())


def _build_prefix_tsquery(terms: list[str]) -> str:
    """
    Build a to_tsquery string that uses prefix matching for each term, e.g.
    ["don", "purdy", "atlantic"] -> "don:* & purdy:* & atlantic:*"

    We only apply :* for terms length >= 3 to avoid extremely broad matches on short tokens.
    Short tokens (1-2 chars) are ignored in the tsquery.
    """
    cleaned = []
    for t in terms:
        s = _sanitize_term(t)
        if len(s) >= 3:
            cleaned.append(f"{s}:*")
    return " & ".join(cleaned)


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
    # Normalize page_size
    if page_size not in (10, 25, 50):
        if page_size < 10:
            page_size = 10
        elif page_size < 25:
            page_size = 25
        else:
            page_size = 50

    base_query = db.query(Voter)

    # -------------------------------------------------
    # County permissions
    # -------------------------------------------------
    allowed_counties = None
    if not getattr(user, "is_admin", False):
        allowed_counties = [
            r[0]
            for r in db.query(UserCountyAccess.county)
            .filter(UserCountyAccess.user_id == user.id)
            .all()
        ]

        if not allowed_counties:
            return {
                "voters": [],
                "total": 0,
                "has_more": False,
                "page": page,
                "page_size": page_size,
            }

        base_query = base_query.filter(Voter.county.in_(allowed_counties))

    # -------------------------------------------------
    # Search logic
    # -------------------------------------------------
    normalized_field = (field or "all").strip().lower()
    q = (q or "").strip()
    terms = [t for t in q.split() if t]

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
        # ---------------------------------------------
        # Specific column search
        # ---------------------------------------------
        if normalized_field != "all" and normalized_field in field_map:
            col = field_map[normalized_field]
            base_query = base_query.filter(and_(*[col.ilike(f"%{t}%") for t in terms]))
            base_query = base_query.order_by(Voter.last_name.asc(), Voter.first_name.asc())

        # ---------------------------------------------
        # ALL FIELDS SEARCH (smart)
        # ---------------------------------------------
        else:
            # -----------------------------
            # EXACTLY TWO TERMS
            # -----------------------------
            if len(terms) == 2:
                t1, t2 = terms
                full = f"{t1} {t2}"

                base_query = base_query.filter(
                    or_(
                        # first last
                        and_(
                            func.lower(Voter.first_name).like(func.lower(f"{t1}%")),
                            func.lower(Voter.last_name).like(func.lower(f"{t2}%")),
                        ),
                        # last first
                        and_(
                            func.lower(Voter.first_name).like(func.lower(f"{t2}%")),
                            func.lower(Voter.last_name).like(func.lower(f"{t1}%")),
                        ),
                        # two-word last name (prefix)
                        func.lower(Voter.last_name).like(func.lower(f"{full}%")),
                        # two-word last name (ordered contains)
                        func.lower(Voter.last_name).like(func.lower(f"%{t1}% {t2}%")),
                    )
                )

                base_query = base_query.order_by(Voter.last_name.asc(), Voter.first_name.asc())

            # -----------------------------
            # EVERYTHING ELSE → FTS (PREFIX)
            # -----------------------------
            else:
                # Build prefix tsquery so "don" matches "donald", etc.
                tsquery_str = _build_prefix_tsquery(terms)

                # If everything was too short and got filtered out, fallback to plainto_tsquery
                if not tsquery_str:
                    tsq = func.plainto_tsquery("simple", func.lower(" ".join(terms)))
                else:
                    tsq = func.to_tsquery("simple", tsquery_str)

                base_query = base_query.filter(Voter.search_tsv.op("@@")(tsq))
                base_query = base_query.order_by(func.ts_rank(Voter.search_tsv, tsq).desc())

    # -------------------------------------------------
    # No search → browsing
    # -------------------------------------------------
    else:
        base_query = base_query.order_by(Voter.last_name.asc(), Voter.first_name.asc())

    # -------------------------------------------------
    # Pagination (NO COUNT(*) on search)
    # -------------------------------------------------
    offset = (page - 1) * page_size
    rows = base_query.offset(offset).limit(page_size + 1).all()

    has_more = len(rows) > page_size
    voters = rows[:page_size]

    # Only count totals when browsing
    total = None
    if not terms:
        count_query = db.query(func.count(Voter.id))
        if not getattr(user, "is_admin", False) and allowed_counties:
            count_query = count_query.filter(Voter.county.in_(allowed_counties))
        total = count_query.scalar()

    return {
        "voters": voters,
        "total": total,
        "has_more": has_more,
        "page": page,
        "page_size": page_size,
    }
