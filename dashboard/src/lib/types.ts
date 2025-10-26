export interface Device {
  id: string
  name: string
  lat: number
  lng: number
  speed: number
  status: "active" | "inactive" | "warning"
  lastUpdate: Date
}

export interface SpeedRecord {
  timestamp: Date
  speed: number
  deviceId: string
}

export interface Alert {
  id: string
  device_id: string
  deviceName: string
  type: "speed" | "offline" | "geofence" | "low_autonomy"
  severity: "low" | "medium" | "high" | "critical"
  message: string
  timestamp: Date
  acknowledged: boolean
  autonomyHours: number
  payload: string;
}

export type UserRole = "admin" | "user"

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

export interface LoginResponse {
  user: User
  token: string
}

export interface Telemetry {
  device_id: number
  lat: number
  lng: number
  speed: number
  fuel: number
  temperature: number
  ts: string
}

