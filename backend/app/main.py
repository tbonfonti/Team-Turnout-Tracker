import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import Base, engine
from . import models  # ensure models are imported so tables are registered
from .routers import auth_routes, voter_routes, admin_routes, tag_routes, branding_routes
from .paths import UPLOADS_DIR  # <-- shared uploads directory

app = FastAPI(title="Team Turnout Tracking")

# CORS (you can tighten origins to just your frontend later)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (logos, etc.) from /static, backed by UPLOADS_DIR
app.mount("/static", StaticFiles(directory=UPLOADS_DIR), name="static")

# Create tables if they don't exist yet
Base.metadata.create_all(bind=engine)

# Routers
app.include_router(auth_routes.router)
app.include_router(voter_routes.router)
app.include_router(admin_routes.router)
app.include_router(tag_routes.router)
app.include_router(branding_routes.router)