import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import Base, engine
from . import models  # ensure models are imported so tables are registered
from .routers import auth_routes, voter_routes, admin_routes, tag_routes, branding_routes
from .paths import UPLOADS_DIR  # shared uploads directory (supports Render Disk)

app = FastAPI(title="BOOTS ON THE GROUND")  # <--- Application title

# CORS (you can tighten origins later to just your frontend domain)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve packaged static assets from /static
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# Serve uploaded assets (logos, etc.) from /uploads
# NOTE: This must exist on disk and should point at a persistent mount in production.
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

# Create tables if they don't exist yet
Base.metadata.create_all(bind=engine)

# Routers
app.include_router(auth_routes.router)
app.include_router(voter_routes.router)
app.include_router(admin_routes.router)
app.include_router(tag_routes.router)
app.include_router(branding_routes.router)
