import type { Alert, Telemetry } from "./types"

type WSMessage =
  | { channel: "telemetry"; data: Telemetry }
  | { channel: "alert"; data: Alert }

export class FleetWebSocket {
  private ws: WebSocket | null = null
  private reconnectTimeout: number | null = null
  private url: string
  private token: string

  // callbacks separados
  private onAlertCallback: ((alert: Alert) => void) | null = null
  private onTelemetryCallback: ((telemetry: Telemetry) => void) | null = null

  constructor(url: string, token: string) {
    this.url = url
    this.token = token
  }

  connect() {
    try {
      if (this.token === "" || !this.token) return

      this.ws = new WebSocket(`${this.url}?token=${this.token}`)

      this.ws.onopen = () => {
        console.log("[WS] Conectado al servidor de flota")
      }

      this.ws.onmessage = (event) => {
        try {
          const message: WSMessage = JSON.parse(event.data)

          switch (message.channel) {
            case "telemetry":
              this.onTelemetryCallback?.(message.data)
              break

            case "alert":
              this.onAlertCallback?.(message.data)
              break

            default:
              console.warn("[WS] Tipo de mensaje desconocido:", message)
          }
        } catch (error) {
          console.error("[WS] Error al parsear mensaje:", error)
        }
      }

      this.ws.onerror = (error) => {
        console.error("[WS] Error:", error)
      }

      this.ws.onclose = () => {
        console.log("[WS] Conexión cerrada, reconectando en 5s...")
        this.reconnectTimeout = window.setTimeout(() => this.connect(), 5000)
      }
    } catch (error) {
      console.error("[WS] Error al conectar:", error)
    }
  }

  // registrar handlers
  onAlert(callback: (alert: Alert) => void) {
    this.onAlertCallback = callback
  }

  onTelemetry(callback: (telemetry: Telemetry) => void) {
    this.onTelemetryCallback = callback
  }

  disconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }
    this.ws?.close()
    this.ws = null
  }
}
