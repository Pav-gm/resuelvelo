'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Store, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function LoginPage() {
  const [verPassword, setVerPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    // TODO: integrar con Supabase auth
    setTimeout(() => setLoading(false), 1000)
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Store className="h-7 w-7 text-orange-500" />
            <span className="text-2xl font-bold text-gray-900">
              resuelve<span className="text-orange-500">lo</span>
            </span>
          </Link>
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Bienvenido de vuelta</h1>
          <p className="mt-1 text-sm text-gray-500">Ingresá a tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              placeholder="tu@email.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <Link href="/recuperar" className="text-xs text-orange-500 hover:underline">
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
            <div className="relative">
              <input
                id="password"
                type={verPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 pr-10 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                onClick={() => setVerPassword(!verPassword)}
              >
                {verPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            disabled={loading}
          >
            {loading ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          ¿No tenés cuenta?{' '}
          <Link href="/register" className="font-medium text-orange-500 hover:underline">
            Registrate gratis
          </Link>
        </p>
      </div>
    </div>
  )
}
