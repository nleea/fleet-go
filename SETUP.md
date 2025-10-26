# 🚀 Fleet Monitoring — Setup & Ejecución Completa

Monitoreo de flota en tiempo real con alertas de combustible, WebSockets y simulador IoT.

---

## 🧩 1️⃣ Requisitos previos

Tener instalado:

- **Docker Desktop / Docker Engine** ≥ 24.0  
- **Docker Compose**
- **Git**

---

## ⚙️ 2️⃣ Estructura del proyecto

fleet-monitoring/
├── backend/
│   ├── Dockerfile
│   ├── go.mod
│   ├── go.sum
│   ├── main.go
│   ├── run.go                     # entrypoint que ejecuta seed + backend
│   ├── scripts/
│   │   └── seed.go                # corre migraciones y crea usuarios/dispositivos
│   ├── internal/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── handler.go
│   │   │   ├── sensors/
│   │   │   │   └── handler.go
│   │   │   ├── devices/
│   │   │   │   └── handler.go
│   │   │   ├── ws/
│   │   │   │   └── handler.go
│   │   │   └── router.go
│   │   ├── appcore/
│   │   │   └── app.go
│   │   ├── config/
│   │   │   └── config.go
│   │   ├── middleware/
│   │   │   ├── cors.go
│   │   │   └── jwt.go
│   │   ├── service/
│   │   │   ├── sensor_service.go
│   │   │   └── alert_service.go
│   │   ├── repository/
│   │   │   ├── sensor_repository.go
│   │   │   ├── alert_repository.go
│   │   │   ├── device_repository.go
│   │   │   └── user_repository.go
│   │   ├── domain/
│   │   │   ├── user.go
│   │   │   ├── device.go
│   │   │   ├── alert.go
│   │   │   └── sensor_data.go
│   │   └── ws/
│   │       ├── hub.go
│   │       └── client.go
│   ├── tests/
│   │   ├── auth_test.go
│   │   ├── sensor_test.go
│   │   ├── ws_test.go
│   │   └── fuel_alert_test.go
│   └── ...
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   ├── tsconfig.json
│   ├── public/
│   │   └── favicon.ico
│   ├── src/
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   ├── lib/
│   │   │   ├── axiosClient.ts
│   │   │   ├── ws.ts
│   │   │   └── useFleetStore.ts
│   │   ├── components/
│   │   │   ├── interactive-map.tsx
│   │   │   ├── alerts-panel.tsx
│   │   │   ├── historical-data-panel.tsx
│   │   │   ├── stats-overview.tsx
│   │   │   ├── login-form.tsx
│   │   │   └── ui/
│   │   │       ├── button.tsx
│   │   │       ├── badge.tsx
│   │   │       └── card.tsx
│   │   └── assets/
│   │       └── logo.svg
│   └── ...
│
│-- test.py
├── docker-compose.yml             # orquesta todos los servicios
├── SETUP.md                       # guía técnica completa para ejecución
├── DESIGN.md                      # justificación del stack y trade-offs técnicos
├── README.md                      # resumen para repositorio / entrega
└── .gitignore


---

## 🧠 3️⃣ Componentes del sistema

| Servicio | Rol | Puerto | Descripción |
|-----------|------|--------|-------------|
| 🗄️ `db` | PostgreSQL | 5433 | Base de datos principal |
| ⚙️ `backend` | API REST + WebSocket | 8080 | Servicio central (Go + Gin) |
| 💻 `frontend` | Dashboard React | 5173 | Interfaz visual del monitoreo |
| 📡 `simulator` | Envío de datos IoT | — | Simula sensores en tiempo real |
| 🧾 `seed` | (Integrado al backend) | — | Corre migraciones y crea datos iniciales |

---

## 🐳 4️⃣ Construcción y ejecución (modo automático) Docker

Ejecuta desde la raíz del proyecto:

```bash
docker compose up --build
```

## 5️⃣ Construcción y ejecución Manual

Crear una BD en postgrest

### datos para la bd 

```m
POSTGRES_USER: fleet_user
POSTGRES_PASSWORD: fleet_pass
POSTGRES_DB: fleet_db
```

Ese es el usuario - contrase~a y la BD, deben ser esos mismo para que se pueda conectar la bd o cambiarlos en el .env

o correr el docker compose para crear esa bd

```bash
docker compose -f docker-compose.db.yml up --build -d

si se crea aca apunta al puerto 5433 tener en cuenta

```

```m
PORT=8000
DB_DSN=postgres://fleet_user:fleet_pass@localhost:5432/fleet_db?sslmode=disable
JWT_SECRET=supersecret
ENV=development
GIN_MODE=release

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
```

datos para el .env

ejecutar el run del backend luego que este creada la BD 

Desde el directorio /backend

```bash
go mod tidy
go run scripts/seed.go
go run cmd/api/main.go
```

Desde /dashboard

```bash
npm install --legacy-peer-deps
npm run build
npm run preview

---

yarn install --legacy-peer-deps
yarn run build
yarn run preview

```

Desde la raiz /

ejecutar el simulador
```bash
python test.py
```

Verificacion con curl
```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```
---
## 6️⃣ Por comando run.sh

```bash
chmod +x run.sh
./run.sh
```