import os

APP_DIR = os.path.dirname(os.path.abspath(__file__))        # .../backend/app
BACKEND_ROOT = os.path.dirname(APP_DIR)                     # .../backend

# Priority:
#  1) UPLOADS_DIR env var (recommended on Render)
#  2) RENDER_DISK_PATH or PERSISTENT_DISK_PATH + "/uploads"
#  3) Local fallback: <backend>/uploads
_env_uploads_dir = os.getenv("UPLOADS_DIR")
_disk_mount = os.getenv("RENDER_DISK_PATH") or os.getenv("PERSISTENT_DISK_PATH")

if _env_uploads_dir:
    _candidate_uploads = _env_uploads_dir
elif _disk_mount:
    _candidate_uploads = os.path.join(_disk_mount, "uploads")
else:
    _candidate_uploads = os.path.join(BACKEND_ROOT, "uploads")

# ✅ Fail-safe: if the disk path is wrong/unwritable, fall back to /tmp/uploads
def _ensure_dir(path: str) -> str:
    try:
        os.makedirs(path, exist_ok=True)
        return path
    except Exception:
        fallback = os.path.join("/tmp", "uploads")
        os.makedirs(fallback, exist_ok=True)
        return fallback

UPLOADS_DIR = _ensure_dir(_candidate_uploads)

STATIC_DIR = os.path.join(APP_DIR, "static")
os.makedirs(STATIC_DIR, exist_ok=True)

LOGO_PATH = os.path.join(STATIC_DIR, "logo.png")
