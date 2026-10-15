from django.urls import path

from .views import forecast_proxy, health, history_proxy, metrics_proxy

urlpatterns = [
    path("health/", health),
    path("api/forecast/", forecast_proxy),
    path("api/v1/history", history_proxy),
    path("api/v1/forecast", forecast_proxy),
    path("api/v1/metrics", metrics_proxy),
]
