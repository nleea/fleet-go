"use client"

import { useState } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Badge } from "./ui/badge"
import { Search, X, Grid3x3 } from "lucide-react"
// import type {  Device} from "../lib/useFleetStore";

interface Device {
  id: number
  name: string
  lat: number
  lng: number
  speed: number
  fuel: number
  status: "active" | "idle" | "offline"
}

interface DevicesPanelProps {
  devices: Device[]
  selectedDeviceId?: number
  onDeviceSelect: (deviceId: number) => void
}

export function DevicesPanel({ devices, selectedDeviceId, onDeviceSelect }: DevicesPanelProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "idle" | "offline">("all")

  const previewDevices = devices.slice(0, 5)
  const hasMore = devices.length > 5

  const filteredDevices = devices.filter((device) => {
    const matchesSearch = device.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === "all" || device.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-500"
      case "idle":
        return "bg-yellow-500"
      case "offline":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "active":
        return "Activo"
      case "idle":
        return "Inactivo"
      case "offline":
        return "Desconectado"
      default:
        return status
    }
  }

  const statusCounts = {
    all: devices.length,
    active: devices.filter((d) => d.status === "active").length,
    idle: devices.filter((d) => d.status === "idle").length,
    offline: devices.filter((d) => d.status === "offline").length,
  }

  return (
    <>
      <div className="bg-white dark:bg-slate-800 rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">Dispositivos ({devices.length})</h3>
          {hasMore && (
            <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(true)} className="text-xs gap-1">
              <Grid3x3 className="w-3 h-3" />
              Ver todos
            </Button>
          )}
        </div>

        <div className="space-y-2">
          {previewDevices.map((device) => (
            <button
              key={device.id}
              onClick={() => onDeviceSelect(device.id)}
              className={`w-full p-3 rounded-lg border text-left transition-colors ${
                selectedDeviceId === device.id
                  ? "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800"
                  : "hover:bg-slate-50 dark:hover:bg-slate-700"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{device.name}</span>
                <div className={`w-2 h-2 rounded-full ${getStatusColor(device.status)}`} />
              </div>
              <div className="text-xs text-slate-600 dark:text-slate-400">
                {device.speed?.toFixed(1)} km/h • {device.fuel?.toFixed(1)}%
              </div>
            </button>
          ))}
        </div>

        {hasMore && (
          <Button variant="outline" size="sm" onClick={() => setIsModalOpen(true)} className="w-full mt-3 text-xs">
            Ver {devices.length - 5} dispositivos más
          </Button>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-lg font-semibold">Todos los dispositivos</h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  {filteredDevices.length} de {devices.length} dispositivos
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Search and Filters */}
            <div className="p-4 border-b space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar dispositivo..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Status filters */}
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={statusFilter === "all" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("all")}
                  className="text-xs"
                >
                  Todos ({statusCounts.all})
                </Button>
                <Button
                  variant={statusFilter === "active" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("active")}
                  className="text-xs"
                >
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-1.5" />
                  Activos ({statusCounts.active})
                </Button>
                <Button
                  variant={statusFilter === "idle" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("idle")}
                  className="text-xs"
                >
                  <div className="w-2 h-2 rounded-full bg-yellow-500 mr-1.5" />
                  Inactivos ({statusCounts.idle})
                </Button>
                <Button
                  variant={statusFilter === "offline" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setStatusFilter("offline")}
                  className="text-xs"
                >
                  <div className="w-2 h-2 rounded-full bg-red-500 mr-1.5" />
                  Desconectados ({statusCounts.offline})
                </Button>
              </div>
            </div>

            {/* Device List */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredDevices.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p>No se encontraron dispositivos</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredDevices.map((device) => (
                    <button
                      key={device.id}
                      onClick={() => {
                        onDeviceSelect(device.id)
                        setIsModalOpen(false)
                      }}
                      className={`p-3 rounded-lg border text-left transition-colors ${
                        selectedDeviceId === device.id
                          ? "bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800"
                          : "hover:bg-slate-50 dark:hover:bg-slate-700"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-medium text-sm">{device.name}</span>
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            device.status === "active"
                              ? "border-green-500 text-green-700 dark:text-green-400"
                              : device.status === "idle"
                                ? "border-yellow-500 text-yellow-700 dark:text-yellow-400"
                                : "border-red-500 text-red-700 dark:text-red-400"
                          }`}
                        >
                          {getStatusLabel(device.status)}
                        </Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          Velocidad: {device.speed?.toFixed(1)} km/h
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          Combustible: {device.fuel?.toFixed(1)}%
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-500">
                          Lat: {device.lat.toFixed(4)}, Lng: {device.lng.toFixed(4)}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
