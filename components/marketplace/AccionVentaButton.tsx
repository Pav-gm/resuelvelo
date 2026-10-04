'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { despacharCotizacion, cancelarVenta } from '@/app/(marketplace)/proveedor/actions'
import {
  cancelarCotizacion,
  confirmarRecepcion,
} from '@/app/(marketplace)/cotizaciones/actions'

/**
 * Acciones de seguimiento de venta. Todas pasan por las RPC existentes
 * (despachar_cotizacion, cancelar_venta, confirmar_recepcion) mediante las
 * Server Actions; el error de la acción se muestra tal cual llega.
 */
export type AccionVenta =
  | 'despachar'
  | 'cancelar-proveedor'
  | 'cancelar-comprador'
  | 'confirmar-recepcion'

type AccionVentaError = { error: string } | null

const ACCIONES: Record<
  AccionVenta,
  {
    label: string
    confirmacion: string
    buttonClass: string
    ejecutar: (cotizacionId: string) => Promise<AccionVentaError>
  }
> = {
  despachar: {
    label: 'Marcar como despachada',
    confirmacion:
      '¿Marcar esta venta como despachada? El comprador podrá confirmar la recepción.',
    buttonClass: 'bg-green-500 hover:bg-green-600 text-white',
    ejecutar: despacharCotizacion,
  },
  'cancelar-proveedor': {
    label: 'Cancelar venta',
    confirmacion:
      '¿Cancelar esta venta? Se liberará el stock reservado y la acción no se puede deshacer.',
    buttonClass: 'text-red-500 border-red-200 hover:bg-red-50',
    ejecutar: cancelarVenta,
  },
  'cancelar-comprador': {
    label: 'Cancelar',
    confirmacion:
      '¿Cancelar esta cotización? Se liberará el stock reservado y la acción no se puede deshacer.',
    buttonClass: 'text-red-500 border-red-200 hover:bg-red-50',
    ejecutar: cancelarCotizacion,
  },
  'confirmar-recepcion': {
    label: 'Confirmar recepción',
    confirmacion:
      '¿Confirmar la recepción de este pedido? Se descontará el stock y la acción no se puede deshacer.',
    buttonClass: 'bg-green-500 hover:bg-green-600 text-white',
    ejecutar: confirmarRecepcion,
  },
}

interface AccionVentaButtonProps {
  cotizacionId: string
  accion: AccionVenta
}

export default function AccionVentaButton({
  cotizacionId,
  accion,
}: AccionVentaButtonProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const config = ACCIONES[accion]

  function handleAccion() {
    const confirmado = window.confirm(config.confirmacion)
    if (!confirmado) return

    setError(null)
    startTransition(async () => {
      const result = await config.ejecutar(cotizacionId)
      if (result?.error) {
        setError(result.error)
      }
      // En éxito las Server Actions revalidan /proveedor/pedidos y
      // /mis-cotizaciones; no se adelanta ningún estado local.
    })
  }

  return (
    <div>
      <Button
        size="sm"
        variant={accion === 'despachar' || accion === 'confirmar-recepcion' ? 'default' : 'outline'}
        className={config.buttonClass}
        disabled={pending}
        onClick={handleAccion}
      >
        {pending ? '...' : config.label}
      </Button>
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  )
}