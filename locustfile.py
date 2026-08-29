"""Locust Load Test Script para MeteoPrecisa API.

Para ejecutar:
    pip install locust
    locust -f locustfile.py --host=http://localhost:8000
"""

import random

from locust import HttpUser, between, task

COORDINADAS_CHILE = [
    (-33.4489, -70.6693),  # Santiago
    (-33.0472, -71.6127),  # Valparaíso
    (-36.8201, -73.0444),  # Concepción
    (-38.7359, -72.5904),  # Temuco
    (-41.4689, -72.9411),  # Puerto Montt
    (-34.1701, -70.7407),  # Rancagua (Zona Agrícola)
    (-35.4264, -71.6554),  # Talca (Zona Agrícola)
]


class MeteoPrecisaUser(HttpUser):
    wait_time = between(1, 3)

    @task(3)
    def test_clima_cercano(self):
        lat, lon = random.choice(COORDINADAS_CHILE)
        self.client.get(f"/api/v1/weather/nearby?lat={lat}&lon={lon}")

    @task(1)
    def test_healthcheck(self):
        self.client.get("/api/v1/health")
