import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { Building2, MapPin, BadgeCheck, Package } from 'lucide-react'
import ErrorCarga from '@/components/marketplace/ErrorCarga'
import { getProveedores, getFeedbackDeProveedor } from '@/lib/data'
import type { FeedbackPublico } from '@/types'

const TITULO_GENERICO = 'Proveedor — Resuélvelo'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const proveedores = await getProveedores().catch(() => null)
  const proveedor = proveedores?.find((p) => p.id === id)
  if (!proveedor?.nombre_empresa) {
    return { title: TITULO_GENERICO }
  }
  return { title: `${proveedor.nombre_empresa} — Resuélvelo` }
}

function Estrellas({ calificacion }: { calificacion: number }) {
  return (
    <span className="text-yellow-400" aria-hidden="true">
      {'★'.repeat(calificacion)}
      <span className="text-gray-300">{'★'.repeat(5 - calificacion)}</span>
    </span>
  )
}

export default async function ProveedorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const proveedores = await getProveedores().catch(() => null)
  if (!proveedores) return <ErrorCarga />

  const proveedor = proveedores.find((p) => p.id === id)
  if (!proveedor) notFound()

  const feedback = await getFeedbackDeProveedor(proveedor.id).catch(() => null)
  if (!feedback) return <ErrorCarga />

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="rounded-2xl bg-white border shadow-sm p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-500">
            <Building2 className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <h1 className="text-xl font-bold text-gray-900">{proveedor.nombre_empresa}</h1>
              {proveedor.verificado && (
                <BadgeCheck className="h-5 w-5 shrink-0 text-blue-500" aria-label="Verificado" />
              )}
            </div>
            {proveedor.ciudad && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-gray-400">
                <MapPin className="h-3 w-3" />
                {proveedor.ciudad}
              </p>
            )}
            {proveedor.descripcion && (
              <p className="mt-3 text-sm text-gray-500">{proveedor.descripcion}</p>
            )}
          </div>
        </div>

        <div className="mt-4 flex items-center justify-between border-t pt-4">
          <span className="flex items-center gap-1.5 text-sm text-gray-600">
            <Package className="h-4 w-4 text-gray-400" />
            {proveedor.productos_count} producto{proveedor.productos_count !== 1 ? 's' : ''}
          </span>
          <Link
            href={`/catalogo?proveedor=${proveedor.id}`}
            className="text-sm font-medium text-orange-500 hover:underline"
          >
            Ver catálogo
          </Link>
        </div>
      </div>

      {/* Reseñas públicas: solo datos de reseña y autor anonimizado (C-LECTURA). */}
      <section className="mt-8" aria-label="Reseñas del proveedor">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-bold text-gray-900">Reseñas de compradores</h2>
          {feedback.conteo > 0 && (
            <p className="text-sm text-gray-500">
              <span className="font-semibold text-gray-900">{feedback.promedio.toFixed(2)}</span>{' '}
              <Estrellas calificacion={Math.round(feedback.promedio)} />{' '}
              ({feedback.conteo} reseña{feedback.conteo !== 1 ? 's' : ''})
            </p>
          )}
        </div>

        {feedback.conteo === 0 ? (
          <div className="mt-4 rounded-2xl bg-white border p-8 text-center text-gray-400">
            <p className="text-sm">Este proveedor aún no tiene reseñas.</p>
            <p className="mt-1 text-xs">
              Los compradores pueden dejar una reseña tras confirmar la recepción de una cotización.
            </p>
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {feedback.reseñas.map((reseña: FeedbackPublico) => (
              <li key={reseña.id} className="rounded-2xl bg-white border shadow-sm px-6 py-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-900">{reseña.autor_anonimo}</span>
                  <span className="text-xs text-gray-400">
                    {new Date(reseña.created_at).toLocaleDateString('es-DO', {
                      year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <Estrellas calificacion={reseña.calificacion} />
                  <span className="sr-only">{`${reseña.calificacion} de 5 estrellas`}</span>
                </div>
                {reseña.comentario && (
                  <p className="mt-2 text-sm text-gray-700">{reseña.comentario}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}