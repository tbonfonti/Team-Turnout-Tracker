import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import Base, engine
from . import models  # ensure models are imported so tables are registered
from .routers import auth_routes, voter_routes, admin_routes, tag_routes, branding_routes

# Base directory of the backend package
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOADS_DIR = os.path.join(BASE_DIR, "uploads")

# Make sure uploads directory exists
os.makedirs(UPLOADS_DIR, exist_ok=True)

app = FastAPI(title="Team Turnout Tracking")

# CORS (you can tighten this later if you want)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # e.g. ["https://your-frontend.onrender.com"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (logos, etc.) from /static
app.mount("/static", StaticFiles(directory=UPLOADS_DIR), name="static")

# Create tables if they don't exist yet
Base.metadata.create_all(bind=engine)

# Routers
app.include_router(auth_routes.router)
app.include_router(voter_routes.router)
app.include_router(admin_routes.router)
app.include_router(tag_routes.router)
app.include_router(branding_routes.router)