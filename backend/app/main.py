import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import Base, engine
from . import models  # <-- make sure models are imported so tables are registered
from .routers import auth_routes, voter_routes, admin_routes, tag_routes, branding_routes

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="Team Turnout Tracking")

# CORS for frontend
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "*")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[FRONTEND_ORIGIN, "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files for logo uploads
os.makedirs("uploads", exist_ok=True)
app.mount("/static", StaticFiles(directory="uploads"), name="static")

# Routers
app.include_router(auth_routes.router)
app.include_router(voter_routes.router)
app.include_router(admin_routes.router)
app.include_router(tag_routes.router)
app.include_router(branding_routes.router)


@app.get("/")
def read_root():
    return {"message": "Team Turnout Tracking API running"}
