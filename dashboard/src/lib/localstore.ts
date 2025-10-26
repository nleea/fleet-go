import localforage from "localforage"
import CryptoJS from "crypto-js"

const SECRET_KEY = import.meta.env.VITE_APP_SECRET_KEY || "simon-secret-key"

interface StoredData<T> {
  value: T
  expiresAt?: number // timestamp de expiración (opcional)
}

// Configuración base de localforage
localforage.config({
  name: "simon_movilidad",
  storeName: "cache_data",
  description: "Datos persistentes del sistema Simon Movilidad",
})

export const localStore = {
  /**
   * Guarda un valor
   */
  async set<T>(key: string, value: T, ttlMs?: number, encrypted = false): Promise<void> {
    const payload: StoredData<T> = { value }
    if (ttlMs) payload.expiresAt = Date.now() + ttlMs

    let toStore: string = JSON.stringify(payload)
    if (encrypted) {
      toStore = CryptoJS.AES.encrypt(toStore, SECRET_KEY).toString()
    }

    await localforage.setItem(key, toStore)
  },

  /**
   * Obtiene un valor
   */
  async get<T>(key: string, encrypted = false): Promise<T | null> {
    try {
      let data = await localforage.getItem<string>(key)
      if (!data) return null

      if (encrypted) {
        const bytes = CryptoJS.AES.decrypt(data, SECRET_KEY)
        data = bytes.toString(CryptoJS.enc.Utf8)
      }

      const parsed: StoredData<T> = JSON.parse(data as string)
      if (parsed.expiresAt && parsed.expiresAt < Date.now()) {
        await localforage.removeItem(key)
        return null
      }

      return parsed.value
    } catch (error) {
      console.error(`[localStore] Error leyendo ${key}:`, error)
      return null
    }
  },

  /**
   * Elimina una clave
   */
  async remove(key: string): Promise<void> {
    await localforage.removeItem(key)
  },

  /**
   * Limpia todo el almacenamiento local
   */
  async clear(): Promise<void> {
    await localforage.clear()
  },

  /**
   * Lista todas las claves guardadas (útil para debugging)
   */
  async keys(): Promise<string[]> {
    return await localforage.keys()
  },
}
