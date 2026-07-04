'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Store, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

export default function ActualizarPasswordPage() {
  const router = useRouter()
  const [verPassword, setVerPassword] = useState(false)
  const [password, setPassword] = useState('')
  const [confirmar, setConfirmar] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  // Esta página se visita desde el enlace del email de recuperación. El
  // cliente de Supabase detecta el token en la URL al inicializarse y
  // establece la sesión automáticamente (@supabase/ssr guarda esa sesión
  // en cookies), por lo que updateUser() ya puede aplicarse sin pasos extra.
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.')
      return
    }
    if (password !== confirmar) {
      setError('Las contraseñas no coinciden.')
      return
    }

    setPending(true)
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setPending(false)

    if (updateError) {
      setError(
        updateError.message.toLowerCase().includes('session')
          ? 'Este enlace de recuperación expiró o no es válido. Solicita uno nuevo.'
          : updateError.message
      )
      return
    }

    router.push('/login?password_actualizada=1')
  }

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="inline-flex items-center gap-2">
            <Store className="h-7 w-7 text-orange-500" />
            <span className="text-2xl font-bold text-gray-900">
              resuelve<span className="text-orange-500">lo</span>
            </span>
          </Link>
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Crea una nueva contraseña</h1>
          <p className="mt-1 text-sm text-gray-500">Ingresa tu nueva contraseña para continuar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}{' '}
              {error.includes('expiró') && (
                <Link href="/recuperar" className="font-medium underline">
                  Solicitar de nuevo
                </Link>
              )}
            </div>
          )}

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Nueva contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={verPassword ? 'text' : 'password'}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 8 caracteres"
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

          <div>
            <label htmlFor="confirmar" className="block text-sm font-medium text-gray-700 mb-1">
              Confirmar contraseña
            </label>
            <input
              id="confirmar"
              name="confirmar"
              type={verPassword ? 'text' : 'password'}
              required
              minLength={8}
              value={confirmar}
              onChange={(e) => setConfirmar(e.target.value)}
              placeholder="Repite la contraseña"
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600 text-white"
            disabled={pending}
          >
            {pending ? 'Guardando...' : 'Guardar nueva contraseña'}
          </Button>
        </form>
      </div>
    </div>
  )
}
