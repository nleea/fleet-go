"use client"

import { useEffect, useRef } from "react"
import maplibregl, { Map, Marker } from "maplibre-gl"
import "maplibre-gl/dist/maplibre-gl.css"
import { Card } from "./ui/card"
import { Badge } from "./ui/badge"
import { Navigation } from "lucide-react"

interface Device {
  id: number
  name: string
  lat: number
  lng: number
  speed: number
  status: "active" | "idle" | "offline"
  fuel: number
}

interface InteractiveMapProps {
  devices: Device[]
  onDeviceSelect: (device: Device) => void
  selectedDeviceId?: number
}

export function InteractiveMap({ devices, onDeviceSelect, selectedDeviceId }: InteractiveMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null)
  const mapRef = useRef<Map | null>(null)
  const markersRef = useRef<Record<number, Marker>>({})

  useEffect(() => {
    if (mapRef.current || !mapContainer.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: "https://demotiles.maplibre.org/style.json",
      center: [devices[0]?.lng || -74.1, devices[0]?.lat || 11.2],
      zoom: 10,
    })

    map.addControl(new maplibregl.NavigationControl(), "top-right")

    mapRef.current = map

    return () => {
      map.remove()
    }
  }, [])

  // Actualiza o crea marcadores en cada cambio de devices
  useEffect(() => {
    if (!mapRef.current) return
    const map = mapRef.current

    devices.forEach((device) => {
      let marker = markersRef.current[device.id]

      // Si no existe, crear marcador
      if (!marker) {
        const el = document.createElement("div")
        el.className =
          "rounded-full border-2 border-white shadow-md cursor-pointer transition-transform hover:scale-125"
        el.style.width = "16px"
        el.style.height = "16px"
        el.style.backgroundColor =
          device.status === "active"
            ? "#22c55e"
            : device.status === "idle"
            ? "#eab308"
            : "#ef4444"

        el.addEventListener("click", () => onDeviceSelect(device))

        marker = new maplibregl.Marker({ element: el })
          .setLngLat([device.lng, device.lat])
          .addTo(map)

        markersRef.current[device.id] = marker
      } else {
        marker.setLngLat([device.lng, device.lat])
      }
    })

    Object.keys(markersRef.current).forEach((id) => {
      if (!devices.some((d) => d.id === Number(id))) {
        markersRef.current[Number(id)].remove()
        delete markersRef.current[Number(id)]
      }
    })

    if (selectedDeviceId) {
      const selected = devices.find((d) => d.id === selectedDeviceId)
      if (selected) map.flyTo({ center: [selected.lng, selected.lat], zoom: 13 })
    }
  }, [devices, selectedDeviceId])

  return (
    <Card className="overflow-hidden relative">
      <div ref={mapContainer} className="w-full h-[600px]" />

      {selectedDeviceId && (
        <div className="absolute bottom-4 left-4 bg-white/90 dark:bg-slate-800/90 p-3 rounded-lg shadow-lg space-y-1">
          <div className="text-sm font-semibold">
            {devices.find((d) => d.id === selectedDeviceId)?.name}
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Navigation className="h-3 w-3" />
            <span>
              {devices.find((d) => d.id === selectedDeviceId)?.speed.toFixed(1)} km/h • ⛽{" "}
              {devices.find((d) => d.id === selectedDeviceId)?.fuel.toFixed(1)}%
            </span>
          </div>
          <Badge variant="outline" className="text-xs">
            {devices.find((d) => d.id === selectedDeviceId)?.status}
          </Badge>
        </div>
      )}
    </Card>
  )
}
