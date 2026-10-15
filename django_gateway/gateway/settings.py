import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "dev-only-change-me")
DEBUG = os.getenv("DJANGO_DEBUG", "false").lower() == "true"
ALLOWED_HOSTS = [
    "127.0.0.1",
    "localhost",
    "price-forecasting-django.onrender.com",
]
ROOT_URLCONF = "gateway.urls"
INSTALLED_APPS = ["corsheaders"]
MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
]

configured_origins = [
    origin.strip().rstrip("/")
    for origin in os.getenv("CORS_ALLOWED_ORIGINS", "").split(",")
    if origin.strip()
]
CORS_ALLOWED_ORIGINS = list(dict.fromkeys([
    "https://price-forecasting-platform.vercel.app",
    "https://price-forecasting-platform-l50nsnn8b-dhana-0-1-projects.vercel.app",
    *configured_origins,
]))
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://price-forecasting-platform(?:-[a-z0-9-]+)?-dhana-0-1-projects\.vercel\.app$",
]
TEMPLATES = []
WSGI_APPLICATION = "gateway.wsgi.application"
