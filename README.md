# 🚀 Fleet Monitoring – Sistema de Monitoreo IoT en Tiempo Real

Monitoreo inteligente de flotas vehiculares con **alertas predictivas de combustible**, **WebSockets en tiempo real** y **dashboard React** con soporte **offline (PWA)**.

---

## 🧩 Descripción General

Fleet Monitoring es una aplicación **Fullstack** que integra sensores IoT simulados con un backend en **Go (Gin + GORM)** y un frontend en **React + Vite**, permitiendo:

- 📡 Recibir datos de telemetría en tiempo real (posición, velocidad, temperatura, combustible).  
- ⚙️ Analizar tendencias de consumo para emitir **alertas predictivas de bajo combustible**.  
- 🌍 Visualizar los dispositivos en un **mapa interactivo** en tiempo real.  
- 🔔 Notificar alertas automáticamente vía **WebSockets**.  
- 💾 Funcionar en **modo offline** gracias a cache PWA y almacenamiento local.

---


---

## ⚙️ Tecnologías Clave

| Componente | Tecnología | Descripción |
|-------------|-------------|--------------|
| **Backend** | Go + Gin + GORM | API REST + WebSocket + ORM |
| **Base de Datos** | PostgreSQL | Persistencia de usuarios, sensores y alertas |
| **Frontend** | React + TypeScript + Vite | Dashboard con mapa, alertas y telemetría |
| **Mapa** | MapLibre GL JS | Visualización en tiempo real de ubicación |
| **WebSocket** | Go Channels + Gorilla/WebSocket | Comunicación bidireccional y broadcasting |
| **Autenticación** | JWT (HS256) | Acceso seguro a rutas y canales |
| **PWA** | Vite Plugin PWA + Workbox | Cacheo de recursos y modo offline |
| **Simulador IoT** | Python + Requests | Genera lecturas simuladas de sensores |

---

## 🧠 Lógica Principal

### 🔐 Autenticación JWT
- Genera tokens firmados con HMAC-SHA256.  
- Los usuarios autenticados pueden acceder a `/protected/*` y al canal WebSocket.  
- Los tokens expiran automáticamente y se validan en cada conexión.

### ⛽ Análisis Predictivo de Combustible
- Calcula consumo entre lecturas consecutivas.
- Aplica **mediana estadística** para eliminar valores anómalos.  
- Pondera más las **lecturas recientes** para reaccionar a picos de consumo.  
- Emite alerta si la autonomía estimada < 1 hora.

### 🌐 Comunicación en Tiempo Real
- Cada sensor envía datos al endpoint `/api/v1/protected/sensors/data`.  
- El backend procesa y reenvía en tiempo real por WebSocket:  
  - Canal `"telemetry"` → actualiza el mapa y la velocidad.  
  - Canal `"alert"` → envía alertas críticas a administradores.

### 💾 Cache y Modo Offline
- Implementado con **Workbox** y almacenamiento local (localStorage).  
- Si se pierde la conexión, el dashboard sigue mostrando:
  - Últimas posiciones de vehículos.  
  - Historial de alertas y telemetría.  
- La sincronización se retoma automáticamente al reconectarse.

# Usuarios

admin:

admin@example.com
admin123

user:

user@example.com
user123

---