'use client'

import { useState, useSyncExternalStore, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  ofertarCotizacion,
  rechazarCotizacionConMotivo,
} from '@/app/(marketplace)/proveedor/actions'
import {
  esFechaISOFuturaEnSantoDomingo,
  sumarDiasISOEnSantoDomingo,
} from '@/lib/cotizaciones'
import type { ItemCotizacion, LineaOfertaInput, OfertaCotizacionInput } from '@/types'

interface Props {
  cotizacionId: string
  /** Líneas de la cotización; definen precios y cantidades de la oferta. */
  items: ItemCotizacion[]
}

const noop = () => () => {}

/** Precio unitario precargado: el actual del catálogo; si falta, el solicitado. */
function precioInicial(item: ItemCotizacion): number | null {
  return item.producto?.precio ?? item.precio_unitario ?? null
}

/** Texto del precio precargado; vacío significa «No disponible». */
function textoPrecioInicial(item: ItemCotizacion): string {
  const precio = precioInicial(item)
  return precio == null ? '' : String(precio)
}

/** Cantidad inicial: la pedida, sin superar el stock observado al cotizar. */
function cantidadInicial(item: ItemCotizacion): number {
  if (item.sujeta_disponibilidad) {
    return Math.min(item.cantidad, item.stock_al_cotizar ?? item.cantidad)
  }
  return item.cantidad
}

type OfertaConstruida = { error: string } | { oferta: OfertaCotizacionInput }

export default function ResponderCotizacionButton({ cotizacionId, items }: Props) {
  const [pending, startTransition] = useTransition()
  const [abierto, setAbierto] = useState(false)
  const [rechazoAbierto, setRechazoAbierto] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [errorRechazo, setErrorRechazo] = useState<string | null>(null)
  const [motivoRechazo, setMotivoRechazo] = useState('')
  const [precios, setPrecios] = useState<Record<string, string>>({})
  const [cantidades, setCantidades] = useState<Record<string, string>>({})
  // La indisponibilidad es explícita: la casilla «No disponible» de cada línea
  // es la única que la marca (nunca un precio vacío por sí solo).
  const [noDisponible, setNoDisponible] = useState<Record<string, boolean>>({})
  const [plazo, setPlazo] = useState('')
  const [validaHasta, setValidaHasta] = useState('')
  const [condiciones, setCondiciones] = useState('')
  // El botón solo es interactivo tras hidratar: evita un primer clic perdido
  // cuando la página aún no ha montado los manejadores del cliente.
  const montado = useSyncExternalStore(noop, () => true, () => false)

  function abrirDialogo() {
    setError(null)
    const preciosIniciales: Record<string, string> = {}
    const cantidadesIniciales: Record<string, string> = {}
    const noDisponiblesIniciales: Record<string, boolean> = {}
    for (const item of items) {
      preciosIniciales[item.id] = textoPrecioInicial(item)
      cantidadesIniciales[item.id] = String(cantidadInicial(item))
      noDisponiblesIniciales[item.id] = false
    }
    setPrecios(preciosIniciales)
    setCantidades(cantidadesIniciales)
    setNoDisponible(noDisponiblesIniciales)
    setPlazo('0')
    setValidaHasta(sumarDiasISOEnSantoDomingo(7))
    setCondiciones('')
    setAbierto(true)
  }

  function cerrarDialogo() {
    setAbierto(false)
    setError(null)
  }

  /** Parsea un texto como entero; devuelve NaN si está vacío o no es entero. */
  function parseEntero(texto: string): number {
    const limpio = texto.trim()
    return /^-?\d+$/.test(limpio) ? Number(limpio) : Number.NaN
  }

  /** Analiza las cantidades efectivas: si son válidas y cuántas unidades suman. */
  function analizarCantidades(): { validas: boolean; total: number } {
    let total = 0
    for (const item of items) {
      if (item.sujeta_disponibilidad) {
        const cantidad = parseEntero(cantidades[item.id] ?? '')
        if (!Number.isInteger(cantidad) || cantidad < 0 || cantidad > item.cantidad) {
          return { validas: false, total }
        }
        total += cantidad
      } else {
        total += item.cantidad
      }
    }
    return { validas: true, total }
  }

  /** Valida los datos en español y arma el payload de la oferta. */
  function construirOferta(
    preciosUsados: Record<string, string>,
    noDisponibles: Record<string, boolean>
  ): OfertaConstruida {
    const lineas: LineaOfertaInput[] = []
    for (const item of items) {
      // La casilla es la única fuente de indisponibilidad: una línea marcada se
      // serializa como `precioUnitario: null` y `cantidadOfertada: 0`.
      if (noDisponibles[item.id]) {
        lineas.push({ itemId: item.id, precioUnitario: null, cantidadOfertada: 0 })
        continue
      }

      const texto = (preciosUsados[item.id] ?? '').trim()
      const precio = Number(texto)
      if (texto === '' || !Number.isFinite(precio) || precio <= 0) {
        return { error: 'Indica el precio' }
      }

      if (item.sujeta_disponibilidad) {
        const cantidad = parseEntero(cantidades[item.id] ?? '')
        if (!Number.isInteger(cantidad) || cantidad < 0 || cantidad > item.cantidad) {
          return { error: 'Indica cuántas unidades confirmas' }
        }
        lineas.push({ itemId: item.id, precioUnitario: precio, cantidadOfertada: cantidad })
      } else {
        lineas.push({ itemId: item.id, precioUnitario: precio, cantidadOfertada: null })
      }
    }

    const plazoDias = plazo.trim() === '' ? Number.NaN : Number(plazo)
    if (!Number.isInteger(plazoDias) || plazoDias < 0 || plazoDias > 90) {
      return { error: 'El plazo debe estar entre 0 y 90 días.' }
    }

    if (!esFechaISOFuturaEnSantoDomingo(validaHasta)) {
      return { error: 'La fecha de validez debe ser futura.' }
    }

    return {
      oferta: {
        lineas,
        plazoDias,
        validaHasta,
        condiciones: condiciones.trim() || null,
      },
    }
  }

  function enviarOferta(oferta: OfertaCotizacionInput) {
    setError(null)
    startTransition(async () => {
      try {
        const resultado = await ofertarCotizacion(cotizacionId, oferta)
        if (resultado?.error) {
          setError(resultado.error)
          return
        }
        cerrarDialogo()
      } catch (e) {
        setError(e instanceof Error ? e.message : 'No se pudo enviar la oferta.')
      }
    })
  }

  function handleEnviarOferta() {
    const resultado = construirOferta(precios, noDisponible)
    if ('error' in resultado) {
      setError(resultado.error)
      return
    }
    enviarOferta(resultado.oferta)
  }

  function handleAceptarCatalogo() {
    const preciosCatalogo: Record<string, string> = {}
    const noDisponiblesCatalogo: Record<string, boolean> = {}
    for (const item of items) {
      preciosCatalogo[item.id] = textoPrecioInicial(item)
      // Sin precio de catálogo la línea se ofrece como no disponible.
      noDisponiblesCatalogo[item.id] = textoPrecioInicial(item) === ''
    }
    const resultado = construirOferta(preciosCatalogo, noDisponiblesCatalogo)
    if ('error' in resultado) {
      setError(resultado.error)
      return
    }
    enviarOferta(resultado.oferta)
  }

  function cerrarRechazo() {
    setRechazoAbierto(false)
    setMotivoRechazo('')
    setErrorRechazo(null)
  }

  function confirmarRechazo() {
    const motivo = motivoRechazo.trim()
    if (!motivo) {
      setErrorRechazo('Escribe el motivo del rechazo.')
      return
    }
    if (motivo.length > 500) {
      setErrorRechazo('El motivo no puede superar los 500 caracteres.')
      return
    }
    setErrorRechazo(null)
    startTransition(async () => {
      try {
        const resultado = await rechazarCotizacionConMotivo(cotizacionId, motivo)
        if (resultado?.error) {
          setErrorRechazo(resultado.error)
          return
        }
        cerrarRechazo()
      } catch (e) {
        setErrorRechazo(e instanceof Error ? e.message : 'No se pudo rechazar la cotización.')
      }
    })
  }

  const { validas: cantidadesValidas, total: totalUnidades } = analizarCantidades()
  const totalCero = cantidadesValidas && totalUnidades === 0

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          className="bg-green-500 hover:bg-green-600 text-white"
          disabled={pending || !montado}
          onClick={abrirDialogo}
        >
          Responder con oferta
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="text-red-500 border-red-200 hover:bg-red-50"
          disabled={pending}
          onClick={() => {
            setErrorRechazo(null)
            setRechazoAbierto(true)
          }}
        >
          Rechazar
        </Button>
      </div>

      {abierto && (
        <div
          role="dialog"
          aria-label="Responder con oferta"
          className="w-full rounded-lg border border-green-200 bg-green-50 px-4 py-3"
        >
          <p className="text-sm text-gray-900">
            Indica el precio ofertado de cada producto y los términos de la oferta.
          </p>

          <div className="mt-2 space-y-3">
            {items.map((item) => {
              const nombre =
                item.producto?.nombre?.trim() ||
                item.descripcion?.trim() ||
                'Producto no disponible'
              // Unidad efectiva: la propia de la línea o, si falta, la del producto.
              const unidad = item.unidad?.trim() || item.producto?.unidad?.trim() || undefined
              const marcado = noDisponible[item.id] ?? false
              return (
                <div key={item.id} className="flex flex-col gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {nombre}
                    {unidad && (
                      <span className="ml-1 text-xs font-normal text-gray-500">{`(${unidad})`}</span>
                    )}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <label htmlFor={`precio-${item.id}`} className="text-sm text-gray-700">
                      {`Precio unitario de ${nombre}`}
                    </label>
                    <input
                      id={`precio-${item.id}`}
                      type="number"
                      min={0}
                      step="0.01"
                      value={precios[item.id] ?? ''}
                      disabled={pending || marcado}
                      onChange={(evento) => {
                        setPrecios((previos) => ({
                          ...previos,
                          [item.id]: evento.target.value,
                        }))
                      }}
                      className="w-24 rounded border border-gray-300 px-2 py-1 text-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
                    />
                    <span className="text-xs text-gray-500">(opcional)</span>
                  </div>
                  <label className="flex items-center gap-2 text-xs text-gray-600">
                    <input
                      type="checkbox"
                      checked={marcado}
                      disabled={pending}
                      onChange={(evento) => {
                        setNoDisponible((previos) => ({
                          ...previos,
                          [item.id]: evento.target.checked,
                        }))
                      }}
                      className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400/20"
                    />
                    {`No disponible: ${nombre}`}
                  </label>
                  {marcado && <p className="text-xs text-gray-500">Cantidad ofertada: 0</p>}
                  {item.sujeta_disponibilidad ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <label htmlFor={`cantidad-${item.id}`} className="text-sm text-gray-700">
                        {unidad
                          ? `Cantidad de ${nombre}: ${item.cantidad} ${unidad}`
                          : `Cantidad de ${nombre}`}
                      </label>
                      <input
                        id={`cantidad-${item.id}`}
                        type="number"
                        min={0}
                        max={item.cantidad}
                        value={marcado ? '0' : (cantidades[item.id] ?? '')}
                        disabled={pending || marcado}
                        onChange={(evento) => {
                          setCantidades((previas) => ({
                            ...previas,
                            [item.id]: evento.target.value,
                          }))
                        }}
                        className="w-24 rounded border border-gray-300 px-2 py-1 text-sm text-gray-900 disabled:bg-gray-100 disabled:text-gray-400"
                      />
                    </div>
                  ) : (
                    <p className="text-xs text-gray-500">
                      {`Cantidad solicitada: ${item.cantidad}${unidad ? ` ${unidad}` : ''}`}
                    </p>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-3 flex flex-col gap-2">
            <label htmlFor="plazo-dias" className="text-sm text-gray-700">
              Plazo de entrega en días
            </label>
            <input
              id="plazo-dias"
              type="number"
              min={0}
              max={90}
              value={plazo}
              disabled={pending}
              onChange={(evento) => setPlazo(evento.target.value)}
              className="w-24 rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
            />
            <label htmlFor="valida-hasta" className="text-sm text-gray-700">
              Válida hasta
            </label>
            <input
              id="valida-hasta"
              type="date"
              value={validaHasta}
              disabled={pending}
              onChange={(evento) => setValidaHasta(evento.target.value)}
              className="w-40 rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
            />
            <label htmlFor="condiciones" className="text-sm text-gray-700">
              Condiciones
            </label>
            <textarea
              id="condiciones"
              value={condiciones}
              disabled={pending}
              onChange={(evento) => setCondiciones(evento.target.value)}
              className="w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
            />
          </div>

          {totalCero && (
            <p className="mt-2 text-sm text-red-600">
              Si no puedes servir nada, rechaza la cotización
            </p>
          )}

          {error && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {error}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              className="bg-green-500 hover:bg-green-600 text-white"
              disabled={pending || totalCero}
              onClick={handleEnviarOferta}
            >
              {pending ? 'Enviando…' : 'Enviar oferta'}
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pending}
              onClick={handleAceptarCatalogo}
            >
              Ofertar al precio de catálogo
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={cerrarDialogo}>
              Volver
            </Button>
          </div>
        </div>
      )}

      {rechazoAbierto && (
        <div
          role="dialog"
          aria-label="Rechazar cotización"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3"
        >
          <p className="text-sm text-gray-900">
            Indica el motivo del rechazo de esta cotización.
          </p>
          <textarea
            aria-label="Motivo del rechazo"
            className="mt-2 w-full rounded border border-gray-300 px-2 py-1 text-sm text-gray-900"
            maxLength={500}
            value={motivoRechazo}
            disabled={pending}
            onChange={(evento) => setMotivoRechazo(evento.target.value)}
          />
          {errorRechazo && (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {errorRechazo}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={pending}
              onClick={confirmarRechazo}
            >
              Confirmar rechazo
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={cerrarRechazo}>
              Volver
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
