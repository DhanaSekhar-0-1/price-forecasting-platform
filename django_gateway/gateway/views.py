import os

import requests
from django.http import JsonResponse
from django.views.decorators.http import require_GET

BASE = os.getenv("FASTAPI_BASE_URL", "http://127.0.0.1:8000").rstrip("/")


def proxy_get(path, params=None):
    try:
        upstream = requests.get(f"{BASE}{path}", params=params, timeout=30)
    except requests.RequestException as exc:
        return JsonResponse({"detail": f"FastAPI unavailable: {exc}"}, status=502)

    try:
        payload = upstream.json()
    except ValueError:
        return JsonResponse(
            {"detail": "FastAPI returned an invalid JSON response"},
            status=502,
        )

    return JsonResponse(
        payload,
        status=upstream.status_code,
        safe=not isinstance(payload, list),
    )


@require_GET
def health(request):
    try:
        upstream = requests.get(f"{BASE}/health", timeout=30)
        return JsonResponse(
            {"gateway": "ok", "fastapi_status": upstream.status_code},
            status=200 if upstream.ok else 502,
        )
    except requests.RequestException as exc:
        return JsonResponse({"gateway": "ok", "fastapi_error": str(exc)}, status=502)


@require_GET
def forecast_proxy(request):
    horizon = request.GET.get("horizon", "12")
    return proxy_get("/api/v1/forecast", {"horizon": horizon})


@require_GET
def history_proxy(request):
    return proxy_get("/api/v1/history")


@require_GET
def metrics_proxy(request):
    return proxy_get("/api/v1/metrics")
