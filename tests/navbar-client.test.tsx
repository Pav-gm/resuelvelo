/**
 * Tests de NavbarClient: el carrito debe estar visible en la cabecera móvil.
 * jsdom no aplica el breakpoint `md`, así que este render representa el ancho móvil.
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

const h = vi.hoisted(() => ({
  pathname: '/catalogo',
  obtenerNotificaciones: vi.fn(),
  marcarTodasLasNotificacionesLeidas: vi.fn(),
}))

// Acción de sesión mockeada como no-op para no acoplar la prueba a la autenticación.
vi.mock('@/app/(auth)/actions', () => ({
  cerrarSesion: vi.fn(),
}))

vi.mock('@/app/(marketplace)/cotizaciones/actions', () => ({
  cotizarDesdeCarrito: vi.fn(),
}))

// Ruta actual controlada por la prueba para disparar la actualización del contador.
vi.mock('next/navigation', () => ({
  usePathname: () => h.pathname,
}))

vi.mock('next/link', () => ({
  default: ({ href, children }: { href: string; children?: ReactNode }) => (
    <a href={href}>{children}</a>
  ),
}))

// Acciones de notificaciones: se consumen desde la cabecera y se controlan aquí.
vi.mock('@/app/(marketplace)/notificaciones/actions', () => ({
  obtenerNotificaciones: h.obtenerNotificaciones,
  marcarTodasLasNotificacionesLeidas: h.marcarTodasLasNotificacionesLeidas,
}))

vi.mock('next/image', () => ({
  default: () => null,
}))

import NavbarClient from '@/components/layout/NavbarClient'
import { useCarritoStore } from '@/lib/store/carrito'
import type { Notificacion, Producto } from '@/types'

function producto(overrides: Partial<Producto> = {}): Producto {
  return {
    id: 'prod-1',
    proveedor_id: 'prov-1',
    categoria_id: 'cat-1',
    subcategoria_id: null,
    nombre: 'Tubo PVC 4"',
    precio: 680,
    unidad: 'unidad',
    stock: 5,
    activo: true,
    created_at: '',
    ...overrides,
  }
}

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

let relojFijo: { mockRestore: () => void } | null = null

beforeEach(() => {
  localStorage.clear()
  useCarritoStore.getState().vaciar()
  h.pathname = '/catalogo'
  h.obtenerNotificaciones.mockReset()
  h.obtenerNotificaciones.mockResolvedValue({ data: [], noLeidas: 0, error: null })
  h.marcarTodasLasNotificacionesLeidas.mockReset()
  h.marcarTodasLasNotificacionesLeidas.mockResolvedValue({ error: null })
})

afterEach(() => {
  cleanup()
  relojFijo?.mockRestore()
  relojFijo = null
})

describe('NavbarClient — carrito en móvil', () => {
  it('muestra el botón Carrito en la cabecera móvil y abre el drawer', () => {
    render(<NavbarClient usuario={null} />)

    // Una sola instancia del carrito: no se duplica entre móvil y escritorio.
    const botones = screen.getAllByRole('button', { name: 'Carrito' })
    expect(botones).toHaveLength(1)

    const boton = botones[0]
    // No debe quedar oculto en móvil: ningún ancestro con la clase `hidden`.
    for (let ancestro = boton.parentElement; ancestro; ancestro = ancestro.parentElement) {
      expect(ancestro.classList.contains('hidden')).toBe(false)
    }

    fireEvent.click(boton)

    expect(screen.getByText('Mi carrito')).toBeInTheDocument()
  })

  it('muestra el número de productos en el botón Carrito y su contenido en el drawer', () => {
    useCarritoStore
      .getState()
      .agregar(producto({ id: 'prod-1', nombre: 'Tubo PVC 4"', precio: 680, stock: 5 }), 2)

    render(<NavbarClient usuario={null} />)

    const boton = screen.getByRole('button', { name: 'Carrito' })
    expect(within(boton).getByText('2')).toBeInTheDocument()

    fireEvent.click(boton)

    expect(screen.getByText('Mi carrito')).toBeInTheDocument()
    expect(screen.getByText('Tubo PVC 4"')).toBeInTheDocument()
    expect(screen.getByText('$1,360.00')).toBeInTheDocument()
  })

  it('mantiene en escritorio el carrito delante de los controles de usuario', () => {
    const { container } = render(<NavbarClient usuario={null} />)

    // La barra principal (logo, nav y grupo de acciones) mantiene sus tres hijos.
    const barra = container.querySelector('header > div')
    expect(barra?.children).toHaveLength(3)

    const grupoAcciones = barra?.lastElementChild as HTMLElement
    const botonCarrito = within(grupoAcciones).getByRole('button', { name: 'Carrito' })
    const enlaceIngresar = within(grupoAcciones).getByRole('link', { name: 'Ingresar' })

    // El carrito se conserva por delante de los controles de cuenta.
    expect(
      botonCarrito.compareDocumentPosition(enlaceIngresar) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })
})

describe('NavbarClient — campana de notificaciones', () => {
  it('muestra la campana con el contador para un usuario con sesión también en móvil', async () => {
    h.obtenerNotificaciones.mockResolvedValue({ data: [], noLeidas: 3, error: null })

    render(<NavbarClient usuario={{ nombre: 'Ana', rol: 'comprador' }} />)

    const boton = await screen.findByRole('button', { name: 'Notificaciones' })
    await waitFor(() => expect(within(boton).getByText('3')).toBeInTheDocument())

    // No debe quedar oculto en móvil: ningún ancestro con la clase `hidden`.
    for (let ancestro = boton.parentElement; ancestro; ancestro = ancestro.parentElement) {
      expect(ancestro.classList.contains('hidden')).toBe(false)
    }
  })

  it('al abrir la campana carga como máximo diez notificaciones y enlaza al detalle', async () => {
    // Reloj fijo para que el tiempo relativo sea determinista.
    relojFijo = vi.spyOn(Date, 'now').mockReturnValue(
      new Date('2026-10-08T14:00:00.000Z').getTime()
    )
    h.obtenerNotificaciones.mockResolvedValue({
      data: [notificacion()],
      noLeidas: 1,
      error: null,
    })

    render(<NavbarClient usuario={{ nombre: 'Ana', rol: 'comprador' }} />)

    const boton = await screen.findByRole('button', { name: 'Notificaciones' })
    fireEvent.click(boton)

    expect(await screen.findByText('Tienes una nueva solicitud.')).toBeInTheDocument()
    expect(screen.getByText('hace 2 horas')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Nueva solicitud #COT-000042' })).toHaveAttribute(
      'href',
      '/cotizaciones/c-1'
    )
    expect(h.obtenerNotificaciones).toHaveBeenCalledWith(10)
  })

  it('actualiza el contador al cambiar de ruta y al abrir la campana', async () => {
    h.obtenerNotificaciones
      .mockResolvedValueOnce({ data: [], noLeidas: 2, error: null })
      .mockResolvedValueOnce({ data: [], noLeidas: 4, error: null })
      .mockResolvedValueOnce({ data: [], noLeidas: 1, error: null })

    const { rerender } = render(<NavbarClient usuario={{ nombre: 'Ana', rol: 'comprador' }} />)

    const boton = await screen.findByRole('button', { name: 'Notificaciones' })
    await waitFor(() => expect(within(boton).getByText('2')).toBeInTheDocument())

    h.pathname = '/proveedores'
    rerender(<NavbarClient usuario={{ nombre: 'Ana', rol: 'comprador' }} />)
    await waitFor(() => expect(within(boton).getByText('4')).toBeInTheDocument())

    fireEvent.click(boton)
    await waitFor(() => expect(within(boton).getByText('1')).toBeInTheDocument())
  })

  it('marca todas las notificaciones como leídas y actualiza el panel', async () => {
    h.obtenerNotificaciones.mockResolvedValue({
      data: [notificacion({ id: 'n-1' }), notificacion({ id: 'n-2' })],
      noLeidas: 2,
      error: null,
    })

    render(<NavbarClient usuario={{ nombre: 'Ana', rol: 'comprador' }} />)

    const boton = await screen.findByRole('button', { name: 'Notificaciones' })
    await waitFor(() => expect(within(boton).getByText('2')).toBeInTheDocument())

    fireEvent.click(boton)
    await waitFor(() => expect(screen.getAllByTestId('notificacion')).toHaveLength(2))
    expect(
      screen.getAllByTestId('notificacion').every((f) => f.getAttribute('data-leida') === 'false')
    ).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'Marcar todas como leídas' }))

    await waitFor(() => expect(h.marcarTodasLasNotificacionesLeidas).toHaveBeenCalledTimes(1))
    await waitFor(() =>
      expect(
        screen.getAllByTestId('notificacion').every((f) => f.getAttribute('data-leida') === 'true')
      ).toBe(true)
    )
    expect(boton).toHaveAttribute('data-no-leidas', '0')
  })

  it('no muestra la campana a usuarios sin sesión', () => {
    render(<NavbarClient usuario={null} />)

    expect(screen.queryByRole('button', { name: 'Notificaciones' })).toBeNull()
    expect(h.obtenerNotificaciones).not.toHaveBeenCalled()
  })
})
