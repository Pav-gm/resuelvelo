'use client'

import Link from 'next/link'
import { useActionState, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Store, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { iniciarSesion } from '@/app/(auth)/actions'

function LoginForm() {
  const searchParams = useSearchParams()
  const passwordActualizada = searchParams.get('password_actualizada')
  const [verPassword, setVerPassword] = useState(false)
  const [state, action, pending] = useActionState(iniciarSesion, null)

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
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Bienvenido de vuelta</h1>
          <p className="mt-1 text-sm text-gray-500">Ingresa a tu cuenta</p>
        </div>

        {passwordActualizada && (
          <div className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            Tu contraseña se actualizó. Ingresa con la nueva.
          </div>
        )}

        {state?.error && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {state.error}
          </div>
        )}

        <form action={action} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
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
                name="password"
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
            disabled={pending}
          >
            {pending ? 'Ingresando...' : 'Ingresar'}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          ¿No tienes cuenta?{' '}
          <Link href="/register" className="font-medium text-orange-500 hover:underline">
            Regístrate gratis
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-500 border-t-transparent" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
