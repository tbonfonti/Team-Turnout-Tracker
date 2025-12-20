import os

"""Centralized path helpers.

The logo/branding system uploads image files and then serves them back
via FastAPI StaticFiles.

In production on Render, the filesystem is ephemeral unless you mount a
persistent disk. The recommended pattern is:

  - Mount a Render Disk at /var/data (or any path you choose)
  - Set env var UPLOADS_DIR=/var/data/uploads

If UPLOADS_DIR isn't set, we fall back to <backend_root>/uploads.
"""

# This file lives at: <project_root>/backend/app/paths.py
APP_DIR = os.path.dirname(os.path.abspath(__file__))  # .../backend/app
BACKEND_ROOT = os.path.dirname(APP_DIR)               # .../backend

# Prefer a persistent disk path when provided (Render Disk, Docker volume, etc.)
_env_uploads = os.getenv("UPLOADS_DIR")
if _env_uploads:
    UPLOADS_DIR = os.path.abspath(_env_uploads)
else:
    # Fall back to a local uploads folder inside the repo
    UPLOADS_DIR = os.path.join(BACKEND_ROOT, "uploads")

os.makedirs(UPLOADS_DIR, exist_ok=True)

# In-repo static folder (not used for uploaded logos, but kept for any packaged assets)
STATIC_DIR = os.path.join(APP_DIR, "static")
os.makedirs(STATIC_DIR, exist_ok=True)
