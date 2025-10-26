"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "./ui/button"
import { Input } from "./ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card"
import { Label } from "./ui/label"
import axiosClient from '../lib/axiosClient'
import { useLocalStore } from "../lib/useLocalstorage";

interface LoginFormProps {
  onLogin: (user: { username: string; role: "admin" | "user" }) => void
}

export function LoginForm({ onLogin }: LoginFormProps) {
  const [username, setUsername] = useState("admin@example.com")
  const [password, setPassword] = useState("admin123")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const { setValue: settoken, } = useLocalStore("access_token", "", {
    encrypted: true,
    ttlMs: 24 * 60 * 60 * 1000,
  })
  const { setValue: setrole } = useLocalStore("role", "", {
    encrypted: false,
    ttlMs: 24 * 60 * 60 * 1000,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError("")

    try {
      const { data: { token } } = await axiosClient.post('/auth/login', { email: username, password });

      if (token) {
        settoken(token)
        const { data: { user_id, role } } = await axiosClient.get('/protected/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })
        setrole(role)
        onLogin({ username: user_id, role: role })
      } else {
        setError("Credenciales inválidas")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center">Dashboard IoT</CardTitle>
          <CardDescription className="text-center">Ingresa tus credenciales para acceder al sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Usuario</Label>
              <Input
                id="username"
                type="text"
                placeholder="Ingresa tu usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                type="password"
                placeholder="Ingresa tu contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && <div className="text-sm text-red-500 text-center">{error}</div>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
            </Button>
            <div className="text-xs text-muted-foreground text-center mt-4">
              Demo: admin/admin (admin) o cualquier otro usuario
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
