'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { BadgeCheck, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { solicitarVerificacionProveedor } from '@/app/(marketplace)/proveedor/actions'
import type { VerificacionEstado } from '@/types'

interface SolicitudVerificacionProps {
  estado: VerificacionEstado
  rnc: string | null
  telefono: string | null
  nota: string | null
  verificadoAt: string | null
}

function formatearFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-DO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function SolicitudVerificacion({
  estado,
  rnc,
  telefono,
  nota,
  verificadoAt,
}: SolicitudVerificacionProps) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [solicitada, setSolicitada] = useState(false)

  const tieneDatos = Boolean(rnc?.trim() && telefono?.trim())
  const faltantes = [
    !rnc?.trim() ? 'RNC' : null,
    !telefono?.trim() ? 'teléfono' : null,
  ].filter((valor): valor is string => valor !== null)

  function solicitar() {
    setError(null)
    setSolicitada(false)
    startTransition(async () => {
      const resultado = await solicitarVerificacionProveedor()
      if ('error' in resultado && resultado.error) {
        setError(resultado.error)
      } else {
        setSolicitada(true)
      }
    })
  }

  return (
    <div className="space-y-3 px-6 py-5">
      {estado === 'verificado' && (
        <p className="flex items-center gap-2 text-sm text-green-700">
          <BadgeCheck className="h-4 w-4" aria-hidden="true" />
          <span>
            Empresa verificada{verificadoAt ? ` el ${formatearFecha(verificadoAt)}` : ''}.
          </span>
        </p>
      )}

      {estado === 'pendiente' && (
        <p className="flex items-center gap-2 text-sm text-yellow-700">
          <Clock className="h-4 w-4" aria-hidden="true" />
          <span>Solicitud pendiente — nuestro equipo está revisando tu empresa.</span>
        </p>
      )}

      {(estado === 'sin_solicitar' || estado === 'rechazado') && (
        <div className="space-y-3">
          {estado === 'rechazado' && (
            <p className="text-sm text-gray-600">
              Tu solicitud anterior fue rechazada{nota ? `: ${nota}` : '.'}
            </p>
          )}

          {tieneDatos ? (
            <>
              <p className="text-sm text-gray-500">
                Solicita que revisemos el RNC y los datos de contacto de tu empresa para obtener la
                insignia «Verificado».
              </p>
              <Button
                type="button"
                disabled={pending}
                onClick={solicitar}
                className="bg-orange-500 text-white hover:bg-orange-600"
              >
                {pending ? 'Enviando...' : 'Solicitar verificación'}
              </Button>
            </>
          ) : (
            <p className="text-sm text-gray-500">
              Para solicitar la verificación, completa {faltantes.join(' y ')} en tu perfil.{' '}
              <Link href="/proveedor/perfil" className="font-medium text-orange-500 hover:underline">
                Editar perfil
              </Link>
            </p>
          )}
        </div>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      {solicitada && !error && (
        <p className="text-sm text-green-600">
          Solicitud enviada. Nuestro equipo la revisará pronto.
        </p>
      )}
    </div>
  )
}
