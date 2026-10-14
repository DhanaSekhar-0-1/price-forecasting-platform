import os
import requests
from django.http import JsonResponse
from django.views.decorators.http import require_GET

BASE = os.getenv("FASTAPI_BASE_URL", "http://127.0.0.1:8000")

@require_GET
def health(request):
    # Expose gateway status without claiming the upstream is healthy.
    try:
        upstream = requests.get(f"{BASE}/health", timeout=3)
        return JsonResponse({"gateway": "ok", "fastapi_status": upstream.status_code}, status=200 if upstream.ok else 502)
    except requests.RequestException as exc:
        return JsonResponse({"gateway": "ok", "fastapi_error": str(exc)}, status=502)

@require_GET
def forecast_proxy(request):
    # Forward the query horizon and return the actual FastAPI response.
    horizon = request.GET.get("horizon", "12")
    try:
        upstream = requests.get(f"{BASE}/api/v1/forecast", params={"horizon": horizon}, timeout=10)
        return JsonResponse(upstream.json(), status=upstream.status_code, safe=not isinstance(upstream.json(), list))
    except requests.RequestException as exc:
        return JsonResponse({"detail": f"FastAPI unavailable: {exc}"}, status=502)
