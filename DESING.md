# DESIGN.md — Prueba Técnica Full Stack - Simon Movilidad

## 📘 Resumen del Proyecto
Este proyecto implementa un sistema completo de monitoreo IoT para flotas vehiculares.  
Permite visualizar la ubicación, velocidad, nivel de combustible y temperatura de cada dispositivo en tiempo real, junto con un historial de datos y alertas predictivas.  

El sistema cuenta con:
- **Backend**: API REST + WebSocket (para ingestión y transmisión de telemetría)
- **Frontend Web (React + Zustand)**: Dashboard interactivo con mapa, gráficos históricos y alertas
- **Offline-first**: Cache persistente y reconexión automática
- **Roles**: Usuario normal vs administrador con permisos y visibilidad diferenciada
- **Mobile (opcional)**: Vista simplificada de lectura en React Native

---

## ⚙️ Arquitectura General

### Backend
- **Lenguaje:** Go (o Python/Django)
- **Base de datos:** PostgreSQL
- **WebSocket:** Canal principal `/api/v1/ws` para envío de telemetría en tiempo real
- **JWT manual:** Generación y validación de tokens sin librerías externas
- **Alertas predictivas:**  
  Cálculo automático cuando `fuel_level` < autonomía de 1 hora.  
  Las alertas se emiten solo a usuarios con rol **admin**.

### Frontend Web
- **Framework:** React + TypeScript (Next.js)
- **Estado global:** Zustand  
- **Librerías principales:**
  - `recharts` → visualización de velocidad, combustible y temperatura
  - `lucide-react` → íconos
  - `shadcn/ui` → UI moderna y ligera
- **WebSocket centralizado:** `FleetWebSocket` conecta una sola vez y distribuye la telemetría en `useFleetStore`.
- **Modo Offline:**  
  Implementado con `useLocalStore` y `localStore` personalizados.  
  Los datos se guardan en caché y persisten incluso sin conexión.
- **Mapa en tiempo real:**  
  Muestra todos los dispositivos actualizados en tiempo real.
- **Roles y privacidad:**  
  - **Admin:** ve alertas, IDs reales, combustible.  
  - **Usuario normal:** ve mapa y posición, IDs enmascarados.

---

## 🧠 Decisiones Técnicas

### 1. WebSocket único global
En lugar de abrir un socket por dispositivo, se creó **una conexión única** que envía todos los eventos y los distribuye mediante Zustand.  
➡️ Menor consumo, menor latencia y arquitectura más limpia.

### 2. Suavizado de telemetría (EMA + agrupación)
Se aplica **Exponential Moving Average (EMA)** con `α=0.3` y agrupación por minuto para evitar ruido y fluctuaciones erráticas.  
Esto mantiene la experiencia fluida y evita picos artificiales.

### 3. Cache persistente (Offline-first)
Cada módulo (devices, telemetry, alerts) se guarda localmente con TTL, permitiendo:
- Continuar usando el dashboard sin conexión.
- Sincronizar automáticamente al volver online.

### 4. Manejo de roles y seguridad
El backend genera JWT con claims (`username`, `role`).  
El frontend usa el claim `role` para filtrar las alertas y enmascarar los IDs de dispositivo:


### 5. Diseño de componentes
Cada vista está desacoplada:
- `InteractiveMap` → muestra posiciones
- `HistoricalDataPanel` → gráficos históricos
- `AlertsPanel` → alertas predictivas
- `StatsOverview` → resumen de datos
- `useFleetStore` → fuente única de verdad (Zustand store)

---

## 📈 Estrategia de Offline y Reconexión

- Detecta estado de red (`navigator.onLine`)
- Si se pierde conexión:
  - Muestra badge de “Caché”
  - Mantiene últimos datos del store
  - Intenta reconectar al WS cada 5s
- Al reconectarse:
  - Re-sincroniza devices y alertas
  - Actualiza puntos de telemetría faltantes

---

## 🔔 Alertas Predictivas

- El backend calcula la tasa de consumo por minuto.  
- Si la autonomía estimada < 60 min, se emite una alerta:
  ```json
  { "type": "fuel_low", "device_id": 2, "payload": { "remaining": "45min" } }
