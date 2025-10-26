# DESIGN.md — Plataforma de Telemetría y Alertas en Tiempo Real
**Proyecto:** Simón Movilidad — Prueba Técnica Desarrollador II  
**Autor:** Nelson Borrego  
**Fecha:** 26 de octubre de 2025

> Este documento describe el **razonamiento de diseño**, la **elección del stack** y los **trade-offs** que asumimos para entregar un MVP sólido, extensible y listo. Incluye las **lecciones aprendidas** y retos encontrados.


```
backend
├── README.md
├── cmd
│   └── api
│       └── main.go
├── docker-compose.yml
├── go.mod
├── go.sum
├── internal
│   ├── api
│   │   ├── alerts
│   │   ├── app.go
│   │   ├── auth
│   │   ├── devices
│   │   ├── router.go
│   │   ├── sensors
│   │   └── ws
│   ├── appcore
│   │   └── app.go
│   ├── config
│   │   └── config.go
│   ├── domain
│   │   └── models.go
│   ├── middleware
│   │   ├── JWT.go
│   │   ├── cors.go
│   │   └── rbac.go
│   ├── repository
│   │   ├── alert_repository.go
│   │   ├── device_repository.go
│   │   ├── sensor_repository.go
│   │   └── user_repo.go
│   ├── service
│   │   ├── alert_service.go
│   │   ├── auth_service.go
│   │   ├── device_Service.go
│   │   └── sensor_service.go
│   ├── utils
│   │   ├── JWT.go
│   │   ├── hash.go
│   │   └── logger.go
│   └── ws
│       ├── broadcaster.go
│       ├── client.go
│       └── hub.go
├── pkg
│   └── db
│       └── postgres.go
├── scripts
│   └── seed.go
└── tests
    └── integration
```

---

## 1) Objetivos, Alcance y Criterios de Aceptación

### 1.1 Objetivo General
Monitorear dispositivos IoT de flota en **tiempo real**, persistiendo telemetría, **generando alertas** por anomalías (combustible), y exponiendo los datos mediante **API REST** y **WebSocket** para un frontend React.

### 1.2 Alcance del MVP
- **Ingesta** de lecturas de sensores: `POST /api/v1/protected/sensors/data`.
- **Consulta** de alertas: `GET /api/alert`.
- **Tiempo real**: `GET /api/v1/ws` para `sensor_update` y `alert_created`.
- **Autenticación** y **autorización** con JWT (roles `admin`, `user`).
- **Frontend**: mapa, panel de alertas, histórico, estadísticas básicas.
- **Resiliencia cliente**: reconexión WS con backoff, cache local, enmascaramiento de IDs.

### 1.3 Criterios de Aceptación
- **Disponibilidad objetivo**: Disponibilidad al back y front en tiempo real.
- **Persistencia** transaccional de lecturas y alertas.
- **Seguridad**: JWT + CORS estricto + validación y sanitización de entradas.
- **Observabilidad**: logs estructurados y métricas básicas publicadas.

---

## 2) Stack Tecnológico y Justificación

### 2.1 Backend — Go (Golang) + Gin + gorilla/websocket + GORM
- **Por qué Go**: excelente **concurrencia** para WS, binarios **ligeros**, **rendimiento** consistente y GC moderno.
- **Gin**: router minimalista, rápido, middleware sencillo, validación `binding`.
- **gorilla/websocket**: librería probada para WS, control explícito de frames y timeouts.
- **GORM**: unifica SQLite y PostgreSQL, migraciones y modelos.

**Trade-offs backend**
- (+) Rendimiento, huella de memoria, compilación estática, DX clara con Gin.
- (–) Menos ecosistema “baterías incluidas” para tiempo real que Node+Socket.io.
- (–) Algo más de *boilerplate* para middlewares de seguridad y validaciones finas.

### 2.2 Base de Datos — PostgreSQL
- **PostgreSQL**: integridad transaccional, índices compuestos, escalabilidad, extensiones geoespaciales en futuro.

**Trade-offs datos**
- (+) Iteración/desarrollo sin fricción.

### 2.3 Frontend — React 18 + Vite + Zustand + Axios + Tailwind + shadcn/ui
- **React**: modelo declarativo, composición de UI, gran comunidad.
- **Zustand**: estado global sin boilerplate de Redux; selectors para evitar re-renders.
- **Axios**: cliente HTTP con interceptores para JWT.
- **WS nativo**: control fino de reconexión y backpressure en el cliente.
- **Tailwind + shadcn/ui**: diseño consistente, velocidad en UI profesional.

**Trade-offs frontend**
- (+) Control fino sobre WS y estado.
- (–) Requiere control para evitar re-renders.

### 2.4 Infraestructura — Docker/Compose (MVP)
- Compose orquesta `backend`, `frontend` y `db`.

**Trade-offs infraestructura**
- (+) Reproducible, sencillo, portable.

---

## 3) Arquitectura

### 3.1 Vista Lógica (alto nivel)



### 3.2 Componentes Clave
- **Sensor Service**: validación de payload, idempotencia básica, persistencia, detección de anomalías.
- **Alert Service**: generación y consulta; emite `alert_created` al WS Hub.
- **WS Hub**: gestiona conexiones, ping/pong, deadlines; difunde `sensor_update` y `alert_created`.
- **Auth**: emisión/validación de JWT; `role` en claims (`admin`/`user`).

### 3.3 Secuencias (simplificadas)

**Ingesta → Alerta → WS**

```m
Device -> POST /api/v1/protected/sensors/data 
-> SensorService
-> persist lectura
-> eval rules -> (si dispara)
-> insert alert
-> WS Hub broadcast(alert_created)
Frontend -> recibe event y actualiza estado (alerts, badges)
```

**Suscripción tiempo real**

Frontend -> GET /api/v1/ws (upgrade)
WS Hub -> registra conexión y topics
Hub -> push sensor_update/alert_created según eventos
Frontend -> setState (Zustand) + UI

---

## 4) Modelo de Datos

### 4.1 Entidades Principales
- **Device**
  - `id` (PK), `external_id` (string), `external_id_masked` (string), `created_at`.
- **SensorReading**
  - `id` (PK), `device_id` (FK), `ts` (timestamp), `lat`, `lng`,
  - `speed_kph`, `fuel_level` (litros o % según proveedor), `fuel_rate_lh`, `temp_c`.
- **Alert**
  - `id` (PK), `device_id` (FK), `type` (`fuel_drop`, `low_fuel`, `overheat`, …),
  - `message`, `created_at`, `seen` (bool), `severity` (low|med|high).

### 4.2 Esquema SQL (PostgreSQL orientativo)
```sql
CREATE TABLE devices (
  id SERIAL PRIMARY KEY,
  external_id TEXT UNIQUE NOT NULL,
  masked_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
  updated_at TIMESTAMPTZ DEFAULT now()
  deleted_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE sensor_data (
  id BIGSERIAL PRIMARY KEY,
  device_id INT NOT NULL REFERENCES devices(id),
  ts TIMESTAMPTZ NOT NULL,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  speed DOUBLE PRECISION,
  fuel_level DOUBLE PRECISION,
  temperature DOUBLE PRECISION
);
CREATE INDEX idx_sensor_device_ts ON sensor_data(device_id, ts DESC);

CREATE TABLE alerts (
  id BIGSERIAL PRIMARY KEY,
  device_id INT NOT NULL REFERENCES devices(id),
  type TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  ack BOOLEAN DEFAULT false
);
CREATE INDEX idx_alerts_device_created ON alerts(device_id, created_at DESC);
```
---

## 5) API Contracts

### 5.1) POST /api/v1/protected/sensors/data 
```json
{
    "device_id": 1,
    "lat": 14.245,
    "lng": -70.120,
    "speed": 40.6,
    "fuel_level":50.0,
    "temperature": 20.0,
    "ts": "2025-10-28T20:00:00Z"
}

```

### Response
```json
{
    "status": "data received"
}
```

### 5.1) GET /api/v1/protected/alerts/

```json
[
  {
    "id": 3,
    "device_id": "DEV-123",
    "type": "fuel_drop",
    "severity": "high",
    "message": "Caída >10% en <5min",
    "created_at": "2025-10-26T13:00:00Z",
    "seen": false
  }
]
```

### 5.3) GET /api/ws (Auth por query/header)

Eventos push

telemetry: última lectura relevante del device.

alert: alerta recién creada.

## 6) Lógica de Negocio y Reglas

### 6.1 Detección de Anomalías (ejemplos)

Disminución brusca de combustible

Si Δ fuel_level > 10% en < 5 min → alert(type=fuel_drop, severity=high).

Baja autonomía

autonomy_h = fuel_level / max(fuel_rate_lh, ε)

Si < 1h → alert(type=low_fuel, severity=med).

6.2 Idempotencia y Suavizado

Idempotencia: hash opcional (device_id, ts, lat, lng, fuel_level, …) para descartar duplicados.

Suavizado: rolling median/EMA para reducir ruido antes de disparar alertas.

### 7) Seguridad

### 7.1 Autenticación y Autorización

JWT firmado; claims: sub, role, exp.

Roles

user: lectura de mapa y sensor_update; sin alertas sensibles.

admin: acceso a /api/alert, recibe alert_created.

Revocación: por expiración corta + rotación, y lista de deny opcional en caché.

### 7.2 CORS y Encabezados

CORS: allowlist de orígenes; verbs GET, POST, WS.

Headers seguridad: X-Content-Type-Options, X-Frame-Options, Referrer-Policy.

### 7.3 Protección WS

Validación de token al upgrade.

Ping/Pong y WriteDeadline para evitar conexiones zombie.

### 7.4 Privacidad

Enmascaramiento de external_id al cliente no admin.

Sanitización estricta de entradas.

## 8) Observabilidad

### 8.1 Logging

Logs estructurados
Niveles: INFO para flujos normales, WARN/ERROR para anomalías.

### 8.2 Métricas (MVP)

Contadores: lecturas procesadas, alertas creadas, conexiones WS activas.

## 9) Frontend: Estado, Render y UX Tiempo Real

## 9.1 Estado Global (Zustand)

Slices: devices, alerts, wsStatus.

Selectors: evitan re-renders masivos en mapa y listas.

Offline: caché local (IndexedDB/localStorage) para últimos datos.

### 9.2 WS Cliente

Reconexión.

### 9.3 Mapa e Interacciones

Datasets normalizados por device_id.

## 10) DevEx y Operación

### 11.1) Estructura de Proyecto
```m
backend/
  main.go
  router/ (sensor, alert, ws, devices)
  services/ (sensor_service, alert_service, ws_hub, devices_service)
  database/ (models, migrations)
  internal/ (auth, config, middleware)
  Dockerfile

frontend/
  src/
    components/ (InteractiveMap, AlertsPanel, HistoricalDataPanel, StatsOverview, LoginForm)
    lib/ (ws, axiosClient, useFleetStore, useLocalstorage, useOnlineStatus)
    App.tsx
  Dockerfile

docker-compose.yml
```

### 11.2) Configuración por Entorno (variables)
```
APP_ENV=dev|prod
HTTP_PORT=8080
DB_DSN=postgres://user:pass@db:5432/telemetry?sslmode=disable
JWT_SECRET=...
CORS_ALLOWLIST=https://frontend.local
```

## 12) Riesgos y Mitigaciones

Riesgo	Impacto	Mitigación

Ruido en combustible → falsas alertas	Medio/Alto	Suavizado EMA, ventanas móviles, umbrales con histéresis

Conexiones WS lentas	Medio	Backpressure/colas por conexión y cierre al superar límites

Pérdida de conexión cliente	Bajo	Reconexión backoff, cache local y último estado

Token JWT comprometido	Alto	Expiración corta, rotación, revoke-list temporal en caché

## 14) Retos Encontrados

### Ruido en lecturas de combustible

--- Síntoma: variaciones pequeñas generaban “caídas” falsas.

--- Acción: suavizado (rolling median/EMA) + umbral relativo y ventana de tiempo; histéresis para no flappear.

--- Resultado: caída de falsos positivos y mayor estabilidad en fuel_drop.

### Enmascaramiento de IDs

--- Síntoma: requerimiento de privacidad en UI.

--- Acción: helper maskExternalID(id) aplicando DEV-****-XX; control por rol (admin vs user).

--- Resultado: separación clara de vistas, cumplimiento sin afectar DX.

### Reconexión WS

--- Síntoma: redes inestables cortaban la experiencia.

--- Acción: estrategia de reconexión con backoff + jitter, detección de online/offline, y repoblado de estado desde cache.

--- Resultado: UX robusta; la app “se recupera sola”.

### CORS y Autenticación Cruzada

--- Síntoma: errores 403/upgrade bloqueado en entornos mixtos.

--- Acción: CORS allowlist, headers correctos para upgrade WS, JWT en header/query seguro.

--- Resultado: handshake WS estable y seguro.

### 15) Conclusión

El stack Go + React + WS + (PostgreSQL) dio un MVP performante, mantenible y seguro. El diseño prioriza simplicidad, resiliencia y una ruta. Los retos enfrentados (ruido, reconexión, CORS) se abordaron con técnicas diferentes para su solucion.