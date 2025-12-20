import os

# This file lives at: <project_root>/backend/app/paths.py
# We want:
#   APP_DIR      = <project_root>/backend/app
#   BACKEND_ROOT = <project_root>/backend
#   UPLOADS_DIR  = <project_root>/backend/uploads

APP_DIR = os.path.dirname(os.path.abspath(__file__))        # .../backend/app
BACKEND_ROOT = os.path.dirname(APP_DIR)                     # .../backend
UPLOADS_DIR = os.path.join(BACKEND_ROOT, "uploads")         # .../backend/uploads

os.makedirs(UPLOADS_DIR, exist_ok=True)

STATIC_DIR = os.path.join(APP_DIR, "static")
os.makedirs(STATIC_DIR, exist_ok=True)  # AUTO-CREATE STATIC DIRECTORY

LOGO_PATH = os.path.join(STATIC_DIR, "logo.png")