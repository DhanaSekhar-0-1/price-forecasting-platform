from django.urls import path
from .views import forecast_proxy, health
# Route gateway calls to the Django views.
urlpatterns = [path("health/", health), path("api/forecast/", forecast_proxy)]
