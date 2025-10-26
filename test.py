import json
import random
import time
import threading
import requests
from datetime import datetime

# === CONFIGURACIÓN ===
API_URL = "http://localhost:8000/api/v1/protected/sensors/data"  # tu endpoint REST
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsInJvbGUiOiJhZG1pbiIsImVtYWlsIjoiYWRtaW5AZXhhbXBsZS5jb20iLCJleHAiOjE3NjE1MjMyOTAsImlhdCI6IjIwMjUtMTAtMjVUMTk6MDE6MzAuNDYyOTY5LTA1OjAwIn0.JS2lJtDUyhjBToDL3EAb30zAKO5ZwL0ijuB2kcI8lXc"
INTERVAL = 3  # segundos entre envíos
LOG_FILE = "sensor_log.json"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
}

# === DISPOSITIVOS SIMULADOS ===
# Coordenadas base diferentes para que se vean separados en el mapa
devices = [
    {
        "id": 1,
        "name": "Camión Norte",
        "lat": 14.255,  # norte
        "lng": -70.110,
        "speed": 40.0,
        "fuel": 100.0,
        "temp": 22.0,
    },
    {
        "id": 2,
        "name": "Bus Centro",
        "lat": 14.245,  # centro
        "lng": -70.120,
        "speed": 40.0,
        "fuel": 100.0,
        "temp": 23.0,
    },
    {
        "id": 3,
        "name": "Moto Sur",
        "lat": 14.235,  # sur
        "lng": -70.130,
        "speed": 40.0,
        "fuel": 100.0,
        "temp": 24.0,
    },
]


# === FUNCIONES AUXILIARES ===
def random_walk(value, delta=0.0008):
    """Simula movimiento geográfico leve (aleatorio dentro de un rango)"""
    return round(value + random.uniform(-delta, delta), 6)


def random_variation(value, delta):
    """Pequeña variación aleatoria"""
    return round(value + random.uniform(-delta, delta), 2)


def simulate_device(device):
    """Simula datos para un dispositivo y los envía al API REST"""
    while True:
        # movimiento leve en ambos ejes
        device["lat"] = random_walk(device["lat"])
        device["lng"] = random_walk(device["lng"])

        # velocidad entre 0–100 km/h (solo si hay combustible)
        device["speed"] = round(random.uniform(20, 100) if device["fuel"] > 5 else 0, 1)

        # combustible baja lentamente
        if device["id"] == 1:
            device["fuel"] = max(0, round(device["fuel"] - random.uniform(0.05, 0.15), 2))
        else:
            device["fuel"] = max(0, round(device["fuel"] - random.uniform(0.01, 0.04), 2))


        # temperatura varía ligeramente
        device["temp"] = random_variation(device["temp"], 0.15)

        payload = {
            "device_id": device["id"],
            "lat": device["lat"],
            "lng": device["lng"],
            "speed": device["speed"],
            "fuel_level": device["fuel"],
            "temperature": device["temp"],
            "ts": datetime.utcnow().isoformat() + "Z",
        }

        try:
            res = requests.post(API_URL, json=payload, headers=HEADERS, timeout=5)
            if res.status_code == 200:
                print(
                    f"[✓] {device['name']} | lat={device['lat']:.6f}, lng={device['lng']:.6f}, "
                    f"fuel={device['fuel']}%, speed={device['speed']} km/h"
                )
            else:
                print(f"[x] Error {res.status_code}: {res.text}")
        except Exception as e:
            print(f"[x] Error conexión: {e}")

        time.sleep(INTERVAL)


def main():
    print("🚀 Iniciando simulación de dispositivos IoT...\n")
    threads = []
    for device in devices:
        t = threading.Thread(target=simulate_device, args=(device,))
        t.daemon = True
        t.start()
        threads.append(t)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\n🛑 Simulación detenida manualmente.")
    except Exception as e:
        print(f"[x] Error general: {e}")


if __name__ == "__main__":
    main()
