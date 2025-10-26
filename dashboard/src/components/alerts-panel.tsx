"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { AlertTriangle, Bell, CheckCircle2 } from "lucide-react"
import { useLocalStore } from "../lib/useLocalstorage";
import { useFleetStore } from "../lib/useFleetStore"
import type { Alert } from "../lib/useFleetStore"

interface AlertsPanelProps {
  isAdmin: boolean
}

export function AlertsPanel({ isAdmin }: AlertsPanelProps) {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const { alerts: allAlerts } = useFleetStore()

  const { value: token } = useLocalStore("access_token", "", {
    encrypted: true,
    ttlMs: 24 * 60 * 60 * 1000,
  })

  useEffect(() => {
    if (!isAdmin || !token) return
    setAlerts(allAlerts)

  }, [isAdmin, token, allAlerts])

  const handleAcknowledge = (alertId: string) => {
    setAlerts((prev) => prev.map((alert) => (alert.id === alertId ? { ...alert, acknowledged: true } : alert)))
  }

  if (!isAdmin) {
    return null
  }

  const unacknowledgedCount = alerts.filter((a) => !a.acknowledged).length

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            <CardTitle>Alertas del Sistema</CardTitle>
          </div>
          {unacknowledgedCount > 0 && (
            <Badge variant="destructive" className="animate-pulse">
              {unacknowledgedCount} nuevas
            </Badge>
          )}
        </div>
        <CardDescription>Alertas de autonomía crítica (menos de 1 hora)</CardDescription>
      </CardHeader>
      <CardContent className="max-h-96 overflow-y-auto" >
        {alerts.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
            <p>No hay alertas activas</p>
          </div>
        ) : (
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`p-4 rounded-lg border ${alert.acknowledged
                    ? "bg-muted/50 border-muted"
                    : "bg-red-50 dark:bg-red-950/20 border-red-200 dark:border-red-900"
                  }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle
                        className={`h-4 w-4 ${alert.acknowledged ? "text-muted-foreground" : "text-red-500"}`}
                      />
                      <span className="font-semibold">{alert.deviceName}</span>
                      <Badge variant={alert.acknowledged ? "secondary" : "destructive"}>
                        {alert.autonomyHours.toFixed(1)}h restantes
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">{alert.timestamp.toLocaleString("es-ES")}</p>
                  </div>
                  {!alert.acknowledged && (
                    <Button size="sm" variant="outline" onClick={() => handleAcknowledge(alert.id)}>
                      Reconocer
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
