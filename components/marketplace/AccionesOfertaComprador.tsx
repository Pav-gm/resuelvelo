'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import {
  aceptarOfertaCotizacion,
  rechazarOfertaCotizacion,
  solicitarNuevaOferta,
} from '@/app/(marketplace)/cotizaciones/actions'
import type { CotizacionActionResult } from '@/types'

type Props = {
  cotizacionId: string
  vencida: boolean
}

type Dialogo = 'rechazar' | 'nueva' | null

async function aResultado(
  accion: () => Promise<CotizacionActionResult>
): Promise<{ error: string } | null> {
  try {
    const resultado = await accion()
    if (resultado && typeof resultado === 'object' && 'error' in resultado) {
      return resultado as { error: string }
    }
    return null
  } catch (e) {
    return { error: e instanceof Error ? e.message : 'No se pudo completar la acción.' }
  }
}

/**
 * Decisión del comprador sobre una oferta respondida. Con la oferta vigente
 * ofrece aceptarla o rechazarla con motivo; con la oferta vencida oculta la
 * aceptación, muestra «Oferta vencida» y permite pedir una nueva dejando una
 * nota al proveedor, conservando el rechazo. Cada diálogo exige un texto de
 * entre 1 y 500 caracteres. Los errores de la acción se muestran como estado,
 * los controles se deshabilitan mientras hay una acción pendiente y el diálogo
 * solo se cierra cuando la acción tiene éxito.
 */
export default function AccionesOfertaComprador({ cotizacionId, vencida }: Props) {
  const [, startTransition] = useTransition()
  const [pendiente, setPendiente] = useState(false)
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const [error, setError] = useState<string | null>(null)
  const [motivo, setMotivo] = useState('')
  const [nota, setNota] = useState('')

  const motivoValido = motivo.trim().length >= 1 && motivo.trim().length <= 500
  const notaValida = nota.trim().length >= 1 && nota.trim().length <= 500

  function limpiar() {
    setMotivo('')
    setNota('')
  }

  function ejecutar(accion: () => Promise<CotizacionActionResult>) {
    setError(null)
    setPendiente(true)
    startTransition(async () => {
      try {
        const resultado = await aResultado(accion)
        if (resultado?.error) {
          setError(resultado.error)
          return
        }
        limpiar()
        setDialogo(null)
      } finally {
        setPendiente(false)
      }
    })
  }

  return (
    <div className="rounded-2xl border bg-gray-50 px-4 py-4" aria-label="Acciones de la oferta">
      <div className="flex flex-wrap items-center gap-2">
        {vencida ? (
          <span className="text-sm font-medium text-red-600">Oferta vencida</span>
        ) : (
          <Button
            size="sm"
            className="bg-teal-600 hover:bg-teal-700 text-white"
            disabled={pendiente}
            onClick={() => {
              setError(null)
              ejecutar(() => aceptarOfertaCotizacion(cotizacionId))
            }}
          >
            Aceptar oferta
          </Button>
        )}
        {vencida && (
          <Button
            size="sm"
            variant="outline"
            className="border-teal-200 text-teal-700 hover:bg-teal-50"
            disabled={pendiente}
            onClick={() => {
              setError(null)
              limpiar()
              setDialogo('nueva')
            }}
          >
            Pedir nueva oferta
          </Button>
        )}
        <Button
          size="sm"
          variant="outline"
          className="text-red-500 border-red-200 hover:bg-red-50"
          disabled={pendiente}
          onClick={() => {
            setError(null)
            limpiar()
            setDialogo('rechazar')
          }}
        >
          Rechazar oferta
        </Button>
      </div>

      {dialogo === 'rechazar' && (
        <div
          className="mt-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3"
          role="dialog"
          aria-label="Motivo del rechazo"
        >
          <p className="text-sm text-gray-900">
            ¿Seguro que quieres rechazar esta oferta? Indica el motivo.
          </p>
          <textarea
            aria-label="Motivo del rechazo"
            className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            maxLength={500}
            value={motivo}
            disabled={pendiente}
            onChange={(e) => setMotivo(e.target.value)}
          />
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white"
              disabled={pendiente || !motivoValido}
              onClick={() => ejecutar(() => rechazarOfertaCotizacion(cotizacionId, motivo))}
            >
              Confirmar rechazo
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pendiente}
              onClick={() => {
                limpiar()
                setDialogo(null)
                setError(null)
              }}
            >
              Volver
            </Button>
          </div>
        </div>
      )}

      {dialogo === 'nueva' && (
        <div
          className="mt-3 rounded-lg border border-teal-200 bg-teal-50 px-4 py-3"
          role="dialog"
          aria-label="Pedir nueva oferta"
        >
          <p className="text-sm text-gray-900">
            La oferta venció. Deja una nota al proveedor para pedir una nueva oferta.
          </p>
          <textarea
            aria-label="Nota para el proveedor"
            className="mt-2 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            maxLength={500}
            value={nota}
            disabled={pendiente}
            onChange={(e) => setNota(e.target.value)}
          />
          <div className="mt-3 flex gap-2">
            <Button
              size="sm"
              className="bg-teal-600 hover:bg-teal-700 text-white"
              disabled={pendiente || !notaValida}
              onClick={() => ejecutar(() => solicitarNuevaOferta(cotizacionId, nota))}
            >
              Enviar solicitud
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={pendiente}
              onClick={() => {
                limpiar()
                setDialogo(null)
                setError(null)
              }}
            >
              Volver
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
