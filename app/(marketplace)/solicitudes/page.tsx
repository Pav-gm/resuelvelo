import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getCotizacionesDelComprador, getSolicitudesDelComprador } from '@/lib/data'
import type { Cotizacion } from '@/types'

interface EstadoSolicitud {
  etiqueta: string
  clase: string
}

/**
 * Estado derivado de las cotizaciones de la solicitud: pendiente si queda
 * alguna pendiente, respondida si hay ofertas y cerrada si no queda ninguna
 * cotización activa.
 */
function estadoDeSolicitud(cotizaciones: Cotizacion[]): EstadoSolicitud {
  if (cotizaciones.some((cot) => cot.estado === 'pendiente')) {
    return { etiqueta: 'Pendiente', clase: 'bg-yellow-100 text-yellow-700' }
  }
  if (cotizaciones.some((cot) => cot.estado === 'respondida')) {
    return { etiqueta: 'Respondida', clase: 'bg-blue-100 text-blue-700' }
  }
  return { etiqueta: 'Cerrada', clase: 'bg-gray-200 text-gray-600' }
}

/** Fecha de creación como día/mes/año. */
function fecha(fechaISO: string): string {
  return new Date(fechaISO).toLocaleDateString('es-DO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default async function SolicitudesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [solicitudes, cotizaciones] = await Promise.all([
    getSolicitudesDelComprador(user.id),
    getCotizacionesDelComprador(user.id),
  ])

  const cotizacionesPorSolicitud = new Map<string, Cotizacion[]>()
  for (const cot of cotizaciones) {
    if (!cot.solicitud_id) continue
    const acumuladas = cotizacionesPorSolicitud.get(cot.solicitud_id) ?? []
    acumuladas.push(cot)
    cotizacionesPorSolicitud.set(cot.solicitud_id, acumuladas)
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis solicitudes</h1>
          <p className="mt-1 text-sm text-gray-500">
            Solicitudes enviadas a varios proveedores y sus ofertas.
          </p>
        </div>
        <Link
          href="/solicitudes/nueva"
          className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
        >
          Nueva solicitud
        </Link>
      </div>

      {solicitudes.length === 0 ? (
        <div className="rounded-2xl border bg-white p-12 text-center text-gray-400">
          <p className="text-lg font-medium">Sin solicitudes</p>
          <p className="mt-1 text-sm">
            Crea una solicitud para pedir cotización a varios proveedores.
          </p>
          <Link
            href="/solicitudes/nueva"
            className="mt-4 inline-block rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
          >
            Crear una solicitud
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {solicitudes.map((solicitud) => {
            const estado = estadoDeSolicitud(cotizacionesPorSolicitud.get(solicitud.id) ?? [])
            return (
              <div
                key={solicitud.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-white px-6 py-4 shadow-sm"
              >
                <Link href={`/solicitudes/${solicitud.id}`} className="min-w-0 flex-1">
                  <span className="block break-words font-semibold text-gray-900 hover:underline">
                    {solicitud.titulo}
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-400">
                    {fecha(solicitud.created_at)}
                  </span>
                </Link>
                <span className={`rounded-full px-3 py-1 text-xs font-medium ${estado.clase}`}>
                  {estado.etiqueta}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
