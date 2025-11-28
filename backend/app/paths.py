import os

# This file is in: <project_root>/backend/app/paths.py
# We want PROJECT_ROOT = <project_root> (the one that contains "backend" and "frontend").

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
# Example: /opt/render/project/src

# All uploads (logos, etc.) go into <project_root>/uploads
UPLOADS_DIR = os.path.join(PROJECT_ROOT, "uploads")

# Make sure the directory exists at startup
os.makedirs(UPLOADS_DIR, exist_ok=True)