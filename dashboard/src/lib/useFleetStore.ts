import { create } from "zustand"
import { localStore } from "./localstore"
import axiosClient from "./axiosClient"
import { FleetWebSocket } from "./ws"

export interface Device {
  id: number
  external_id: string
  masked_id: string
  status: string
  lat: number
  lng: number
  speed: number
  fuel_level: number
  temperature: number
  last_update?: string
}

export interface Alert {
  id: string
  deviceId: string
  deviceName: string
  message: string
  timestamp: Date
  acknowledged: boolean
  autonomyHours: number
}

interface TelemetryPoint {
  device_id: string
  lat: number
  lng: number
  speed: number
  fuel_level: number
  temperature: number
  ts: string
}

interface FleetState {
  isOnline: boolean
  devices: Device[]
  alerts: Alert[]
  telemetry: Record<string, TelemetryPoint[]>
  lastSync: number | null
  ws: FleetWebSocket | null

  initDashboard: (token: string, role: string) => Promise<void>
  syncAll: (token: string, role: string) => Promise<void>
  setTelemetry: (deviceId: string, data: TelemetryPoint[]) => Promise<void>
  addTelemetryPoint: (deviceId: string, point: TelemetryPoint) => Promise<void>
  updateDeviceRealtime: (deviceId: number, telemetry: Partial<TelemetryPoint>) => void
  updateTelemetryCache: (deviceId: number, telemetry: Partial<TelemetryPoint>) => void
  addAlertpoint(alert: any): Promise<void>
  setOnlineStatus: (status: boolean) => void
  clearCache: () => Promise<void>
  connectWebSocket: (token: string, rol: string) => void
  disconnectWebSocket: () => void
}

let flushTimer: number | null = null
let lastSnapshot: Record<string, TelemetryPoint[]> | null = null

const scheduleTelemetryFlush = (snapshot: Record<string, TelemetryPoint[]>) => {
  lastSnapshot = snapshot
  if (flushTimer) return
  flushTimer = window.setTimeout(async () => {
    try { await localStore.set("telemetry_global", lastSnapshot, 6 * 60 * 60 * 1000) }
    finally { flushTimer = null; lastSnapshot = null }
  }, 1000)
}

export const useFleetStore = create<FleetState>((set, get) => ({
  isOnline: navigator.onLine,
  devices: [],
  alerts: [],
  telemetry: {},
  lastSync: null,
  ws: null as FleetWebSocket | null,


  connectWebSocket: (token: string, rol: string) => {
    if (get().ws) return
    const ws = new FleetWebSocket(`ws://localhost:8000/api/v1/ws`, token)
    ws.connect()
    if (rol == 'admin') {
      ws.onAlert((alertData) => {

        const payload = JSON.parse(alertData.payload)

        const alertBody = {
          id: String(alertData.id),
          deviceId: String(alertData.device_id),
          deviceName: payload.device_name ?? "Desconocido",
          message: alertData.message,
          timestamp: new Date(alertData.timestamp),
          acknowledged: !!payload.acknowledged,
          autonomyHours: Number(payload.autonomy_hours ?? 0),
        }
        get().addAlertpoint(alertBody)

      })
    }

    ws.onTelemetry((data) => {
      const deviceId = String(data.device_id)

      const point = {
        device_id: deviceId,
        lat: data.lat,
        lng: data.lng,
        speed: data.speed,
        fuel_level: data.fuel,
        temperature: data.temperature || 0,
        ts: new Date(data.ts).toISOString()
      }

      get().addTelemetryPoint(deviceId, point)
      get().updateDeviceRealtime(Number(deviceId), point)
    })

    set({ ws })
  },
  disconnectWebSocket: () => {
    const ws = get().ws
    if (ws) ws.disconnect()
    set({ ws: null })
  },

  setOnlineStatus: (status) => {
    set({ isOnline: status })
    console.log(`[NETWORK] Estado: ${status ? "🟢 Online" : "🔴 Offline"}`)
  },

  initDashboard: async (token, role) => {
    console.log("[INIT] Inicializando dashboard...")

    const [cachedDevices, cachedAlerts, cachedTelemetry, cachedLastSync] = await Promise.all([
      localStore.get<Device[]>("devices"),
      localStore.get<Alert[]>("alerts"),
      localStore.get<Record<string, TelemetryPoint[]>>("telemetry_global"),
      localStore.get<number>("last_sync"),
    ])

    const hasCache = cachedDevices?.length || cachedAlerts?.length || cachedTelemetry

    if (hasCache) {
      console.log("[CACHE] Cargando datos desde caché...")
      set({
        devices: cachedDevices ?? [],
        alerts: cachedAlerts ?? [],
        telemetry: cachedTelemetry ?? {},
        lastSync: cachedLastSync ?? null,
      })
    } else {
      console.warn("[CACHE] No hay datos previos en caché")
      set({ devices: [], alerts: [], telemetry: {}, lastSync: null })
    }

    if (navigator.onLine) {
      console.log("[ONLINE] Sincronizando con backend...")
      try {
        await get().syncAll(token, role)

        const now = Date.now()
        await localStore.set("last_sync", now)
        set({ lastSync: now })
        console.log(`[SYNC] Dashboard actualizado (${new Date(now).toLocaleString()})`)
      } catch (err) {
        console.error("[SYNC] Error durante sync inicial:", err)
      }
    } else {
      console.warn("[OFFLINE] Sin conexión, usando cache existente")
    }
  },

  syncAll: async (token) => {
    if (!navigator.onLine) {
      console.log("[OFFLINE] Sincronización postergada")
      return
    }

    console.log("[SYNC] Sincronizando datos...")

    try {
      const devRes = await axiosClient.get("/protected/devices/all", {
        headers: { Authorization: `Bearer ${token}` },
      })

      const devices: Device[] = devRes.data.map((device: any) => ({
        id: device.ID,
        external_id: device.ExternalID,
        masked_id: device.MaskedID,
        status: "active",
        lat: 0,
        lng: 0,
        speed: 0,
        fuel_level: 100,
        temperature: 0,
        last_update: new Date().toISOString(),
      }))

      const now = Date.now()


      set({ devices, lastSync: now })

      await Promise.all([
        localStore.set("devices", devices, 24 * 60 * 60 * 1000),
        localStore.set("last_sync", now, 24 * 60 * 60 * 1000),
      ])

    } catch (err) {
      console.error("[SYNC] Error:", err)
    }
  },

  setTelemetry: async (deviceId, data) => {
    const current = get().telemetry
    const updated = { ...current, [deviceId]: data }

    set({ telemetry: updated })

    await localStore.set("telemetry_global", updated, 6 * 60 * 60 * 1000)
    await localStore.set(`telemetry_${deviceId}`, data, 6 * 60 * 60 * 1000)
  },

  addTelemetryPoint: async (deviceId, point) => {
    const current = get().telemetry
    const deviceData = current[deviceId] ?? []
    const updatedList = [...deviceData, point].slice(-1000)
    const updated = { ...current, [deviceId]: updatedList }

    set({ telemetry: updated })
    scheduleTelemetryFlush(updated)
    await localStore.set(`telemetry_${deviceId}`, updatedList, 6 * 60 * 60 * 1000)
  },

  addAlertpoint: async (alert) => {
    const current = get().alerts
    const updated = [...current, alert]

    set({ alerts: updated })

    await localStore.set("alerts", updated, 24 * 60 * 60 * 1000)
  },


  updateDeviceRealtime: (deviceId, telemetry) => {

    set((state) => {
      const updatedDevices = state.devices.map((device) => {
        if (Number(device.id) === Number(deviceId)) {
          const updated: Device = {
            ...device,
            lat: telemetry.lat ?? device.lat,
            lng: telemetry.lng ?? device.lng,
            speed: telemetry.speed ?? device.speed,
            fuel_level: telemetry.fuel_level ?? device.fuel_level,
            temperature: telemetry.temperature ?? device.temperature,
            status: (telemetry.speed ?? 0) > 0 ? "active" : "idle",
            last_update: new Date().toISOString(),
          }
          return updated
        }
        return device
      })
      localStore.set("devices", updatedDevices, 24 * 60 * 60 * 1000)

      return { devices: updatedDevices }
    })
  },

  updateTelemetryCache: (deviceId, data) => {
    set((state) => {
      const prevPoints = state.telemetry[deviceId] ?? []
      const updatedPoints = [...prevPoints.slice(-49), data]
      const newTelemetry = { ...state.telemetry, [deviceId]: updatedPoints }

      localStore.set("telemetry_global", newTelemetry)
      return { telemetry: newTelemetry }
    })
  },


  clearCache: async () => {
    await Promise.all([
      localStore.remove("devices"),
      localStore.remove("alerts"),
      localStore.remove("telemetry_global"),
      localStore.remove("last_sync"),
    ])

    set({
      devices: [],
      alerts: [],
      telemetry: {},
      lastSync: null,
    })

    console.log("[CACHE] Limpiado")
  },
}))