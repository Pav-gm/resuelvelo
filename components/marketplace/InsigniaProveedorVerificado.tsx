import Link from 'next/link'
import { BadgeCheck } from 'lucide-react'

interface InsigniaProveedorVerificadoProps {
  fecha: string | null | undefined
  compacta?: boolean
}

/**
 * Insignia pública «Verificado». Solo se muestra cuando existe la fecha de
 * aprobación (`verificado_at`); el enlace explica qué se revisó y cuándo.
 */
export default function InsigniaProveedorVerificado({
  fecha,
  compacta = false,
}: InsigniaProveedorVerificadoProps) {
  if (!fecha) return null

  // La fecha de aprobación es un `timestamptz`; se formatea en UTC para que la
  // insignia muestre siempre el mismo día sin depender de la zona del servidor.
  const fechaLocalizada = new Date(fecha).toLocaleDateString('es-DO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
  const tooltip = `RNC y datos de contacto revisados por Resuélvelo el ${fechaLocalizada}`

  return (
    <Link
      href="/como-funciona#verificacion-proveedores"
      title={tooltip}
      aria-label="Verificado"
      className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-100"
    >
      <BadgeCheck className="h-3.5 w-3.5" aria-hidden="true" />
      <span className={compacta ? 'sr-only' : undefined}>Verificado</span>
    </Link>
  )
}
