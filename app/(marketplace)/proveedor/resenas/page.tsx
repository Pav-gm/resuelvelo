import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProveedorDelUsuario, getFeedbackDeProveedor } from '@/lib/data'
import { formatearFecha } from '@/lib/utils'
import ResponderResenaForm from '@/components/marketplace/ResponderResenaForm'
import type { ResumenFeedbackProveedor } from '@/types'

export default async function ResenasProveedorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const proveedor = await getProveedorDelUsuario()
  if (!proveedor) redirect('/register?rol=proveedor')

  // Un error de lectura de reseñas se maneja con el estado vacío, sin exponer
  // detalles internos.
  let resenas: ResumenFeedbackProveedor | null = null
  try {
    resenas = await getFeedbackDeProveedor(proveedor.id)
  } catch {
    resenas = null
  }

  const lista = resenas?.reseñas ?? []

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Reseñas</h1>
      <p className="mb-6 text-sm text-gray-500">Lo que dicen los compradores sobre tu empresa.</p>

      {lista.length === 0 ? (
        <div className="rounded-2xl bg-white border p-12 text-center text-gray-400">
          <p className="text-lg font-medium">Aún no tienes reseñas.</p>
        </div>
      ) : (
        <div className="divide-y rounded-2xl bg-white border shadow-sm">
          {lista.map((resena) => (
            <div key={resena.id} className="px-4 py-4 sm:px-6">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-900">{resena.autor_anonimo}</span>
                <span className="text-xs text-gray-400">
                  {formatearFecha(resena.created_at, { conHora: true })}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="text-yellow-400" aria-hidden="true">
                  {'★'.repeat(resena.calificacion)}
                  <span className="text-gray-300">{'★'.repeat(5 - resena.calificacion)}</span>
                </span>
                <span className="sr-only">{`${resena.calificacion} de 5 estrellas`}</span>
              </div>
              {resena.comentario && (
                <p className="mt-2 text-sm text-gray-700">{resena.comentario}</p>
              )}
              <div className="mt-3">
                <ResponderResenaForm feedbackId={resena.id} respuesta={resena.respuesta} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
