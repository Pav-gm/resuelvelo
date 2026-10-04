import { CheckCircle2, Circle, XCircle } from 'lucide-react'
import type { ActorVenta, EstadoCotizacion } from '@/types'

/**
 * Línea de seguimiento reutilizable para ambas vistas:
 * Aceptada → Despachada → Recibida. Muestra la fecha de despacho
 * (despachada_at) cuando esté disponible y, si la venta se canceló,
 * quién canceló solo cuando cancelada_por lo permita identificar.
 * El historial permanece visible en los estados terminales.
 */
interface LineaSeguimientoProps {
  estado: EstadoCotizacion
  despachadaAt?: string | null
  canceladaPor?: ActorVenta | null
}

const PASOS = [
  { id: 'aceptada', label: 'Aceptada' },
  { id: 'despachada', label: 'Despachada' },
  { id: 'recibida', label: 'Recibida' },
] as const

type PasoId = (typeof PASOS)[number]['id']

const ESTADOS_CON_SEGUIMIENTO: EstadoCotizacion[] = [
  'aceptada',
  'despachada',
  'recibida',
  'cancelada',
]

function formatoFecha(valor: string): string {
  return new Date(valor).toLocaleString('es-DO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function textoCancelacion(canceladaPor?: ActorVenta | null): string {
  if (canceladaPor === 'comprador') return 'Cancelada por el comprador'
  if (canceladaPor === 'proveedor') return 'Cancelada por el proveedor'
  return 'Cancelada'
}

export default function LineaSeguimiento({
  estado,
  despachadaAt,
  canceladaPor,
}: LineaSeguimientoProps) {
  if (!ESTADOS_CON_SEGUIMIENTO.includes(estado)) return null

  const cancelada = estado === 'cancelada'

  // Progresión basada solo en datos: cancelar_venta exige estado «aceptada»
  // o «despachada», y el comprador solo puede cancelar antes del despacho,
  // así que una cancelación siempre deja «aceptada» alcanzado; «despachada»
  // solo se marca como alcanzada si hay fecha de despacho registrada.
  const alcanzado: Record<PasoId, boolean> = {
    aceptada: ['aceptada', 'despachada', 'recibida'].includes(estado) || cancelada,
    despachada:
      ['despachada', 'recibida'].includes(estado) || (cancelada && despachadaAt != null),
    recibida: estado === 'recibida',
  }

  return (
    <div className="px-6 py-4 border-t bg-gray-50/50">
      <p className="mb-2 text-xs font-medium text-gray-500">Seguimiento</p>
      <div className="flex items-start gap-2" role="list" aria-label="Seguimiento de la cotización">
        {PASOS.map((paso, i) => {
          const hecho = alcanzado[paso.id]
          return (
            <div key={paso.id} role="listitem" className="flex items-start gap-2">
              {i > 0 && (
                <span
                  aria-hidden="true"
                  className={`mt-2 h-px w-6 sm:w-10 ${alcanzado[paso.id] ? 'bg-green-400' : 'bg-gray-300'}`}
                />
              )}
              {hecho ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" aria-hidden="true" />
              ) : (
                <Circle className="mt-0.5 h-4 w-4 shrink-0 text-gray-300" aria-hidden="true" />
              )}
              <div className="leading-tight">
                <p className={`text-xs font-medium ${hecho ? 'text-gray-900' : 'text-gray-400'}`}>
                  {paso.label}
                </p>
                {paso.id === 'despachada' && hecho && despachadaAt && (
                  <p className="text-[11px] text-gray-400">{formatoFecha(despachadaAt)}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
      {cancelada && (
        <p className="mt-2 flex items-center gap-1.5 text-xs text-red-600">
          <XCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {textoCancelacion(canceladaPor)}
        </p>
      )}
    </div>
  )
}