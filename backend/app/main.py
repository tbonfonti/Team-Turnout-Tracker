import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import Base, engine
from . import models  # ensure models are imported so tables are registered
from .routers import auth_routes, voter_routes, admin_routes, tag_routes, branding_routes

# -------------------------------------------------------------------
# Paths: put uploads under the backend folder, so it's predictable.
# This file is: <project_root>/backend/app/main.py
# BACKEND_ROOT => <project_root>/backend
# UPLOADS_DIR  => <project_root>/backend/uploads
# -------------------------------------------------------------------
BACKEND_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOADS_DIR = os.path.join(BACKEND_ROOT, "uploads")
os.makedirs(UPLOADS_DIR, exist_ok=True)

app = FastAPI(title="Team Turnout Tracking")

# CORS (you can restrict origins later to your frontend domain)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (logos, etc.) from /static
# This maps /static/<filename> to <project_root>/backend/uploads/<filename>
app.mount("/static", StaticFiles(directory=UPLOADS_DIR), name="static")

# Create tables if they don't exist yet
Base.metadata.create_all(bind=engine)

# Routers
app.include_router(auth_routes.router)
app.include_router(voter_routes.router)
app.include_router(admin_routes.router)
app.include_router(tag_routes.router)
app.include_router(branding_routes.router)