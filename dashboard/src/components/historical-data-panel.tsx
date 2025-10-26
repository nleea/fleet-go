"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select"
import { Badge } from "./ui/badge"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Brush,
} from "recharts"
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

interface CustomTooltipProps {
  active?: any;
  payload?: any;
  label?: any;
}

const CustomTooltip = ({ active, payload, label }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg p-3 animate-in fade-in-0 zoom-in-95 duration-200">
        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-2">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-slate-600 dark:text-slate-400">{entry.name}:</span>
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {typeof entry.value === "number" ? entry.value.toFixed(1) : entry.value}
              {entry.name?.includes("Velocidad") ? " km/h" : "%"}
            </span>
          </div>
        ))}
      </div>
    )
  }
  return null
}

export function HistoricalDataPanel({ deviceId, deviceName }: HistoricalDataPanelProps) {
  const [timeRange, setTimeRange] = useState("0")
  const [localTelemetry, setLocalTelemetry] = useState<Telemetry[]>([])
  const [activeChart, setActiveChart] = useState<string>("velocidad")
  const [, setHoveredPoint] = useState<any>(null)

  // Usar el store de Zustand
  const { telemetry, isOnline } = useFleetStore()

  // Cargar telemetría del store
  useEffect(() => {
    const data = telemetry[String(deviceId)] || []
    setLocalTelemetry(data)
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
      const avg = (key: keyof Telemetry) => items.reduce((sum, i) => sum + (i[key] as number), 0) / items.length

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

    const filtered = cutoff ? chartData.filter((d) => d.timestamp.getTime() >= cutoff) : chartData

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

  const stats = useMemo(() => {
    if (filteredData.length === 0) return { avgSpeed: 0, avgFuel: 0 }

    const avgSpeed = filteredData.reduce((sum, d) => sum + d.velocidad, 0) / filteredData.length
    const avgFuel = filteredData.reduce((sum, d) => sum + d.combustible, 0) / filteredData.length

    return { avgSpeed, avgFuel }
  }, [filteredData])

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
              <p className="text-lg font-medium mb-2">{isOnline ? "Esperando datos..." : "No hay datos en caché"}</p>
              <p className="text-sm">
                {isOnline
                  ? "Los datos aparecerán cuando el dispositivo envíe telemetría"
                  : "Los datos se mostrarán cuando vuelva la conexión"}
              </p>
            </div>
          </div>
        ) : (
          <Tabs value={activeChart} onValueChange={setActiveChart} className="space-y-4">
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
                  <AreaChart
                    data={filteredData}
                    onMouseMove={(e) => setHoveredPoint((e as any).activePayload?.[0]?.payload)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    <defs>
                      <linearGradient id="colorVelocidad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-slate-200 dark:stroke-slate-700"
                      opacity={0.5}
                    />
                    <XAxis dataKey="timestamp" className="text-xs" tick={{ fontSize: 12 }} tickMargin={10} />
                    <YAxis
                      label={{ value: "km/h", angle: -90, position: "insideLeft" }}
                      tick={{ fontSize: 12 }}
                      tickMargin={10}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ stroke: "#3b82f6", strokeWidth: 2, strokeDasharray: "5 5" }}
                    />
                    <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
                    <ReferenceLine
                      y={stats.avgSpeed}
                      stroke="#94a3b8"
                      strokeDasharray="3 3"
                      label={{ value: "Promedio", position: "right", fill: "#64748b", fontSize: 12 }}
                    />
                    {filteredData.length > 20 && (
                      <Brush dataKey="timestamp" height={30} stroke="#3b82f6" fill="rgba(59, 130, 246, 0.1)" />
                    )}
                    <Area
                      type="monotone"
                      dataKey="velocidad"
                      stroke="#3b82f6"
                      strokeWidth={3}
                      fill="url(#colorVelocidad)"
                      name="Velocidad (km/h)"
                      animationDuration={1500}
                      animationEasing="ease-in-out"
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
                    />
                  </AreaChart>
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
                    {Math.max(...filteredData.map((d) => d.velocidad)).toFixed(1)} km/h
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
                  <AreaChart
                    data={filteredData}
                    onMouseMove={(e) => setHoveredPoint((e as any).activePayload?.[0]?.payload)}
                    onMouseLeave={() => setHoveredPoint(null)}
                  >
                    <defs>
                      <linearGradient id="colorCombustible" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-slate-200 dark:stroke-slate-700"
                      opacity={0.5}
                    />
                    <XAxis dataKey="timestamp" className="text-xs" tick={{ fontSize: 12 }} tickMargin={10} />
                    <YAxis
                      label={{ value: "%", angle: -90, position: "insideLeft" }}
                      domain={[0, 100]}
                      tick={{ fontSize: 12 }}
                      tickMargin={10}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{ stroke: "#10b981", strokeWidth: 2, strokeDasharray: "5 5" }}
                    />
                    <Legend wrapperStyle={{ paddingTop: "20px" }} iconType="circle" />
                    <ReferenceLine
                      y={stats.avgFuel}
                      stroke="#94a3b8"
                      strokeDasharray="3 3"
                      label={{ value: "Promedio", position: "right", fill: "#64748b", fontSize: 12 }}
                    />
                    <ReferenceLine
                      y={20}
                      stroke="#ef4444"
                      strokeDasharray="3 3"
                      label={{ value: "Nivel bajo", position: "right", fill: "#ef4444", fontSize: 12 }}
                    />
                    {filteredData.length > 20 && (
                      <Brush dataKey="timestamp" height={30} stroke="#10b981" fill="rgba(16, 185, 129, 0.1)" />
                    )}
                    <Area
                      type="monotone"
                      dataKey="combustible"
                      stroke="#10b981"
                      strokeWidth={3}
                      fill="url(#colorCombustible)"
                      name="Combustible (%)"
                      animationDuration={1500}
                      animationEasing="ease-in-out"
                      dot={false}
                      activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
                    />
                  </AreaChart>
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
                    {Math.min(...filteredData.map((d) => d.combustible)).toFixed(1)}%
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
