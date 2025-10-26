"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Badge } from "./ui/badge"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts"
import { TrendingUp, Fuel, WifiOff } from "lucide-react"
import { useFleetStore } from "../lib/useFleetStore"

interface Telemetry {
  device_id: string
  lat: number
  lng: number
  speed: number
  fuel_level: number
  temperature: number
  ts: string
}

interface HistoricalDataPanelProps {
  deviceId: number
  deviceName: string
}

export function HistoricalDataPanel({ deviceId, deviceName }: HistoricalDataPanelProps) {
  const [timeRange, setTimeRange] = useState("0")
  const [localTelemetry, setLocalTelemetry] = useState<Telemetry[]>([])

  // Usar el store de Zustand
  const { telemetry, isOnline } = useFleetStore()

  // Cargar telemetría del store
  useEffect(() => {
    const data = telemetry[String(deviceId)] || []
    setLocalTelemetry(data)
    console.log(`[TELEMETRY] 📊 Cargados ${data.length} puntos para device ${deviceId}`)
  }, [deviceId, telemetry])

  // Agrupar por minuto para suavizar la frecuencia de actualización
  const groupedData = useMemo(() => {
    if (!localTelemetry.length) return []

    const bucketSizeMs = 60 * 1000 // 1 minuto
    const groups: Record<number, Telemetry[]> = {}

    localTelemetry.forEach((t) => {
      const ts = new Date(t.ts).getTime()
      const bucket = Math.floor(ts / bucketSizeMs) * bucketSizeMs
      if (!groups[bucket]) groups[bucket] = []
      groups[bucket].push(t)
    })

    // Promediar los valores dentro de cada minuto
    const averaged = Object.entries(groups).map(([bucket, items]) => {
      const avg = (key: keyof Telemetry) =>
        items.reduce((sum, i) => sum + (i[key] as number), 0) / items.length

      return {
        timestamp: new Date(Number(bucket)),
        velocidad: avg("speed"),
        combustible: avg("fuel_level"),
        temperatura: avg("temperature"),
      }
    })

    // Ordenar por tiempo ascendente
    return averaged.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime())
  }, [localTelemetry])

  // Usar datos crudos o agrupados según el rango
  const baseData = timeRange === "0" ? localTelemetry : groupedData

  // Preparar datos para el gráfico
  const chartData = useMemo(() => {
    return baseData.map((t) => ({
      timestamp: new Date(t.timestamp ?? t.ts),
      velocidad: t.speed ?? t.velocidad,
      combustible: t.fuel_level ?? t.combustible,
      temperatura: t.temperature ?? t.temperatura,
    }))
  }, [baseData])

  // Filtrar por rango de tiempo
  const filteredData = useMemo(() => {
    if (chartData.length === 0) return []

    const now = Date.now()
    let cutoff: number | null = null

    switch (timeRange) {
      case "24h":
        cutoff = now - 24 * 60 * 60 * 1000
        break
      case "7d":
        cutoff = now - 7 * 24 * 60 * 60 * 1000
        break
      case "30d":
        cutoff = now - 30 * 24 * 60 * 60 * 1000
        break
      default:
        cutoff = null
    }

    const filtered = cutoff
      ? chartData.filter((d) => d.timestamp.getTime() >= cutoff)
      : chartData

    return filtered.map((d) => ({
      timestamp: d.timestamp.toLocaleTimeString("es-ES", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      velocidad: d.velocidad,
      combustible: d.combustible,
      temperatura: d.temperatura,
    }))
  }, [chartData, timeRange])


  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Datos Históricos</CardTitle>
            <CardDescription>{deviceName}</CardDescription>
          </div>

          <div className="flex items-center gap-2">
            {/* Indicador offline */}
            {!isOnline && (
              <Badge variant="outline" className="gap-1.5 text-yellow-600">
                <WifiOff className="w-3 h-3" />
                Caché ({localTelemetry.length})
              </Badge>
            )}

            {/* Selector de rango */}
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Rango" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Todos</SelectItem>
                <SelectItem value="24h">Últimas 24h</SelectItem>
                <SelectItem value="7d">Últimos 7 días</SelectItem>
                <SelectItem value="30d">Últimos 30 días</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {filteredData.length === 0 ? (
          <div className="h-80 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <p className="text-lg font-medium mb-2">
                {isOnline ? "Esperando datos..." : "No hay datos en caché"}
              </p>
              <p className="text-sm">
                {isOnline
                  ? "Los datos aparecerán cuando el dispositivo envíe telemetría"
                  : "Los datos se mostrarán cuando vuelva la conexión"}
              </p>
            </div>
          </div>
        ) : (
          <Tabs defaultValue="velocidad" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="velocidad" className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Velocidad
              </TabsTrigger>
              <TabsTrigger value="combustible" className="flex items-center gap-2">
                <Fuel className="h-4 w-4" />
                Combustible
              </TabsTrigger>
            </TabsList>

            <TabsContent value="velocidad" className="space-y-4">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                    <XAxis
                      dataKey="timestamp"
                      className="text-xs"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      label={{ value: "km/h", angle: -90, position: "insideLeft" }}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="velocidad"
                      stroke="#3b82f6"
                      strokeWidth={2}
                      name="Velocidad (km/h)"
                      dot={false}
                      animationDuration={300}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Estadísticas */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Promedio</p>
                  <p className="text-2xl font-bold">
                    {(filteredData.reduce((sum, d) => sum + d.velocidad, 0) / filteredData.length).toFixed(1)} km/h
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Máxima</p>
                  <p className="text-2xl font-bold">
                    {Math.max(...filteredData.map(d => d.velocidad)).toFixed(1)} km/h
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Puntos</p>
                  <p className="text-2xl font-bold">{filteredData.length}</p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="combustible" className="space-y-4">
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={filteredData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-slate-200 dark:stroke-slate-700" />
                    <XAxis
                      dataKey="timestamp"
                      className="text-xs"
                      tick={{ fontSize: 12 }}
                    />
                    <YAxis
                      label={{ value: "%", angle: -90, position: "insideLeft" }}
                      domain={[0, 100]}
                      tick={{ fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        border: '1px solid #e2e8f0',
                        borderRadius: '6px'
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="combustible"
                      stroke="#10b981"
                      strokeWidth={2}
                      name="Combustible (%)"
                      dot={false}
                      animationDuration={300}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Estadísticas */}
              <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Actual</p>
                  <p className="text-2xl font-bold text-green-600">
                    {filteredData[filteredData.length - 1]?.combustible.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Promedio</p>
                  <p className="text-2xl font-bold">
                    {(filteredData.reduce((sum, d) => sum + d.combustible, 0) / filteredData.length).toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-400">Mínimo</p>
                  <p className="text-2xl font-bold text-red-600">
                    {Math.min(...filteredData.map(d => d.combustible)).toFixed(1)}%
                  </p>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  )
}