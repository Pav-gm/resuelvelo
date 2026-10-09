'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, type MouseEvent, type ReactNode } from 'react'
import { marcarNotificacionLeida } from '@/app/(marketplace)/notificaciones/actions'

export interface NotificacionLinkProps {
  id: string
  leida: boolean
  href: string
  children: ReactNode
  className?: string
  onMarkedRead?: (id: string) => void
}

/**
 * Enlace de aviso: si está sin leer, espera a que la acción de servidor marque
 * la notificación como leída antes de navegar; si falla, muestra el error y se
 * queda en la vista actual. Un aviso ya leído navega directamente.
 */
export function NotificacionLink({
  id,
  leida,
  href,
  children,
  className,
  onMarkedRead,
}: NotificacionLinkProps) {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [pendiente, setPendiente] = useState(false)

  async function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    event.preventDefault()

    if (leida) {
      router.push(href)
      return
    }

    if (pendiente) return
    setPendiente(true)
    setError(null)

    const resultado = await marcarNotificacionLeida(id)

    if (resultado.error) {
      setError(resultado.error)
      setPendiente(false)
      return
    }

    onMarkedRead?.(id)
    setPendiente(false)
    router.push(href)
  }

  return (
    <>
      <Link href={href} className={className} onClick={handleClick}>
        {children}
      </Link>
      {error && (
        <span role="alert" className="mt-1 block text-xs text-red-600">
          {error}
        </span>
      )}
    </>
  )
}
