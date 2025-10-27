import type { Alert, Telemetry } from "./types"

type WSMessage =
  | { channel: "telemetry"; data: Telemetry }
  | { channel: "alert"; data: Alert }

export class FleetWebSocket {
  private ws: WebSocket | null = null
  private url: string
  private token: string
  private shouldReconnect = true

  private reconnectTimer: number | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 10
  private baseBackoffMs = 800

  private onAlertCallback: ((alert: Alert) => void) | null = null
  private onTelemetryCallback: ((telemetry: Telemetry) => void) | null = null

  // reconexiones del websocket
  private onlineHandler = () => this.tryReconnectNow("online")
  private visibilityHandler = () => {
    if (!document.hidden) this.tryReconnectNow("tab-visible")
  }

  constructor(url: string, token: string) {
    this.url = url
    this.token = token

    window.addEventListener("online", this.onlineHandler)
    document.addEventListener("visibilitychange", this.visibilityHandler)
  }

  private buildURL() {
    const isAbsolute = /^wss?:\/\//i.test(this.url)
    if (isAbsolute) return `${this.url}?token=${encodeURIComponent(this.token)}`
    const proto = location.protocol === "https:" ? "wss" : "ws"
    const base = `${proto}://${location.host}`
    return `${base}${this.url.startsWith("/") ? "" : "/"}${this.url}?token=${encodeURIComponent(this.token)}`
  }

  connect() {
    try {
      if (this.token === "" || !this.token) return

      if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
        return
      }

      this.ws = new WebSocket(this.buildURL())

      this.ws.onopen = () => {
        console.log("[WS] Conectado al servidor de flota")
        this.reconnectAttempts = 0
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

      this.ws.onclose = (ev) => {

        if (!this.shouldReconnect) {
          console.log("[WS] Cerrado intencionalmente")
          return
        }

        if (ev.code === 1000) {
          console.log("[WS] Cerrado por servidor (1000). Reintentando suave…")
        } else if (ev.code === 4001 || ev.code === 4401) {
          console.warn("[WS] Token inválido/expirado. No reconectar hasta refresh.")
          return
        } else {
          console.warn(`[WS] onclose code=${ev.code}, reason=${ev.reason || "n/a"}`)
        }

        this.scheduleReconnect()
      }

    } catch (error) {
      console.error("[WS] Error al conectar:", error)
    }
  }

  private scheduleReconnect() {
    if (!this.shouldReconnect) return
    if (this.reconnectTimer) return

    if (!navigator.onLine || document.hidden) {
      // si hay red reintenta si no, no
      return
    }

    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[WS] Máximos intentos alcanzados. Deteniendo reconexiones.")
      return
    }

    this.reconnectAttempts += 1
    const jitter = Math.random() * 400
    const delay = Math.min(15000, this.baseBackoffMs * 2 ** (this.reconnectAttempts - 1)) + jitter
    console.log(`[WS] Reintentando en ${Math.round(delay)}ms (intento ${this.reconnectAttempts})`)

    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null
      this.connect()
    }, delay)
  }

  private tryReconnectNow(reason: string) {
    if (!this.shouldReconnect) return
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return
    console.log("[WS] tryReconnectNow por:", reason)
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.connect()
  }

  // registrar handlers
  onAlert(callback: (alert: Alert) => void) {
    this.onAlertCallback = callback
    return () => { if (this.onAlertCallback === callback) this.onAlertCallback = null }
  }
  onTelemetry(callback: (telemetry: Telemetry) => void) {
    this.onTelemetryCallback = callback
    return () => { if (this.onTelemetryCallback === callback) this.onTelemetryCallback = null }
  }

  disconnect() {
    this.shouldReconnect = false
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    window.removeEventListener("online", this.onlineHandler)
    document.removeEventListener("visibilitychange", this.visibilityHandler)

    try { this.ws?.close(1000, "client disconnect") } catch {
      //cierra con 100 el socket 
    }
    this.ws = null
    this.onAlertCallback = null
    this.onTelemetryCallback = null
  }
}
