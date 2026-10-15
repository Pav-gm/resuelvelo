/**
 * Página /cuenta: redirección según la sesión y el rol, y conteos y enlaces de
 * las tarjetas del comprador con datos simulados.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'

interface PerfilCuenta {
  nombre: string
  razon_social: string | null
  rnc: string | null
  telefono: string | null
  rol: string
}

const h = vi.hoisted(() => ({
  state: {
    user: null as { id: string } | null,
    perfil: null as PerfilCuenta | null,
    direcciones: [] as Array<{ id: string }>,
    direccionesError: null as unknown,
  },
  redirect: vi.fn(),
  getCotizacionesDelComprador: vi.fn(),
  getSolicitudesDelComprador: vi.fn(),
  obtenerNotificaciones: vi.fn(),
}))

vi.mock('next/navigation', () => ({
  redirect: (url: string) => {
    h.redirect(url)
    throw new Error('NEXT_REDIRECT')
  },
}))

vi.mock('next/link', () => ({
  default: ({ href, children, ...rest }: { href: string; children?: ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: h.state.user } }) },
    from: (tabla: string) => {
      if (tabla === 'profiles') {
        return {
          select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: h.state.perfil }) }) }),
        }
      }
      return {
        select: () => ({
          eq: async () => ({ data: h.state.direcciones, error: h.state.direccionesError }),
        }),
      }
    },
  }),
}))

vi.mock('@/lib/data', () => ({
  getCotizacionesDelComprador: h.getCotizacionesDelComprador,
  getSolicitudesDelComprador: h.getSolicitudesDelComprador,
}))

vi.mock('@/app/(marketplace)/notificaciones/actions', () => ({
  obtenerNotificaciones: h.obtenerNotificaciones,
}))

import CuentaPage from '@/app/(marketplace)/cuenta/page'

beforeEach(() => {
  vi.clearAllMocks()
  h.state.user = null
  h.state.perfil = null
  h.state.direcciones = []
  h.state.direccionesError = null
})

afterEach(() => {
  cleanup()
})

describe('Página de cuenta del comprador', () => {
  it('redirige a login cuando no hay sesión', async () => {
    h.state.user = null

    await expect(CuentaPage()).rejects.toThrow('NEXT_REDIRECT')

    expect(h.redirect).toHaveBeenCalledWith('/login')
    expect(h.getCotizacionesDelComprador).not.toHaveBeenCalled()
    expect(h.getSolicitudesDelComprador).not.toHaveBeenCalled()
  })

  it('redirige al panel cuando la sesión pertenece a un proveedor', async () => {
    h.state.user = { id: 'u-prov' }
    h.state.perfil = {
      nombre: 'Pavel',
      razon_social: null,
      rnc: null,
      telefono: null,
      rol: 'proveedor',
    }

    await expect(CuentaPage()).rejects.toThrow('NEXT_REDIRECT')

    expect(h.redirect).toHaveBeenCalledWith('/proveedor')
  })

  it('muestra conteos de cotizaciones, solicitudes abiertas y notificaciones sin leer', async () => {
    h.state.user = { id: 'u-1' }
    h.state.perfil = {
      nombre: 'Ana Pérez',
      razon_social: null,
      rnc: '',
      telefono: null,
      rol: 'comprador',
    }
    h.state.direcciones = []
    h.getCotizacionesDelComprador.mockResolvedValue([
      { id: 'c1', estado: 'pendiente', solicitud_id: 's1' },
      { id: 'c2', estado: 'respondida', solicitud_id: 's1' },
      { id: 'c3', estado: 'aceptada', solicitud_id: 's2' },
      { id: 'c4', estado: 'despachada', solicitud_id: null },
      { id: 'c5', estado: 'recibida', solicitud_id: null },
      { id: 'c6', estado: 'rechazada', solicitud_id: 's3' },
    ])
    h.getSolicitudesDelComprador.mockResolvedValue([{ id: 's1' }, { id: 's2' }, { id: 's3' }])
    h.obtenerNotificaciones.mockResolvedValue({ data: [], noLeidas: 3, error: null })

    render(await CuentaPage())

    expect(screen.getByText('Hola, Ana Pérez')).toBeInTheDocument()

    for (const estado of ['pendiente', 'respondida', 'aceptada', 'despachada', 'recibida']) {
      const tarjeta = screen.getByTestId(`cuenta-cotizacion-${estado}`)
      expect(tarjeta).toHaveAttribute('href', `/mis-cotizaciones?estado=${estado}`)
      expect(within(tarjeta).getByText('1')).toBeInTheDocument()
    }

    const solicitudes = screen.getByTestId('cuenta-solicitudes')
    expect(solicitudes).toHaveAttribute('href', '/solicitudes')
    expect(within(solicitudes).getByText('1')).toBeInTheDocument()

    const notificaciones = screen.getByTestId('cuenta-notificaciones')
    expect(notificaciones).toHaveAttribute('href', '/notificaciones')
    expect(within(notificaciones).getByText('3')).toBeInTheDocument()

    expect(screen.getByRole('link', { name: /Ir al catálogo/ })).toHaveAttribute('href', '/catalogo')
    expect(screen.getByRole('link', { name: /Nueva solicitud a varios proveedores/ })).toHaveAttribute(
      'href',
      '/solicitudes/nueva'
    )

    const perfil = screen.getByTestId('cuenta-perfil')
    expect(within(perfil).getByRole('link', { name: 'Mi perfil' })).toHaveAttribute('href', '/perfil')
    expect(within(perfil).getByRole('link', { name: 'Editar perfil' })).toHaveAttribute('href', '/perfil')

    expect(within(perfil).getByTestId('cuenta-perfil-razon-social')).toHaveTextContent('Pendiente')
    expect(within(perfil).getByTestId('cuenta-perfil-rnc')).toHaveTextContent('Pendiente')
    expect(within(perfil).getByTestId('cuenta-perfil-telefono')).toHaveTextContent('Pendiente')
    expect(within(perfil).getByTestId('cuenta-perfil-direccion')).toHaveTextContent('Pendiente')
  })
})
