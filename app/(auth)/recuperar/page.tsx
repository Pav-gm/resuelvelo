'use client'

import Link from 'next/link'
import { useActionState } from 'react'
import { Store, ArrowLeft, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { solicitarRecuperacion } from '@/app/(auth)/actions'

export default function RecuperarPage() {
  const [state, action, pending] = useActionState(solicitarRecuperacion, null)
  const enviado = state && 'success' in state

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
          <h1 className="mt-4 text-xl font-semibold text-gray-900">Recupera tu contraseña</h1>
          <p className="mt-1 text-sm text-gray-500">
            Te enviaremos un enlace para restablecerla
          </p>
        </div>

        {enviado ? (
          <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-6 text-center">
            <MailCheck className="mx-auto h-8 w-8 text-green-600" />
            <p className="mt-3 text-sm font-medium text-green-800">
              Si existe una cuenta con ese email, te enviamos un enlace para restablecer tu contraseña.
            </p>
            <p className="mt-1 text-xs text-green-700">Revisa también la carpeta de spam.</p>
          </div>
        ) : (
          <form action={action} className="space-y-4">
            {state?.error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {state.error}
              </div>
            )}

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

            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white"
              disabled={pending}
            >
              {pending ? 'Enviando...' : 'Enviar enlace de recuperación'}
            </Button>
          </form>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link href="/login" className="inline-flex items-center gap-1 font-medium text-orange-500 hover:underline">
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver a ingresar
          </Link>
        </p>
      </div>
    </div>
  )
}
