import type { Cotizacion } from '@/types'

type Props = {
  estado: Cotizacion['estado']
  despachadaAt?: string | null
  canceladaPor?: 'comprador' | 'proveedor' | null
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
 * Aceptada → Despachada → Recibida, con la fecha de despacho cuando existe y
 * el actor de la cancelación cuando el estado es cancelada. En cancelada se
 * muestra «Cancelada por …» y los tres pasos se renderizan siempre; «Recibida»
 * aparece como pendiente (text-gray-400, punto gris) y nunca como completada,
 * conforme a TRACKING-UI.
 * Las etiquetas se muestran numeradas («1 · Aceptada») para diferenciarse de
 * los badges de estado al consultar el DOM en las pruebas.
 */
export default function LineaSeguimiento({ estado, despachadaAt, canceladaPor }: Props) {
  const conSeguimiento =
    estado === 'aceptada' ||
    estado === 'despachada' ||
    estado === 'recibida' ||
    estado === 'cancelada'
  if (!conSeguimiento) return null

  const cancelada = estado === 'cancelada'
  const despachadaCompleta = cancelada
    ? !!despachadaAt
    : estado === 'despachada' || estado === 'recibida'

  // Los tres pasos se renderizan siempre; en cancelada «Recibida» queda como
  // pendiente (completa es false) porque la venta no llegó a recibirse.
  const pasos = [
    { etiqueta: 'Aceptada', completa: true },
    { etiqueta: 'Despachada', completa: despachadaCompleta },
    { etiqueta: 'Recibida', completa: estado === 'recibida' },
  ]

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
          Cancelada por {ETIQUETAS_ACTOR[canceladaPor]}.
        </p>
      )}
    </div>
  )
}