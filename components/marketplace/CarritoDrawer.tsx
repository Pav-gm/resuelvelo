'use client'

import { useEffect, useState, useSyncExternalStore, useTransition } from 'react'
import Link from 'next/link'
import { ShoppingCart, Trash2, Plus, Minus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCarritoStore } from '@/lib/store/carrito'
import { hoyISOEnSantoDomingo } from '@/lib/cotizaciones'
import { formatearPrecio } from '@/lib/utils'
import { cotizarDesdeCarrito } from '@/app/(marketplace)/cotizaciones/actions'

const noop = () => () => {}

/**
 * Respuesta de error de cotizarDesdeCarrito. El servidor añade `noDisponibles`
 * con los ids que ya no existen o están inactivos (ver contrato). Se declara
 * aquí el consumo del campo; el tipo exportado por el servidor se ampliará por
 * separado sin cambiar los nombres de las funciones.
 */
type ResultadoCotizar = { error: string; noDisponibles?: string[] }

/** Dirección de obra propia del comprador que el servidor entrega al drawer. */
export type DireccionObraDrawer = {
  id: string
  etiqueta: string
  direccion: string
  provincia: string
  municipio: string | null
  referencia: string | null
  es_principal: boolean
}

interface CarritoDrawerProps {
  /** Direcciones guardadas del comprador; vacío para otros roles o sin sesión. */
  direccionesObra?: DireccionObraDrawer[]
}

/** Texto de opción: `etiqueta — direccion, municipio, provincia`, omitiendo el municipio vacío. */
function formatearDireccion(direccion: DireccionObraDrawer): string {
  const partes = [direccion.direccion, direccion.municipio, direccion.provincia]
    .map((valor) => valor?.trim())
    .filter((valor): valor is string => Boolean(valor))
  return `${direccion.etiqueta} — ${partes.join(', ')}`
}

export default function CarritoDrawer({ direccionesObra = [] }: CarritoDrawerProps) {
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [direccionId, setDireccionId] = useState('')
  const [fechaRequerida, setFechaRequerida] = useState('')
  const [pending, startTransition] = useTransition()
  // El carrito se hidrata desde localStorage solo en el cliente; este flag
  // es false en el server y true en el cliente, evitando el mismatch de SSR.
  const montado = useSyncExternalStore(noop, () => true, () => false)
  const { items, quitar, actualizarCantidad, vaciar, total, cantidadTotal } = useCarritoStore()

  // «Volver a pedir» avisa mediante un evento global que el carrito debe abrirse.
  useEffect(() => {
    const abrir = () => setAbierto(true)
    window.addEventListener('resuelvelo:abrir-carrito', abrir)
    return () => window.removeEventListener('resuelvelo:abrir-carrito', abrir)
  }, [])

  function handleCotizar() {
    if (!items.length) return
    setError(null)
    const form = new FormData()
    form.set('items', JSON.stringify(items))
    if (direccionId) form.set('direccion_obra_id', direccionId)
    if (fechaRequerida) form.set('fecha_requerida', fechaRequerida)

    startTransition(async () => {
      const result = (await cotizarDesdeCarrito(null, form)) as ResultadoCotizar | null
      if (result?.error) {
        if (result.noDisponibles) {
          for (const id of result.noDisponibles) quitar(id)
        }
        setError(result.error)
      }
      // Un envío mixto lo resuelve el servidor en esta misma invocación: cotiza
      // las líneas válidas y redirige. El drawer no reintenta ni genera una
      // segunda solicitud; solo el caso sin líneas válidas devuelve error con
      // `noDisponibles`, que aquí se quitan y se avisa.
    })
  }

  return (
    <>
      <button
        onClick={() => setAbierto(true)}
        className="relative"
        aria-label="Carrito"
      >
        <ShoppingCart className="h-5 w-5 text-gray-700" />
        {montado && cantidadTotal() > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
            {cantidadTotal()}
          </span>
        )}
      </button>

      {abierto && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/30"
            onClick={() => setAbierto(false)}
          />
          <div className="relative ml-auto flex h-full w-full max-w-sm flex-col bg-white shadow-xl">
            <div className="flex items-center justify-between border-b px-5 py-4">
              <h2 className="font-semibold text-gray-900">Mi carrito</h2>
              <button onClick={() => setAbierto(false)} aria-label="Cerrar">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-5 text-center text-sm text-gray-400">
                El carrito está vacío.
                {error && (
                  <p className="text-xs text-red-600">{error}</p>
                )}
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                  {items.map(({ producto, cantidad }) => {
                    // Stock disponible: total menos las unidades reservadas.
                    const disponible = Math.max(0, producto.stock - (producto.stock_reservado ?? 0))
                    const alMaximo = cantidad >= disponible
                    return (
                    <div key={producto.id} className="flex gap-3 items-start">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 line-clamp-2">{producto.nombre}</p>
                        <p className="text-xs text-gray-400">{producto.proveedor?.nombre_empresa}</p>
                        <p className="mt-0.5 text-sm font-semibold text-orange-500">
                          {formatearPrecio(producto.precio)} / {producto.unidad}
                        </p>
                        {alMaximo && (
                          <p className="mt-0.5 text-xs text-gray-500">Máximo en carrito: {disponible}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => actualizarCantidad(producto.id, cantidad - 1)}
                          className="rounded-md border p-1 hover:bg-gray-50"
                          aria-label="Disminuir cantidad"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-medium">{cantidad}</span>
                        <button
                          onClick={() => actualizarCantidad(producto.id, cantidad + 1)}
                          className="rounded-md border p-1 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
                          disabled={disponible <= 0 || alMaximo}
                          aria-label="Aumentar cantidad"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => quitar(producto.id)}
                          className="ml-1 rounded-md p-1 text-gray-400 hover:text-red-500"
                          aria-label="Quitar producto"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    )
                  })}
                </div>

                <div className="border-t px-5 py-4 space-y-3">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>Total estimado</span>
                    <span>{formatearPrecio(total())}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="direccionObra" className="text-xs font-medium text-gray-600">
                      Dirección de obra
                    </label>
                    <select
                      id="direccionObra"
                      value={direccionId}
                      onChange={(e) => setDireccionId(e.target.value)}
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
                    >
                      <option value="">Sin dirección</option>
                      {direccionesObra.map((direccion) => (
                        <option key={direccion.id} value={direccion.id}>
                          {formatearDireccion(direccion)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label htmlFor="fechaRequerida" className="text-xs font-medium text-gray-600">
                      Fecha requerida (opcional)
                    </label>
                    <input
                      id="fechaRequerida"
                      type="date"
                      min={hoyISOEnSantoDomingo()}
                      value={fechaRequerida}
                      onChange={(e) => {
                        setFechaRequerida(e.target.value)
                        setError(null)
                      }}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
                    />
                  </div>
                  {error && (
                    <p className="text-xs text-red-600">{error}</p>
                  )}
                  <Button
                    onClick={handleCotizar}
                    disabled={pending}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {pending ? 'Enviando...' : 'Solicitar cotización'}
                  </Button>
                  <Link
                    href="/solicitudes/nueva?desde=carrito"
                    onClick={() => setAbierto(false)}
                    className="block w-full rounded-lg border border-orange-200 px-4 py-2 text-center text-sm font-medium text-orange-600 hover:bg-orange-50"
                  >
                    Enviar el carrito a varios proveedores
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      vaciar()
                      setError(null)
                    }}
                    className="w-full text-gray-400 hover:text-gray-600"
                  >
                    Vaciar carrito
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
