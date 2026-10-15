import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getSolicitudComparador } from '@/lib/data'
import ComparadorSolicitud from '@/components/marketplace/ComparadorSolicitud'

/** Fecha de validez (YYYY-MM-DD) como dd/mm/aaaa, sin desfase de zona horaria. */
function fechaValidez(fecha: string): string {
  const [anio, mes, dia] = fecha.slice(0, 10).split('-')
  return `${dia}/${mes}/${anio}`
}

/**
 * Comparador del comprador: la autorización real vive en la lectura
 * (`getSolicitudComparador`), que devuelve null cuando la solicitud no existe o
 * no es visible por RLS; en ese caso se responde 404.
 */
export default async function SolicitudComparadorPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { id } = await params
  const data = await getSolicitudComparador(id)
  if (!data) notFound()

  const { solicitud } = data
  const cerrada = data.cotizaciones.some((cot) => cot.estado === 'aceptada')

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="break-words text-2xl font-bold text-gray-900">{solicitud.titulo}</h1>
        {cerrada && (
          <span className="rounded-full bg-gray-200 px-3 py-1 text-xs font-medium text-gray-600">
            Cerrada
          </span>
        )}
      </div>
      {solicitud.notas && (
        <p className="mt-2 break-words [overflow-wrap:anywhere] text-sm text-gray-700">
          {solicitud.notas}
        </p>
      )}
      {solicitud.fecha_requerida && (
        <p className="mt-1 text-sm text-gray-500">
          {`Fecha requerida: ${fechaValidez(solicitud.fecha_requerida)}`}
        </p>
      )}

      {data.cotizaciones.length === 0 ? (
        <p className="mt-6 rounded-2xl border bg-white p-8 text-center text-sm text-gray-400">
          Todavía no hay cotizaciones para esta solicitud.
        </p>
      ) : (
        <ComparadorSolicitud data={data} />
      )}
    </div>
  )
}
