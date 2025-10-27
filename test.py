import json
import random
import time
import threading
import requests
from datetime import datetime
import os

# === CONFIGURACIÓN ===
BACKEND_HOST = os.getenv("BACKEND_HOST", "http://localhost:8000")
API_URL = f"{BACKEND_HOST}/api/v1/protected/sensors/data"
AUTH_URL = f"{BACKEND_HOST}/api/v1/auth/login"

EMAIL = os.getenv("ADMIN_EMAIL", "admin@example.com")
PASSWORD = os.getenv("ADMIN_PASS", "admin123")
INTERVAL = float(os.getenv("SENSOR_INTERVAL", 3))  # segundos entre envíos

LOG_FILE = "sensor_log.json"
TOKEN = None


# === DISPOSITIVOS SIMULADOS ===
devices = [
    {"id": 1, "name": "Camión Norte", "lat": 14.255, "lng": -70.110, "speed": 40.0, "fuel": 100.0, "temp": 22.0},
    {"id": 2, "name": "Bus Centro", "lat": 14.245, "lng": -70.120, "speed": 40.0, "fuel": 100.0, "temp": 23.0},
    {"id": 3, "name": "Moto Sur", "lat": 14.235, "lng": -70.130, "speed": 40.0, "fuel": 100.0, "temp": 24.0},
    {"id": 4, "name": "Moto Norte", "lat": 14.235, "lng": -70.130, "speed": 40.0, "fuel": 100.0, "temp": 24.0},
    {"id": 5, "name": "Moto Oriente", "lat": 14.235, "lng": -70.130, "speed": 40.0, "fuel": 100.0, "temp": 24.0},
]

# === FUNCIONES AUXILIARES ===
def get_token():
    """Obtiene el token JWT desde el endpoint de autenticación."""
    global TOKEN
    payload = {"email": EMAIL, "password": PASSWORD}
    try:
        print(f"🔑 Autenticando usuario {EMAIL} ...")
        res = requests.post(AUTH_URL, json=payload, timeout=10)
        if res.status_code == 200:
            data = res.json()
            TOKEN = data.get("token")
            print("✅ Token obtenido correctamente.\n")
            return TOKEN
        else:
            print(f"❌ Error autenticando: {res.status_code} {res.text}")
            return None
    except Exception as e:
        print(f"❌ Error conexión login: {e}")
        return None


def get_headers():
    """Headers con el token actual."""
    return {"Authorization": f"Bearer {TOKEN}", "Content-Type": "application/json"}


def random_walk(value, delta=0.0008):
    return round(value + random.uniform(-delta, delta), 6)


def random_variation(value, delta):
    return round(value + random.uniform(-delta, delta), 2)


def simulate_device(device):
    """Simula datos para un dispositivo y los envía al API REST."""
    while True:
        # Movimiento leve
        device["lat"] = random_walk(device["lat"])
        device["lng"] = random_walk(device["lng"])

        # Velocidad variable
        device["speed"] = round(random.uniform(20, 100) if device["fuel"] > 5 else 0, 1)

        # Descenso progresivo del combustible
        if device["id"] == 1:
            device["fuel"] = max(0, round(device["fuel"] - random.uniform(0.05, 0.15), 2))
        else:
            device["fuel"] = max(0, round(device["fuel"] - random.uniform(0.01, 0.04), 2))

        # Temperatura
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
            res = requests.post(API_URL, json=payload, headers=get_headers(), timeout=5)
            if res.status_code in (200, 202):
                print(
                    f"[✓] {device['name']} | lat={device['lat']:.6f}, lng={device['lng']:.6f}, "
                    f"fuel={device['fuel']}%, speed={device['speed']} km/h"
                )
            elif res.status_code == 401:
                # Token expirado → refrescar
                print("⚠️ Token expirado, renovando...")
                if get_token():
                    continue
            else:
                print(f"[x] Error {res.status_code}: {res.text}")
        except Exception as e:
            print(f"[x] Error conexión: {e}")

        time.sleep(INTERVAL)


def main():
    print("🚀 Iniciando simulación de dispositivos IoT...\n")

    # Obtener token inicial
    while not get_token():
        print("⏳ Reintentando en 5s...")
        time.sleep(5)

    # Lanzar threads por dispositivo
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
