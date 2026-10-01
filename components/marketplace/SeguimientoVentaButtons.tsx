'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  cancelarVenta,
  confirmarRecepcion,
  despacharCotizacion,
} from '@/app/(marketplace)/cotizaciones/actions'
import type { EstadoCotizacion } from '@/types'

interface Props {
  cotizacionId: string
  estado: EstadoCotizacion
  rol: 'comprador' | 'proveedor'
  /** Solo el proveedor, y solo cuando ya pasaron 7 días del despacho. */
  puedeConfirmarRecepcion?: boolean
  confirmarProveedorEl?: string | null
}

export default function SeguimientoVentaButtons({
  cotizacionId,
  estado,
  rol,
  puedeConfirmarRecepcion = false,
  confirmarProveedorEl = null,
}: Props) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function ejecutar(accion: (id: string) => Promise<{ error: string } | null>) {
    setError(null)
    startTransition(async () => {
      const result = await accion(cotizacionId)
      setError(result?.error ?? null)
    })
  }

  const botones: { label: string; accion: (id: string) => Promise<{ error: string } | null>; peligro?: boolean }[] = []

  if (rol === 'proveedor' && estado === 'aceptada') {
    botones.push({ label: 'Marcar despachada', accion: despacharCotizacion })
    botones.push({ label: 'Cancelar venta', accion: cancelarVenta, peligro: true })
  }

  if (rol === 'proveedor' && estado === 'despachada') {
    if (puedeConfirmarRecepcion) {
      botones.push({ label: 'Marcar como recibido', accion: confirmarRecepcion })
    }
    botones.push({ label: 'Cancelar venta', accion: cancelarVenta, peligro: true })
  }

  if (rol === 'comprador' && estado === 'aceptada') {
    botones.push({ label: 'Cancelar pedido', accion: cancelarVenta, peligro: true })
  }

  if (rol === 'comprador' && estado === 'despachada') {
    botones.push({ label: 'Marcar como recibido', accion: confirmarRecepcion })
  }

  if (botones.length === 0) return null

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-2">
        {botones.map((b) => (
          <Button
            key={b.label}
            size="sm"
            variant={b.peligro ? 'outline' : 'default'}
            className={b.peligro ? 'text-red-500 border-red-200 hover:bg-red-50' : 'bg-orange-500 hover:bg-orange-600 text-white'}
            disabled={pending}
            onClick={() => ejecutar(b.accion)}
          >
            {pending ? '...' : b.label}
          </Button>
        ))}
      </div>
      {rol === 'proveedor' && estado === 'despachada' && !puedeConfirmarRecepcion && (
        <p className="max-w-xs text-right text-xs text-gray-500">
          {confirmarProveedorEl
            ? `Podrás marcarla como recibida el ${confirmarProveedorEl} si el cliente no lo hace.`
            : 'Podrás marcarla como recibida 7 días después del despacho si el cliente no lo hace.'}
        </p>
      )}
      {error && <p className="max-w-xs text-right text-xs text-red-600">{error}</p>}
    </div>
  )
}
