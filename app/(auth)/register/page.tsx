'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Store, Building2, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { UserRole } from '@/types'

export default function RegisterPage() {
  const searchParams = useSearchParams()
  const rolInicial = (searchParams.get('rol') as UserRole) ?? 'comprador'
  const [rol, setRol] = useState<UserRole>(rolInicial)
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
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Creá tu cuenta</h1>
          <p className="mt-1 text-sm text-gray-500">Es gratis, siempre</p>
        </div>

        {/* Selector de rol */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setRol('comprador')}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-all',
              rol === 'comprador'
                ? 'border-orange-400 bg-orange-50 text-orange-700 ring-2 ring-orange-400/30'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            )}
          >
            <User className="h-6 w-6" />
            Comprador
          </button>
          <button
            type="button"
            onClick={() => setRol('proveedor')}
            className={cn(
              'flex flex-col items-center gap-2 rounded-xl border p-4 text-sm font-medium transition-all',
              rol === 'proveedor'
                ? 'border-orange-400 bg-orange-50 text-orange-700 ring-2 ring-orange-400/30'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            )}
          >
            <Building2 className="h-6 w-6" />
            Proveedor
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
              {rol === 'proveedor' ? 'Nombre de la empresa' : 'Nombre completo'}
            </label>
            <input
              id="nombre"
              type="text"
              required
              placeholder={rol === 'proveedor' ? 'Ferretería Ejemplo S.R.L.' : 'Juan Pérez'}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
            />
          </div>

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
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              placeholder="Mínimo 8 caracteres"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            disabled={loading}
          >
            {loading ? 'Creando cuenta...' : `Registrarme como ${rol}`}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          ¿Ya tenés cuenta?{' '}
          <Link href="/login" className="font-medium text-orange-500 hover:underline">
            Ingresá
          </Link>
        </p>
      </div>
    </div>
  )
}
