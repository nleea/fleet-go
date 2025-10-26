#!/bin/bash
# ===========================================
# 🚀 Fleet Monitoring - Runner Script (manual)
# ===========================================

echo "==========================================="
echo "🚀 Iniciando Fleet Monitoring (modo local)"
echo "==========================================="

echo "🧹 Liberando puertos (8000, 8080, 5173)..."
kill -9 $(lsof -t -i:8000 -i:8080 -i:5173) 2>/dev/null || true

sleep 4
# --- Variables base ---
BACKEND_PORT=8000
FRONTEND_PORT=4173
SIMULATOR_INTERVAL=3

# --- Verificar dependencias ---
command -v go >/dev/null 2>&1 || { echo "❌ Go no está instalado."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ Node.js no está instalado."; exit 1; }
command -v python >/dev/null 2>&1 || { echo "❌ Python no está instalado."; exit 1; }

# --- Iniciar backend ---
echo "⚙️  Iniciando backend..."
cd backend || exit
nohup go mod tidy & go run scripts/seed.go & go run cmd/api/main.go > ../backend.log 2>&1 &
BACK_PID=$!
cd ..

sleep 4

# --- Iniciar frontend ---
echo "💻 Iniciando frontend..."
cd dashboard || exit
nohup npm install --legacy-peer-deps & npm run build & npm run preview > ../frontend.log 2>&1 &
FRONT_PID=$!
cd ..

sleep 4

# --- Iniciar simulador ---
echo "📡 Iniciando simulador IoT..."
nohup python test.py > ../simulator.log 2>&1 &
SIM_PID=$!
cd ..

echo "✅ Todos los servicios se están ejecutando."
echo "🌐 Backend:   http://localhost:$BACKEND_PORT"
echo "💻 Frontend:  http://localhost:$FRONTEND_PORT"
echo "📡 Simulador: activo (cada ${SIMULATOR_INTERVAL}s)"
echo "==========================================="

# --- Manejador de salida ---
cleanup() {
  echo ""
  echo "🛑 Deteniendo todos los servicios..."
  kill -TERM -$$ 2>/dev/null
  echo "✅ Servicios detenidos correctamente."
  exit 0
}

trap cleanup SIGINT SIGTERM

# --- Manejador de salida ---
trap 'echo "🛑 Deteniendo todo..."; kill $BACK_PID $FRONT_PID $SIM_PID; exit 0' SIGINT SIGTERM

while true; do sleep 1; done
