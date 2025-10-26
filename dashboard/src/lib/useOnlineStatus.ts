import { useEffect, useState, useRef } from "react"
import { useFleetStore } from "./useFleetStore"

export function useOnlineStatus(token: string) {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine)
  const syncAll = useFleetStore((s) => s.syncAll)
  const lastSyncRef = useRef<number>(0)

  useEffect(() => {
    if (!token) return

    const handleOnline = async () => {
      setIsOnline(true)

      const now = Date.now()
      if (now - lastSyncRef.current < 5000) {
        console.debug("[NETWORK] Reconectado recientemente, omitiendo sync.")
        return
      }

      lastSyncRef.current = now
      console.info("[NETWORK] Conexión restaurada 🔄 Sincronizando...")

      try {
        await syncAll(token, 'admin')
        console.info("[NETWORK] Sincronización completada ✅")
      } catch (error) {
        console.error("[NETWORK] Error durante la sincronización:", error)
      }
    }

    const handleOffline = () => {
      setIsOnline(false)
      console.warn("[NETWORK] Conexión perdida ⚠️")
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Estado inicial
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [token, syncAll])

  return isOnline
}
