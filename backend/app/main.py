import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .database import Base, engine
from . import models
from .routers import auth_routes, voter_routes, admin_routes, tag_routes, branding_routes
from .paths import UPLOADS_DIR  # shared uploads directory

app = FastAPI(title="BOOTS ON THE GROUND")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve static files (if you use /static for anything)
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")

# ✅ Serve uploaded files (logos) from the persistent uploads directory
app.mount("/uploads", StaticFiles(directory=UPLOADS_DIR), name="uploads")

Base.metadata.create_all(bind=engine)

app.include_router(auth_routes.router)
app.include_router(voter_routes.router)
app.include_router(admin_routes.router)
app.include_router(tag_routes.router)
app.include_router(branding_routes.router)
