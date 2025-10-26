import { Card, CardContent, CardHeader, CardTitle } from "./ui/card"
import { Activity, Navigation, Fuel, MapPin } from "lucide-react"

interface StatsOverviewProps {
  totalDevices: number
  activeDevices: number
  avgSpeed: number
  avgFuel: number
}

export function StatsOverview({ totalDevices, activeDevices, avgSpeed, avgFuel }: StatsOverviewProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Dispositivos</CardTitle>
          <MapPin className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalDevices}</div>
          <p className="text-xs text-muted-foreground">{activeDevices} activos</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Dispositivos Activos</CardTitle>
          <Activity className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{activeDevices}</div>
          <p className="text-xs text-muted-foreground">
            {((activeDevices / totalDevices) * 100).toFixed(0)}% del total
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Velocidad Promedio</CardTitle>
          <Navigation className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{avgSpeed} km/h</div>
          <p className="text-xs text-muted-foreground">De dispositivos activos</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Combustible Promedio</CardTitle>
          <Fuel className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{avgFuel}L</div>
          <p className="text-xs text-muted-foreground">Nivel actual</p>
        </CardContent>
      </Card>
    </div>
  )
}
