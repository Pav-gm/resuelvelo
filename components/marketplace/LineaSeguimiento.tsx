import type { Cotizacion } from '@/types'

type Props = {
  estado: Cotizacion['estado']
  despachadaAt?: string | null
  canceladaPor?: 'comprador' | 'proveedor' | null
  canceladaAt?: string | null
  canceladaMotivo?: string | null
}

const ETIQUETAS_ACTOR: Record<'comprador' | 'proveedor', string> = {
  comprador: 'el comprador',
  proveedor: 'el proveedor',
}

function formatearFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-DO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

/**
 * Línea de seguimiento compartida por las vistas del proveedor y del comprador:
 * Pendiente → Respondida → Aceptada → Despachada → Recibida, con la fecha de
 * despacho cuando existe y, en cancelada, un último paso «Cancelada» completo
 * con la fecha de la cancelación. En cancelada se muestra el actor y, cuando
 * existen fecha y motivo, el texto «Cancelada por … el <fecha>: <motivo>»; si
 * faltan datos históricos se conserva «Cancelada por …». Los pasos se
 * renderizan siempre; cada etapa queda completa solo si la cotización la
 * alcanzó (en cancelada, «Despachada» depende de que haya fecha de despacho y
 * «Recibida» nunca se completa). Las etiquetas se muestran numeradas
 * («1 · Pendiente») para diferenciarse de los badges de estado.
 */
export default function LineaSeguimiento({
  estado,
  despachadaAt,
  canceladaPor,
  canceladaAt,
  canceladaMotivo,
}: Props) {
  const conSeguimiento =
    estado === 'pendiente' ||
    estado === 'respondida' ||
    estado === 'aceptada' ||
    estado === 'despachada' ||
    estado === 'recibida' ||
    estado === 'cancelada'
  if (!conSeguimiento) return null

  const cancelada = estado === 'cancelada'
  const respondidaCompleta = estado !== 'pendiente'
  const aceptadaCompleta =
    estado === 'aceptada' || estado === 'despachada' || estado === 'recibida' || cancelada
  const despachadaCompleta = cancelada
    ? !!despachadaAt
    : estado === 'despachada' || estado === 'recibida'
  const recibidaCompleta = estado === 'recibida'

  // Los pasos se renderizan siempre; en cancelada «Recibida» queda como
  // pendiente (completa es false) porque la venta no llegó a recibirse, y se
  // añade un último paso «Cancelada» marcado como completo.
  const base = [
    { etiqueta: 'Pendiente', completa: true },
    { etiqueta: 'Respondida', completa: respondidaCompleta },
    { etiqueta: 'Aceptada', completa: aceptadaCompleta },
    { etiqueta: 'Despachada', completa: despachadaCompleta },
    { etiqueta: 'Recibida', completa: recibidaCompleta },
  ]
  const pasos = cancelada ? [...base, { etiqueta: 'Cancelada', completa: true }] : base

  return (
    <div
      className="border-t bg-gray-50 px-6 py-4"
      role="region"
      aria-label="Seguimiento de la cotización"
    >
      <ol
        className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm"
        data-testid="linea-seguimiento"
      >
        {pasos.map((paso, indice) => (
          <li key={paso.etiqueta} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`inline-block size-2 rounded-full ${
                paso.completa ? 'bg-teal-500' : 'bg-gray-300'
              }`}
            />
            {/* Etiqueta numerada («1 · Aceptada»): evita que la consulta exacta
                de texto choque con los badges de estado de cada tarjeta. */}
            <span className={paso.completa ? 'font-medium text-gray-900' : 'text-gray-400'}>
              {indice + 1}
              {' · '}
              {paso.etiqueta}
              {paso.etiqueta === 'Despachada' && despachadaAt && (
                <span className="ml-1 font-normal text-gray-500">
                  {formatearFecha(despachadaAt)}
                </span>
              )}
              {paso.etiqueta === 'Cancelada' && canceladaAt && (
                <span className="ml-1 font-normal text-gray-500">
                  {formatearFecha(canceladaAt)}
                </span>
              )}
            </span>
            {indice < pasos.length - 1 && (
              <span aria-hidden="true" className="text-gray-400">
                →
              </span>
            )}
          </li>
        ))}
      </ol>
      {canceladaPor && (
        <p className="mt-2 text-sm font-medium text-red-600" role="status">
          {canceladaAt && canceladaMotivo
            ? `Cancelada por ${ETIQUETAS_ACTOR[canceladaPor]} el ${formatearFecha(canceladaAt)}: ${canceladaMotivo}`
            : `Cancelada por ${ETIQUETAS_ACTOR[canceladaPor]}.`}
        </p>
      )}
    </div>
  )
}