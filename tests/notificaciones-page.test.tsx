/**
 * Página /notificaciones: lista completa de avisos propios, enlaces al detalle
 * de la cotización, estado vacío y error de lectura devuelto por el servidor.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { MouseEventHandler, ReactNode } from 'react'
import type { Notificacion } from '@/types'

const h = vi.hoisted(() => ({
  push: vi.fn(),
  obtenerNotificaciones: vi.fn(),
  marcarNotificacionLeida: vi.fn(),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    onClick,
    className,
  }: {
    href: string
    children?: ReactNode
    onClick?: MouseEventHandler<HTMLAnchorElement>
    className?: string
  }) => (
    <a href={href} onClick={onClick} className={className}>
      {children}
    </a>
  ),
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: h.push }),
}))

vi.mock('@/app/(marketplace)/notificaciones/actions', () => ({
  obtenerNotificaciones: h.obtenerNotificaciones,
  marcarNotificacionLeida: h.marcarNotificacionLeida,
}))

import NotificacionesPage from '@/app/(marketplace)/notificaciones/page'

function notificacion(overrides: Partial<Notificacion> = {}): Notificacion {
  return {
    id: 'n-1',
    user_id: 'u-1',
    tipo: 'nueva_solicitud',
    cotizacion_id: 'c-1',
    titulo: 'Nueva solicitud #COT-000042',
    cuerpo: 'Tienes una nueva solicitud.',
    leida_at: null,
    created_at: '2026-10-08T12:00:00.000Z',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  h.marcarNotificacionLeida.mockResolvedValue({ error: null })
})

afterEach(() => {
  cleanup()
})

describe('Página de notificaciones', () => {
  it('muestra la lista completa y enlaza cada aviso con su cotización', async () => {
    h.obtenerNotificaciones.mockResolvedValue({
      data: [
        notificacion({ id: 'n-1', cotizacion_id: 'c-1', created_at: '2026-10-08T18:53:00.000Z' }),
        notificacion({
          id: 'n-2',
          tipo: 'cotizacion_cancelada',
          cotizacion_id: null,
          titulo: 'Cotización cancelada #COT-000043',
          cuerpo: 'La cotización fue cancelada por falta de stock.',
          leida_at: '2026-10-08T13:00:00.000Z',
          created_at: '2026-10-08T11:00:00.000Z',
        }),
      ],
      noLeidas: 1,
      error: null,
    })

    render(await NotificacionesPage())

    expect(screen.getByText('Tienes una nueva solicitud.')).toBeInTheDocument()
    expect(
      screen.getByText('La cotización fue cancelada por falta de stock.')
    ).toBeInTheDocument()

    expect(screen.getByRole('link', { name: 'Nueva solicitud #COT-000042' })).toHaveAttribute(
      'href',
      '/cotizaciones/c-1'
    )

    // La fila sin cotización asociada se muestra sin enlace al detalle.
    expect(screen.getByText('Cotización cancelada #COT-000043')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Cotización cancelada #COT-000043' })).toBeNull()
    expect(screen.getByText('8 de octubre de 2026, 02:53 p. m.')).toBeInTheDocument()
    expect(h.obtenerNotificaciones).toHaveBeenCalledWith()
  })

  it('muestra un estado vacío cuando no hay notificaciones', async () => {
    h.obtenerNotificaciones.mockResolvedValue({ data: [], noLeidas: 0, error: null })

    render(await NotificacionesPage())

    expect(screen.getByText('No tienes notificaciones.')).toBeInTheDocument()
  })

  it('muestra el error de lectura devuelto por el servidor', async () => {
    h.obtenerNotificaciones.mockResolvedValue({
      data: [],
      noLeidas: 0,
      error: 'No se pudieron cargar las notificaciones.',
    })

    render(await NotificacionesPage())

    expect(screen.getByText('No se pudieron cargar las notificaciones.')).toBeInTheDocument()
    expect(screen.queryByTestId('notificacion')).toBeNull()
  })

  it('marca como leída una notificación no leída antes de navegar a su cotización', async () => {
    h.obtenerNotificaciones.mockResolvedValue({
      data: [notificacion({ id: 'n-1', cotizacion_id: 'c-1', leida_at: null })],
      noLeidas: 1,
      error: null,
    })

    render(await NotificacionesPage())

    fireEvent.click(screen.getByRole('link', { name: 'Nueva solicitud #COT-000042' }))

    await waitFor(() => expect(h.marcarNotificacionLeida).toHaveBeenCalledWith('n-1'))
    await waitFor(() => expect(h.push).toHaveBeenCalledWith('/cotizaciones/c-1'))
  })
})
