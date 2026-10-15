/**
 * Tests de NavbarClient: el carrito debe estar visible en la cabecera móvil.
 * jsdom no aplica el breakpoint `md`, así que este render representa el ancho móvil.
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AnchorHTMLAttributes, ReactNode } from 'react'

const h = vi.hoisted(() => ({
  pathname: '/catalogo',
  push: vi.fn(),
  obtenerNotificaciones: vi.fn(),
  marcarTodasLasNotificacionesLeidas: vi.fn(),
  marcarNotificacionLeida: vi.fn(),
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
  useRouter: () => ({ push: h.push }),
}))

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: { href: string; children?: ReactNode } & AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

// Acciones de notificaciones: se consumen desde la cabecera y se controlan aquí.
vi.mock('@/app/(marketplace)/notificaciones/actions', () => ({
  obtenerNotificaciones: h.obtenerNotificaciones,
  marcarTodasLasNotificacionesLeidas: h.marcarTodasLasNotificacionesLeidas,
  marcarNotificacionLeida: h.marcarNotificacionLeida,
}))

vi.mock('next/image', () => ({
  default: () => null,
}))

import NavbarClient from '@/components/layout/NavbarClient'
import { cerrarSesion } from '@/app/(auth)/actions'
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
  h.push.mockReset()
  h.obtenerNotificaciones.mockReset()
  h.obtenerNotificaciones.mockResolvedValue({ data: [], noLeidas: 0, error: null })
  h.marcarTodasLasNotificacionesLeidas.mockReset()
  h.marcarTodasLasNotificacionesLeidas.mockResolvedValue({ error: null })
  h.marcarNotificacionLeida.mockReset()
  h.marcarNotificacionLeida.mockResolvedValue({ error: null })
  vi.mocked(cerrarSesion).mockReset()
})

afterEach(() => {
  cleanup()
  relojFijo?.mockRestore()
  relojFijo = null
})

describe('NavbarClient — carrito en móvil', () => {
  it('muestra el botón Carrito en la cabecera móvil y abre el drawer', () => {
    render(<NavbarClient usuario={null} direccionesObra={[]} />)

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

    render(<NavbarClient usuario={null} direccionesObra={[]} />)

    const boton = screen.getByRole('button', { name: 'Carrito' })
    expect(within(boton).getByText('2')).toBeInTheDocument()

    fireEvent.click(boton)

    expect(screen.getByText('Mi carrito')).toBeInTheDocument()
    expect(screen.getByText('Tubo PVC 4"')).toBeInTheDocument()
    expect(screen.getByText('RD$ 1,360.00')).toBeInTheDocument()
  })

  it('mantiene en escritorio el carrito delante de los controles de usuario', () => {
    const { container } = render(<NavbarClient usuario={null} direccionesObra={[]} />)

    // La barra principal (logo, nav y grupo de acciones) mantiene sus tres hijos.
    const barra = container.querySelector('header > div')
    expect(barra?.children).toHaveLength(3)

    const grupoAcciones = barra?.lastElementChild as HTMLElement
    const botonCarrito = within(grupoAcciones).getByRole('button', { name: 'Carrito' })
    const enlaceIngresar = within(grupoAcciones).getByRole('link', { name: 'Iniciar sesión' })

    // El carrito se conserva por delante de los controles de cuenta.
    expect(
      botonCarrito.compareDocumentPosition(enlaceIngresar) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })
})

describe('NavbarClient — menú de cuenta y navegación', () => {
  it('el menú del comprador muestra sus opciones en el orden definido y la identidad de la cuenta', async () => {
    h.obtenerNotificaciones.mockResolvedValue({ data: [], noLeidas: 2, error: null })

    render(
      <NavbarClient
        usuario={{ nombre: 'Constructora Ana', email: 'ana@example.com', rol: 'comprador' }}
        direccionesObra={[]}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Constructora Ana' }))
    const menu = screen.getByRole('menu')

    expect(within(menu).getByText('Constructora Ana')).toBeInTheDocument()
    expect(within(menu).getByText('ana@example.com')).toBeInTheDocument()
    expect(within(menu).getByText('Comprador')).toBeInTheDocument()

    const items = within(menu).getAllByRole('menuitem')
    expect(items.slice(0, 6).map((item) => item.getAttribute('href'))).toEqual([
      '/cuenta',
      '/mis-cotizaciones',
      '/solicitudes',
      '/solicitudes/nueva',
      '/notificaciones',
      '/perfil',
    ])

    const notificaciones = within(menu).getByRole('menuitem', { name: /Notificaciones/ })
    await waitFor(() => expect(within(notificaciones).getByText('2')).toBeInTheDocument())

    expect(within(menu).getByRole('separator')).toBeInTheDocument()
    expect(items[items.length - 1]).toHaveTextContent('Cerrar sesión')
  })

  it('el menú del proveedor muestra sus opciones en el orden definido', () => {
    render(
      <NavbarClient
        usuario={{ nombre: 'Ferretería Norte', email: 'ventas@example.com', rol: 'proveedor' }}
        direccionesObra={[]}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Ferretería Norte' }))
    const menu = screen.getByRole('menu')

    expect(within(menu).getByText('Ferretería Norte')).toBeInTheDocument()
    expect(within(menu).getByText('ventas@example.com')).toBeInTheDocument()
    expect(within(menu).getByText('Proveedor')).toBeInTheDocument()

    const items = within(menu).getAllByRole('menuitem')
    expect(items.slice(0, 7).map((item) => item.getAttribute('href'))).toEqual([
      '/proveedor',
      '/proveedor/pedidos',
      '/proveedor/productos',
      '/proveedor/productos?tab=archivados',
      '/proveedor/productos/nuevo',
      '/notificaciones',
      '/proveedor/perfil',
    ])

    expect(within(menu).getByRole('separator')).toBeInTheDocument()
    expect(items[items.length - 1]).toHaveTextContent('Cerrar sesión')
  })

  it('el menú del administrador conserva Administración y añade Notificaciones', () => {
    render(
      <NavbarClient
        usuario={{ nombre: 'Admin', email: 'admin@example.com', rol: 'admin' }}
        direccionesObra={[]}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Admin' }))
    const menu = screen.getByRole('menu')

    expect(within(menu).getByText('Admin')).toBeInTheDocument()
    expect(within(menu).getByText('admin@example.com')).toBeInTheDocument()
    expect(within(menu).getByText('Administrador')).toBeInTheDocument()

    const items = within(menu).getAllByRole('menuitem')
    expect(items.slice(0, 2).map((item) => item.getAttribute('href'))).toEqual([
      '/admin',
      '/notificaciones',
    ])

    expect(within(menu).getByRole('separator')).toBeInTheDocument()
    expect(items[items.length - 1]).toHaveTextContent('Cerrar sesión')
  })

  it('el botón de cuenta expone los atributos ARIA y abre el menú', () => {
    render(
      <NavbarClient
        usuario={{ nombre: 'Ana', email: 'ana@example.com', rol: 'comprador' }}
        direccionesObra={[]}
      />
    )

    const boton = screen.getByRole('button', { name: 'Ana' })
    expect(boton).toHaveAttribute('aria-haspopup', 'menu')
    expect(boton).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(boton)

    expect(boton).toHaveAttribute('aria-expanded', 'true')
    const menu = document.getElementById(boton.getAttribute('aria-controls') ?? '') as HTMLElement
    expect(menu).toHaveAttribute('role', 'menu')
    expect(within(menu).getAllByRole('menuitem')[0]).toHaveFocus()
  })

  it('Escape cierra el menú y devuelve el foco al botón de cuenta', () => {
    render(
      <NavbarClient
        usuario={{ nombre: 'Ana', email: 'ana@example.com', rol: 'comprador' }}
        direccionesObra={[]}
      />
    )

    const boton = screen.getByRole('button', { name: 'Ana' })
    fireEvent.click(boton)

    const menu = screen.getByRole('menu')
    const primero = within(menu).getAllByRole('menuitem')[0]
    expect(primero).toHaveFocus()

    fireEvent.keyDown(primero, { key: 'Escape' })

    expect(screen.queryByRole('menu')).toBeNull()
    expect(boton).toHaveAttribute('aria-expanded', 'false')
    expect(boton).toHaveFocus()
  })

  it('un clic fuera cierra el menú de cuenta', () => {
    render(
      <NavbarClient
        usuario={{ nombre: 'Ana', email: 'ana@example.com', rol: 'comprador' }}
        direccionesObra={[]}
      />
    )

    const boton = screen.getByRole('button', { name: 'Ana' })
    fireEvent.click(boton)
    expect(screen.getByRole('menu')).toBeInTheDocument()

    fireEvent.mouseDown(document.body)

    expect(screen.queryByRole('menu')).toBeNull()
    expect(boton).toHaveAttribute('aria-expanded', 'false')
  })

  it('elegir una opción cierra el menú de cuenta', () => {
    render(
      <NavbarClient
        usuario={{ nombre: 'Ana', email: 'ana@example.com', rol: 'comprador' }}
        direccionesObra={[]}
      />
    )

    const boton = screen.getByRole('button', { name: 'Ana' })
    fireEvent.click(boton)

    const menu = screen.getByRole('menu')
    const miCuenta = within(menu).getByRole('menuitem', { name: 'Mi cuenta' })
    expect(miCuenta).toHaveAttribute('href', '/cuenta')

    fireEvent.click(miCuenta)

    expect(screen.queryByRole('menu')).toBeNull()
    expect(boton).toHaveAttribute('aria-expanded', 'false')
  })

  it('elegir Cerrar sesión en el menú de cuenta ejecuta cerrarSesion y cierra el menú', async () => {
    render(
      <NavbarClient
        usuario={{ nombre: 'Ana', email: 'ana@example.com', rol: 'comprador' }}
        direccionesObra={[]}
      />
    )

    const boton = screen.getByRole('button', { name: 'Ana' })
    fireEvent.click(boton)

    fireEvent.click(
      within(screen.getByRole('menu')).getByRole('menuitem', { name: /Cerrar sesión/ })
    )

    await waitFor(() => expect(vi.mocked(cerrarSesion)).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('menu')).toBeNull()
    expect(boton).toHaveAttribute('aria-expanded', 'false')
  })

  it('el menú permite recorrer opciones con flechas, Home y End', () => {
    render(
      <NavbarClient
        usuario={{ nombre: 'Ana', email: 'ana@example.com', rol: 'comprador' }}
        direccionesObra={[]}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Ana' }))
    const items = within(screen.getByRole('menu')).getAllByRole('menuitem')
    expect(items[0]).toHaveFocus()

    items[0].focus()
    fireEvent.keyDown(items[0], { key: 'ArrowDown' })
    expect(items[1]).toHaveFocus()

    items[0].focus()
    fireEvent.keyDown(items[0], { key: 'ArrowUp' })
    expect(items[items.length - 1]).toHaveFocus()

    items[items.length - 1].focus()
    fireEvent.keyDown(items[items.length - 1], { key: 'Home' })
    expect(items[0]).toHaveFocus()

    items[0].focus()
    fireEvent.keyDown(items[0], { key: 'End' })
    expect(items[items.length - 1]).toHaveFocus()
  })

  it('la barra sin sesión muestra navegación pública e Iniciar sesión', () => {
    render(<NavbarClient usuario={null} direccionesObra={[]} />)

    const principal = screen.getByRole('navigation', { name: 'Navegación principal' })
    expect(within(principal).getByRole('link', { name: 'Catálogo' })).toHaveAttribute('href', '/catalogo')
    expect(within(principal).getByRole('link', { name: 'Proveedores' })).toHaveAttribute('href', '/proveedores')
    expect(within(principal).getByRole('link', { name: 'Cómo funciona' })).toHaveAttribute('href', '/como-funciona')

    fireEvent.click(screen.getByRole('button', { name: 'Menú' }))
    const movil = screen.getByRole('navigation', { name: 'Navegación móvil' })
    expect(within(movil).getByRole('link', { name: 'Catálogo' })).toHaveAttribute('href', '/catalogo')
    expect(within(movil).getByRole('link', { name: 'Proveedores' })).toHaveAttribute('href', '/proveedores')
    expect(within(movil).getByRole('link', { name: 'Cómo funciona' })).toHaveAttribute('href', '/como-funciona')
    expect(within(movil).getByRole('link', { name: 'Iniciar sesión' })).toHaveAttribute('href', '/login')

    const iniciar = screen.getAllByRole('link', { name: 'Iniciar sesión' })
    expect(iniciar.length).toBeGreaterThan(0)
    for (const enlace of iniciar) {
      expect(enlace).toHaveAttribute('href', '/login')
    }

    expect(screen.queryByRole('link', { name: 'Registrarse' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Mis cotizaciones' })).toBeNull()
    expect(document.querySelector('[aria-haspopup="menu"]')).toBeNull()
  })

  it('la navegación superior del comprador muestra Catálogo, Proveedores, cotizaciones y solicitudes', () => {
    h.pathname = '/solicitudes'

    render(
      <NavbarClient
        usuario={{ nombre: 'Ana', email: 'ana@example.com', rol: 'comprador' }}
        direccionesObra={[]}
      />
    )

    const principal = screen.getByRole('navigation', { name: 'Navegación principal' })
    expect(within(principal).getByRole('link', { name: 'Catálogo' })).toHaveAttribute('href', '/catalogo')
    expect(within(principal).getByRole('link', { name: 'Proveedores' })).toHaveAttribute('href', '/proveedores')
    expect(within(principal).getByRole('link', { name: 'Mis cotizaciones' })).toHaveAttribute('href', '/mis-cotizaciones')
    expect(within(principal).getByRole('link', { name: 'Mis solicitudes' })).toHaveAttribute('href', '/solicitudes')

    const activos = within(principal)
      .getAllByRole('link')
      .filter((enlace) => enlace.getAttribute('aria-current') === 'page')
    expect(activos).toHaveLength(1)
    expect(activos[0]).toHaveAttribute('href', '/solicitudes')
  })

  it('la navegación superior del proveedor muestra Panel, Pedidos y Productos', () => {
    h.pathname = '/proveedor/productos'

    render(
      <NavbarClient
        usuario={{ nombre: 'Ferretería Norte', email: 'ventas@example.com', rol: 'proveedor' }}
        direccionesObra={[]}
      />
    )

    const principal = screen.getByRole('navigation', { name: 'Navegación principal' })
    expect(within(principal).getByRole('link', { name: 'Panel' })).toHaveAttribute('href', '/proveedor')
    expect(within(principal).getByRole('link', { name: 'Pedidos' })).toHaveAttribute('href', '/proveedor/pedidos')
    expect(within(principal).getByRole('link', { name: 'Productos' })).toHaveAttribute('href', '/proveedor/productos')

    const activos = within(principal)
      .getAllByRole('link')
      .filter((enlace) => enlace.getAttribute('aria-current') === 'page')
    expect(activos).toHaveLength(1)
    expect(activos[0]).toHaveAttribute('href', '/proveedor/productos')
  })

  it('el menú móvil agrupa los accesos del comprador bajo su nombre y deja Cerrar sesión al final', async () => {
    h.obtenerNotificaciones.mockResolvedValue({ data: [], noLeidas: 3, error: null })

    render(
      <NavbarClient
        usuario={{ nombre: 'Ana', email: 'ana@example.com', rol: 'comprador' }}
        direccionesObra={[]}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Menú' }))
    const movil = screen.getByRole('navigation', { name: 'Navegación móvil' })

    expect(within(movil).getByRole('link', { name: 'Catálogo' })).toBeInTheDocument()
    expect(within(movil).getByRole('link', { name: 'Proveedores' })).toBeInTheDocument()
    expect(within(movil).getByText('Ana')).toBeInTheDocument()

    const opciones = within(movil)
      .getAllByRole('link')
      .map((enlace) => enlace.getAttribute('href'))
      .filter((href) =>
        ['/cuenta', '/mis-cotizaciones', '/solicitudes', '/solicitudes/nueva', '/notificaciones', '/perfil'].includes(
          href ?? ''
        )
      )
    expect(opciones).toEqual([
      '/cuenta',
      '/mis-cotizaciones',
      '/solicitudes',
      '/solicitudes/nueva',
      '/notificaciones',
      '/perfil',
    ])

    const notificaciones = within(movil).getByRole('link', { name: /Notificaciones/ })
    await waitFor(() => expect(within(notificaciones).getByText('3')).toBeInTheDocument())

    const interactivos = movil.querySelectorAll('a, button')
    expect(interactivos[interactivos.length - 1] as HTMLElement).toHaveTextContent('Cerrar sesión')
  })

  it('el menú móvil del proveedor incluye Catálogo y las opciones de cuenta agrupadas bajo la empresa', () => {
    render(
      <NavbarClient
        usuario={{ nombre: 'Ferretería Norte', email: 'ventas@example.com', rol: 'proveedor' }}
        direccionesObra={[]}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Menú' }))
    const movil = screen.getByRole('navigation', { name: 'Navegación móvil' })

    expect(within(movil).getByRole('link', { name: 'Catálogo' })).toHaveAttribute('href', '/catalogo')
    expect(within(movil).getByText('Ferretería Norte')).toBeInTheDocument()

    const opciones = within(movil)
      .getAllByRole('link')
      .map((enlace) => enlace.getAttribute('href'))
      .filter((href) => href === '/notificaciones' || (href?.startsWith('/proveedor') ?? false))
    expect(opciones).toEqual([
      '/proveedor',
      '/proveedor/pedidos',
      '/proveedor/productos',
      '/proveedor/productos?tab=archivados',
      '/proveedor/productos/nuevo',
      '/notificaciones',
      '/proveedor/perfil',
    ])

    const interactivos = movil.querySelectorAll('a, button')
    expect(interactivos[interactivos.length - 1] as HTMLElement).toHaveTextContent('Cerrar sesión')
  })
})

describe('NavbarClient — campana de notificaciones', () => {
  it('muestra la campana con el contador para un usuario con sesión también en móvil', async () => {
    h.obtenerNotificaciones.mockResolvedValue({ data: [], noLeidas: 3, error: null })

    render(<NavbarClient usuario={{ nombre: 'Ana', email: 'ana@example.com', rol: 'comprador' }} direccionesObra={[]} />)

    const boton = await screen.findByRole('button', { name: 'Notificaciones' })
    await waitFor(() => expect(within(boton).getByText('3')).toBeInTheDocument())

    // No debe quedar oculto en móvil: ningún ancestro con la clase `hidden`.
    for (let ancestro = boton.parentElement; ancestro; ancestro = ancestro.parentElement) {
      expect(ancestro.classList.contains('hidden')).toBe(false)
    }
  })

  it('al abrir la campana muestra la fecha y hora de Santo Domingo', async () => {
    // Reloj fijo para que la fecha sea determinista.
    relojFijo = vi.spyOn(Date, 'now').mockReturnValue(
      new Date('2026-10-08T14:00:00.000Z').getTime()
    )
    h.obtenerNotificaciones.mockResolvedValue({
      data: [notificacion()],
      noLeidas: 1,
      error: null,
    })

    render(<NavbarClient usuario={{ nombre: 'Ana', email: 'ana@example.com', rol: 'comprador' }} direccionesObra={[]} />)

    const boton = await screen.findByRole('button', { name: 'Notificaciones' })
    fireEvent.click(boton)

    expect(await screen.findByText('Tienes una nueva solicitud.')).toBeInTheDocument()
    expect(screen.queryByText('hace 2 horas')).toBeNull()
    expect(screen.getByText('8 de octubre de 2026, 8:00 a. m.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Nueva solicitud #COT-000042' })).toHaveAttribute(
      'href',
      '/cotizaciones/c-1'
    )
    expect(h.obtenerNotificaciones).toHaveBeenCalledWith(10)
  })

  it('marca como leída una notificación no leída antes de navegar y baja el contador', async () => {
    h.obtenerNotificaciones.mockResolvedValue({
      data: [notificacion({ id: 'n-1', cotizacion_id: 'c-1', leida_at: null })],
      noLeidas: 1,
      error: null,
    })

    render(<NavbarClient usuario={{ nombre: 'Ana', email: 'ana@example.com', rol: 'comprador' }} direccionesObra={[]} />)

    const boton = await screen.findByRole('button', { name: 'Notificaciones' })
    fireEvent.click(boton)

    const enlace = await screen.findByRole('link', { name: 'Nueva solicitud #COT-000042' })
    fireEvent.click(enlace)

    await waitFor(() => expect(h.marcarNotificacionLeida).toHaveBeenCalledWith('n-1'))
    await waitFor(() =>
      expect(screen.getByTestId('notificacion')).toHaveAttribute('data-leida', 'true')
    )
    await waitFor(() => expect(boton).toHaveAttribute('data-no-leidas', '0'))
    await waitFor(() => expect(h.push).toHaveBeenCalledWith('/cotizaciones/c-1'))
  })

  it('cierra el panel al navegar desde un aviso', async () => {
    h.obtenerNotificaciones.mockResolvedValue({
      data: [notificacion({ id: 'n-1', cotizacion_id: 'c-1', leida_at: '2026-10-08T12:30:00.000Z' })],
      noLeidas: 0,
      error: null,
    })

    const { rerender } = render(<NavbarClient usuario={{ nombre: 'Ana', email: 'ana@example.com', rol: 'comprador' }} direccionesObra={[]} />)

    const boton = await screen.findByRole('button', { name: 'Notificaciones' })
    fireEvent.click(boton)

    const enlace = await screen.findByRole('link', { name: 'Nueva solicitud #COT-000042' })
    fireEvent.click(enlace)

    expect(h.marcarNotificacionLeida).not.toHaveBeenCalled()
    await waitFor(() => expect(h.push).toHaveBeenCalledWith('/cotizaciones/c-1'))

    h.pathname = '/cotizaciones/c-1'
    rerender(<NavbarClient usuario={{ nombre: 'Ana', email: 'ana@example.com', rol: 'comprador' }} direccionesObra={[]} />)

    expect(screen.queryByTestId('notificacion')).toBeNull()
  })

  it('si falla marcar como leída muestra el error y no navega', async () => {
    h.obtenerNotificaciones.mockResolvedValue({
      data: [notificacion({ id: 'n-1', cotizacion_id: 'c-1', leida_at: null })],
      noLeidas: 1,
      error: null,
    })
    h.marcarNotificacionLeida.mockResolvedValue({
      error: 'No se pudo marcar la notificación como leída.',
    })

    render(<NavbarClient usuario={{ nombre: 'Ana', email: 'ana@example.com', rol: 'comprador' }} direccionesObra={[]} />)

    const boton = await screen.findByRole('button', { name: 'Notificaciones' })
    fireEvent.click(boton)

    const enlace = await screen.findByRole('link', { name: 'Nueva solicitud #COT-000042' })
    fireEvent.click(enlace)

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('No se pudo marcar la notificación como leída.')
    expect(h.push).not.toHaveBeenCalled()
    expect(screen.getByTestId('notificacion')).toHaveAttribute('data-leida', 'false')
    expect(boton).toHaveAttribute('data-no-leidas', '1')
  })
  it('actualiza el contador al cambiar de ruta y al abrir la campana', async () => {
    h.obtenerNotificaciones
      .mockResolvedValueOnce({ data: [], noLeidas: 2, error: null })
      .mockResolvedValueOnce({ data: [], noLeidas: 4, error: null })
      .mockResolvedValueOnce({ data: [], noLeidas: 1, error: null })

    const { rerender } = render(<NavbarClient usuario={{ nombre: 'Ana', email: 'ana@example.com', rol: 'comprador' }} direccionesObra={[]} />)

    const boton = await screen.findByRole('button', { name: 'Notificaciones' })
    await waitFor(() => expect(within(boton).getByText('2')).toBeInTheDocument())

    h.pathname = '/proveedores'
    rerender(<NavbarClient usuario={{ nombre: 'Ana', email: 'ana@example.com', rol: 'comprador' }} direccionesObra={[]} />)
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

    render(<NavbarClient usuario={{ nombre: 'Ana', email: 'ana@example.com', rol: 'comprador' }} direccionesObra={[]} />)

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
    render(<NavbarClient usuario={null} direccionesObra={[]} />)

    expect(screen.queryByRole('button', { name: 'Notificaciones' })).toBeNull()
    expect(h.obtenerNotificaciones).not.toHaveBeenCalled()
  })
})
