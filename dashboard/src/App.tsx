"use client"

import { useState, useEffect } from "react"
import { InteractiveMap } from "./components/interactive-map"
import { HistoricalDataPanel } from "./components/historical-data-panel"
import { AlertsPanel } from "./components/alerts-panel"
import { StatsOverview } from "./components/stats-overview"
import { LoginForm } from "./components/login-form"
import { Button } from "./components/ui/button"
import { Badge } from "./components/ui/badge"
import { Shield, UserIcon, LogOut, WifiOff, Wifi, RefreshCw } from "lucide-react"
import { useLocalStore } from "./lib/useLocalstorage"
import { useFleetStore } from "./lib/useFleetStore"
import { Workbox } from "workbox-window"
import { localStore } from "./lib/localstore"
import { DevicesPanel } from "./components/device-panel";

function App() {
  const [user, setUser] = useState<{ username: string; role: "admin" | "user" } | null>(null)
  const [selectedDeviceId, setSelectedDeviceId] = useState<number | undefined>()
  const [isSyncing, setIsSyncing] = useState(false)
  const [metrics, setMetrics] = useState({ total: 0, active: 0, avgSpeed: 0, avgFuel: 0 })
  const [mappedDevices, setMappedDevices] = useState<{
    id: number
    name: string
    lat: number
    lng: number
    speed: number
    fuel: number
    status: "active" | "idle" | "offline"
  }[]>([])

  const { value: token } = useLocalStore("access_token", "", {
    encrypted: true,
    ttlMs: 24 * 60 * 60 * 1000,
  })

  const { value: role } = useLocalStore("role", "", {
    encrypted: false,
    ttlMs: 24 * 60 * 60 * 1000,
  })

  const {
    devices,
    initDashboard,
    isOnline,
    lastSync,
    setOnlineStatus,
    syncAll,
    telemetry,
    connectWebSocket,
    disconnectWebSocket
  } = useFleetStore()


  useEffect(() => {
    if ("serviceWorker" in navigator) {
      const wb = new Workbox("/sw.js", { scope: "/" })
      wb.register()
        .then(() => console.log("[PWA] Service Worker registrado con Workbox ✅"))
        .catch((err) => console.error("[PWA] Error al registrar:", err))
    }

    if (token && role) {
      setUser({ username: "autologin", role: role as "admin" | "user" })
    }

  }, [role, token])

  useEffect(() => {
    if (!devices || devices.length === 0) return

    const mapped = devices.map((device) => ({
      id: device.id,
      name: role === "admin" ? device.external_id : device.masked_id,
      lat: device.lat,
      lng: device.lng,
      speed: device.speed,
      fuel: device.fuel_level,
      status: device.status as "active" | "idle" | "offline",
    }))

    const total = mapped.length
    const active = mapped.filter((d) => d.status === "active").length
    const avgSpeed = Math.round(mapped.filter((d) => d.status === "active")
      .reduce((sum, d) => sum + d.speed, 0) / (active || 1))
    const avgFuel = Math.round(mapped.reduce((sum, d) => sum + d.fuel, 0) / (total || 1))

    setMetrics({ total, active, avgSpeed, avgFuel })
  }, [devices, role])

  useEffect(() => {
    const handleOnline = () => {
      setOnlineStatus(true)
      if (token && role) {
        syncAll(token, role)
      }
    }

    const handleOffline = () => {
      setOnlineStatus(false)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    setOnlineStatus(navigator.onLine)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [token, role, syncAll, setOnlineStatus])

  useEffect(() => {
    if (!token || !role) return
    initDashboard(token, role)
  }, [token, role, initDashboard])

  useEffect(() => {
  if (token && isOnline) {
    connectWebSocket(token, role)
  }
  return () => disconnectWebSocket()
}, [token, isOnline, connectWebSocket, disconnectWebSocket, role])

  useEffect(() => {
    if (!token || !role || !isOnline) return

    const interval = setInterval(() => {
      console.log("[AUTO-SYNC] Sincronizando...")
      syncAll(token, role)
    }, 5 * 60 * 1000)

    return () => clearInterval(interval)
  }, [token, role, isOnline, syncAll])

  const handleLogin = (userData: { username: string; role: "admin" | "user" }) => {
    setUser(userData)
  }

  const handleLogout = () => {
    setUser(null)
    localStore.clear()
    disconnectWebSocket()
  }

  const handleManualSync = async () => {
    if (!token || !role || isSyncing || !isOnline) return

    setIsSyncing(true)
    await syncAll(token, role)
    setIsSyncing(false)
  }

  useEffect(() => {
  const mapped = devices.map((device) => {
    const latestTelemetry = telemetry?.[device.id]?.slice(-1)[0]

    return {
      id: device.id,
      name: role === "admin" ? device.external_id : device.masked_id,
      lat: latestTelemetry?.lat ?? device.lat,
      lng: latestTelemetry?.lng ?? device.lng,
      speed: latestTelemetry?.speed ?? device.speed ?? 0,
      fuel: latestTelemetry?.fuel_level ?? device.fuel_level ?? 0,
      status: device.status as "active" | "idle" | "offline",
    }
  })

  setMappedDevices(() => mapped)
}, [devices, telemetry, role])

  const selectedDevice = mappedDevices.find((d) => d.id === selectedDeviceId)

  const totalDevices = mappedDevices.length
  const activeDevices = mappedDevices.filter((d) => d.status === "active").length

  if (!user) {
    return <LoginForm onLogin={handleLogin} />
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-white/95 dark:bg-slate-900/95 backdrop-blur">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Dashboard IoT</h1>
              <p className="text-sm text-slate-600 dark:text-slate-400">Sistema de monitoreo en tiempo real</p>
            </div>

            <div className="flex items-center gap-3">
              {/* Indicador Online/Offline */}
              <Badge variant={isOnline ? "default" : "destructive"} className="gap-1.5">
                {isOnline ? (
                  <>
                    <Wifi className="w-3 h-3" />
                    <span>Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3" />
                    <span>Offline</span>
                  </>
                )}
              </Badge>

              {/* Botón Sync */}
              {isOnline && (
                <Button variant="outline" size="sm" onClick={handleManualSync} disabled={isSyncing} className="gap-2">
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
                  Sync
                </Button>
              )}

              {/* Rol */}
              <Badge variant="outline" className="gap-1.5">
                {user.role === "admin" ? (
                  <>
                    <Shield className="w-3 h-3" />
                    <span>Administrador</span>
                  </>
                ) : (
                  <>
                    <UserIcon className="w-3 h-3" />
                    <span>Usuario</span>
                  </>
                )}
              </Badge>

              <Button variant="outline" size="sm" onClick={handleLogout} className="gap-2 bg-transparent">
                <LogOut className="w-4 h-4" />
                Salir
              </Button>
            </div>
          </div>

          {/* Última sincronización */}
          {lastSync && (
            <div className="text-xs text-slate-500 mt-2">
              Última sincronización: {new Date(lastSync).toLocaleString()}
            </div>
          )}
        </div>
      </header>

      {/* Banner Offline */}
      {!isOnline && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-b border-yellow-200 dark:border-yellow-800">
          <div className="container mx-auto px-4 py-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200 flex items-center gap-2">
              <WifiOff className="w-4 h-4" />
              Trabajando sin conexión. Los datos se sincronizarán cuando vuelva la conexión.
            </p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Stats Overview */}
          <StatsOverview
            totalDevices={totalDevices}
            activeDevices={activeDevices}
            avgSpeed={metrics.avgSpeed}
            avgFuel={metrics.avgFuel}
          />

          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Map and Charts */}
            <div className="lg:col-span-2 space-y-6">
              <InteractiveMap
                devices={mappedDevices as any}
                onDeviceSelect={(device) => setSelectedDeviceId(Number(device.id))}
                selectedDeviceId={selectedDeviceId}
              />

              {selectedDevice && (
                <HistoricalDataPanel deviceId={selectedDevice.id} deviceName={selectedDevice.name} />
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Device List */}
              <DevicesPanel devices={mappedDevices} selectedDeviceId={selectedDeviceId} onDeviceSelect={setSelectedDeviceId} />
              {/* Alerts Panel */}
              {user.role === "admin" && <AlertsPanel isAdmin={true} />}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default App