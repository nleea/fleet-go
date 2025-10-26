import { useEffect, useState, useCallback } from "react"
import { localStore } from "./localstore"

type UseLocalStoreOptions = {
  encrypted?: boolean
  ttlMs?: number
}

export function useLocalStore<T>(
  key: string,
  defaultValue: T,
  options: UseLocalStoreOptions = {}
) {
  const { encrypted = false, ttlMs } = options
  const [value, setValue] = useState<T>(defaultValue)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const stored = await localStore.get<T>(key, encrypted)
        if (mounted) setValue(stored ?? defaultValue)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => {
      mounted = false
    }
  }, [key, encrypted, defaultValue])

  const save = useCallback(
    async (newValue: T) => {
      setValue(newValue)
      await localStore.set<T>(key, newValue, ttlMs, encrypted)
      window.dispatchEvent(new CustomEvent("localStoreUpdated", { detail: { key, value: newValue } }))
    },
    [key, ttlMs, encrypted]
  )

  const remove = useCallback(async () => {
    await localStore.remove(key)
    setValue(defaultValue)
    window.dispatchEvent(new CustomEvent("localStoreUpdated", { detail: { key, value: defaultValue } }))
  }, [key, defaultValue])

  useEffect(() => {
    const handleStorage = async (event: StorageEvent) => {
      if (event.key === key && event.newValue) {
        const newValue = await localStore.get<T>(key, encrypted)
        setValue(newValue ?? defaultValue)
      }
    }

    const handleCustomEvent = async (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.key === key) {
        setValue(detail.value)
      }
    }

    window.addEventListener("storage", handleStorage)
    window.addEventListener("localStoreUpdated", handleCustomEvent)
    return () => {
      window.removeEventListener("storage", handleStorage)
      window.removeEventListener("localStoreUpdated", handleCustomEvent)
    }
  }, [key, encrypted, defaultValue])

  return { value, setValue: save, remove, loading }
}
