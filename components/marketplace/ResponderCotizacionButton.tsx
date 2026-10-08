'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { responderCotizacion } from '@/app/(marketplace)/cotizaciones/actions'
import { aceptarCotizacionConCantidades } from '@/app/(marketplace)/proveedor/actions'
import type { ItemCotizacion } from '@/types'

interface Props {
  cotizacionId: string
  /** Líneas de la cotización; definen qué cantidades se confirman al aceptar. */
  items?: ItemCotizacion[]
}

/** Cantidad inicial sugerida: el stock observado al cotizar, sin superar lo pedido. */
function cantidadInicial(item: ItemCotizacion): number {
  return Math.min(item.cantidad, item.stock_al_cotizar ?? item.cantidad)
}

export default function ResponderCotizacionButton({ cotizacionId, items = [] }: Props) {
  const [pending, startTransition] = useTransition()
  const [abierto, setAbierto] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [cantidades, setCantidades] = useState<Record<string, number>>({})

  const lineasSujetas = items.filter((item) => item.sujeta_disponibilidad)

  function abrirDialogo() {
    setError(null)
    setAviso(null)
    const iniciales: Record<string, number> = {}
    for (const item of items) {
      iniciales[item.id] = item.sujeta_disponibilidad
        ? cantidadInicial(item)
        : item.cantidad
    }
    setCantidades(iniciales)
    setAbierto(true)
  }

  function cerrarDialogo() {
    setAbierto(false)
    setError(null)
    setAviso(null)
  }

  function handleConfirmar() {
    // Las líneas no sujetas a disponibilidad se confirman con la cantidad completa.
    const seleccion = items.map((item) => ({
      itemId: item.id,
      cantidad: item.sujeta_disponibilidad ? cantidades[item.id] ?? 0 : item.cantidad,
    }))
    const total = seleccion.reduce((suma, linea) => suma + linea.cantidad, 0)
    if (total === 0) {
      setAviso('Debes confirmar al menos una unidad o rechazar la cotización.')
      return
    }

    setError(null)
    setAviso(null)
    startTransition(async () => {
      const resultado = await aceptarCotizacionConCantidades(cotizacionId, seleccion)
      if (resultado?.error) {
        setError(resultado.error)
        return
      }
      setAbierto(false)
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Button
          size="sm"
          className="bg-green-500 hover:bg-green-600 text-white"
          disabled={pending}
          onClick={abrirDialogo}
        >
          Aceptar
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-red-500 border-red-200 hover:bg-red-50"
          disabled={pending}
          onClick={() => startTransition(() => responderCotizacion(cotizacionId, 'rechazada'))}
        >
          Rechazar
        </Button>
      </div>

      {abierto && (
        <div
          role="dialog"
          aria-label="Confirmar cantidades"
          className="rounded-lg border border-green-200 bg-green-50 px-4 py-3"
        >
          {lineasSujetas.length === 0 ? (
            <p className="text-sm text-gray-900">
              ¿Confirmas la aceptación de la cotización con las cantidades solicitadas?
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-900">
                Indica cuántas unidades puedes servir de cada producto.
              </p>
              <div className="mt-2 space-y-2">
                {lineasSujetas.map((item) => {
                  const nombre = item.producto?.nombre?.trim() || 'Producto no disponible'
                  return (
                    <div key={item.id} className="flex items-center justify-between gap-3">
                      <label htmlFor={`cantidad-${item.id}`} className="text-sm text-gray-700">
                        {nombre}
                      </label>
                      <input
                        id={`cantidad-${item.id}`}
                        type="number"
                        min={0}
                        max={item.cantidad}
                        value={cantidades[item.id] ?? 0}
                        disabled={pending}
                        onChange={(evento) => {
                          const valor = Number.parseInt(evento.target.value, 10)
                          setCantidades((previas) => ({
                            ...previas,
                            [item.id]: Number.isNaN(valor) ? 0 : valor,
                          }))
                        }}
                        className="w-20 rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
                      />
                    </div>
                  )
                })}
              </div>
            </>
          )}

          {aviso && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {aviso}
            </p>
          )}
          {error && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              className="bg-green-500 hover:bg-green-600 text-white"
              disabled={pending}
              onClick={handleConfirmar}
            >
              {pending ? 'Confirmando…' : 'Confirmar aceptación'}
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={cerrarDialogo}>
              Volver
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
