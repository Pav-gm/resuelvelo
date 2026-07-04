'use client'

import { useState, useSyncExternalStore, useTransition } from 'react'
import { ShoppingCart, Trash2, Plus, Minus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCarritoStore } from '@/lib/store/carrito'
import { cotizarDesdeCarrito } from '@/app/(marketplace)/cotizaciones/actions'

const noop = () => () => {}

export default function CarritoDrawer() {
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  // El carrito se hidrata desde localStorage solo en el cliente; este flag
  // es false en el server y true en el cliente, evitando el mismatch de SSR.
  const montado = useSyncExternalStore(noop, () => true, () => false)
  const { items, quitar, actualizarCantidad, vaciar, total, cantidadTotal } = useCarritoStore()

  function handleCotizar() {
    if (!items.length) return
    setError(null)
    const form = new FormData()
    form.set('items', JSON.stringify(items))

    startTransition(async () => {
      const result = await cotizarDesdeCarrito(null, form)
      if (result?.error) {
        setError(result.error)
      }
      // En éxito, la Server Action redirige; vaciar el carrito aquí
      // no es necesario porque el redirect navega fuera del componente.
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
              <div className="flex flex-1 items-center justify-center text-gray-400 text-sm">
                El carrito está vacío.
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                  {items.map(({ producto, cantidad }) => (
                    <div key={producto.id} className="flex gap-3 items-start">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 line-clamp-2">{producto.nombre}</p>
                        <p className="text-xs text-gray-400">{producto.proveedor?.nombre_empresa}</p>
                        <p className="mt-0.5 text-sm font-semibold text-orange-500">
                          ${producto.precio.toLocaleString('es-DO', { minimumFractionDigits: 2 })} / {producto.unidad}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => actualizarCantidad(producto.id, cantidad - 1)}
                          className="rounded-md border p-1 hover:bg-gray-50"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-6 text-center text-sm font-medium">{cantidad}</span>
                        <button
                          onClick={() => actualizarCantidad(producto.id, cantidad + 1)}
                          className="rounded-md border p-1 hover:bg-gray-50"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => quitar(producto.id)}
                          className="ml-1 rounded-md p-1 text-gray-400 hover:text-red-500"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t px-5 py-4 space-y-3">
                  <div className="flex items-center justify-between text-sm font-semibold">
                    <span>Total estimado</span>
                    <span>${total().toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => vaciar()}
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
