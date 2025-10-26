"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { AlertTriangle, Bell, CheckCircle2, Clock } from "lucide-react"
import { useLocalStore } from "../lib/useLocalstorage"
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
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Bell className="h-4 w-4 text-primary" />
            </div>
            <CardTitle className="text-base font-semibold">Alertas</CardTitle>
          </div>
          {unacknowledgedCount > 0 && (
            <Badge variant="destructive" className="h-5 px-2 text-xs font-medium">
              {unacknowledgedCount}
            </Badge>
          )}
        </div>
        <CardDescription className="text-xs">Autonomía crítica detectada</CardDescription>
      </CardHeader>
      <CardContent className="max-h-96 overflow-y-auto">
        {alerts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-3 p-2.5 rounded-full bg-green-500/10">
              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-500" />
            </div>
            <p className="text-sm font-medium text-foreground/80">Sin alertas activas</p>
            <p className="text-xs text-muted-foreground mt-1">Todos los dispositivos operan normalmente</p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className={`group relative overflow-hidden rounded-lg border transition-all ${
                  alert.acknowledged
                    ? "border-border/40 bg-muted/30"
                    : "border-red-200/60 dark:border-red-900/40 bg-red-50/50 dark:bg-red-950/10"
                }`}
              >
                {/* Subtle left accent bar */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 ${
                    alert.acknowledged ? "bg-muted-foreground/20" : "bg-red-500"
                  }`}
                />

                <div className="pl-4 pr-3 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      {/* Device name and status */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <AlertTriangle
                          className={`h-3.5 w-3.5 flex-shrink-0 ${
                            alert.acknowledged ? "text-muted-foreground/60" : "text-red-600 dark:text-red-500"
                          }`}
                        />
                        <span className="text-sm font-semibold text-foreground truncate">{alert.deviceName}</span>
                      </div>

                      {/* Alert message */}
                      <p className="text-xs text-muted-foreground leading-relaxed mb-2">{alert.message}</p>

                      {/* Timestamp and autonomy info */}
                      <div className="flex items-center gap-3 text-xs text-muted-foreground/80">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>
                            {alert.timestamp.toLocaleString("es-ES", {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "2-digit",
                              month: "short",
                            })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span
                            className={`font-medium ${
                              alert.acknowledged ? "text-muted-foreground" : "text-red-600 dark:text-red-500"
                            }`}
                          >
                            {alert.autonomyHours.toFixed(1)}h
                          </span>
                          <span>restantes</span>
                        </div>
                      </div>
                    </div>

                    {/* Action button */}
                    {!alert.acknowledged && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 px-2.5 text-xs font-medium hover:bg-background/80 flex-shrink-0"
                        onClick={() => handleAcknowledge(alert.id)}
                      >
                        Reconocer
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
