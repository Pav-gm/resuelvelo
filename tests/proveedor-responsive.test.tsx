/**
 * Pruebas de regresión responsive del panel, la lista de productos y la
 * bandeja del proveedor: las cabeceras y filas deben poder envolver en 375 px,
 * los nombres se leen completos (sin `truncate`) y los botones de producto
 * alcanzan 44 px de alto en móvil. No se simula `scrollWidth` en jsdom.
 */
import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getProveedorDelUsuario: vi.fn(),
  getStatsProveedor: vi.fn(),
  getCotizacionesDeProveedor: vi.fn(),
  getProductosDeProveedor: vi.fn(),
  redirect: vi.fn(),
  toggleProducto: vi.fn(),
  eliminarProducto: vi.fn(),
  despacharCotizacion: vi.fn(),
  responderCotizacion: vi.fn(),
  cancelarVenta: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
}))

vi.mock('@/lib/data', () => ({
  getProveedorDelUsuario: mocks.getProveedorDelUsuario,
  getStatsProveedor: mocks.getStatsProveedor,
  getCotizacionesDeProveedor: mocks.getCotizacionesDeProveedor,
  getProductosDeProveedor: mocks.getProductosDeProveedor,
}))

vi.mock('@/app/(marketplace)/proveedor/actions', () => ({
  toggleProducto: mocks.toggleProducto,
  eliminarProducto: mocks.eliminarProducto,
  despacharCotizacion: mocks.despacharCotizacion,
}))

vi.mock('@/app/(marketplace)/cotizaciones/actions', () => ({
  responderCotizacion: mocks.responderCotizacion,
  cancelarVenta: mocks.cancelarVenta,
}))

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
  notFound: vi.fn(),
}))

vi.mock('next/link', async () => {
  const { createElement } = await import('react')
  return {
    default: ({ href, children }: { href: string; children: ReactNode }) =>
      createElement('a', { href }, children),
  }
})

import PanelProveedorPage from '@/app/(marketplace)/proveedor/page'
import ProductosProveedorPage from '@/app/(marketplace)/proveedor/productos/page'
import PedidosPage from '@/app/(marketplace)/proveedor/pedidos/page'

const USER = { id: 'user-prov' }

const PROVEEDOR = {
  id: 'prov-1',
  user_id: 'user-prov',
  nombre_empresa: 'Promeria',
  verificado: true,
  created_at: '',
}

const PRODUCTO = {
  id: 'prod-1',
  proveedor_id: 'prov-1',
  categoria_id: 'cat-1',
  subcategoria_id: null,
  nombre: 'Tubería PVC reforzada de dos pulgadas',
  precio: 125.5,
  unidad: 'unidad',
  stock: 8,
  activo: true,
  created_at: '2026-03-01T12:00:00.000Z',
}

// La cotización del plan no trae `numero`, así que el número visible se toma
// del prefijo de su id («Cotización #aaaaaaaa»).
const COTIZACION = {
  id: 'aaaaaaaa-1111-4111-8111-111111111111',
  comprador_id: 'comprador-1',
  proveedor_id: 'prov-1',
  estado: 'pendiente',
  created_at: '2026-03-15T15:00:00.000Z',
  items: [],
}

beforeEach(() => {
  mocks.getUser.mockResolvedValue({ data: { user: USER } })
  mocks.getProveedorDelUsuario.mockResolvedValue(PROVEEDOR)
  mocks.getStatsProveedor.mockResolvedValue({
    productosActivos: 1,
    cotizacionesPendientes: 1,
    sinStock: 0,
  })
  mocks.getCotizacionesDeProveedor.mockResolvedValue([])
  mocks.getProductosDeProveedor.mockResolvedValue([])
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('Panel del proveedor — adaptación a móvil', () => {
  it('el panel permite envolver la cabecera y las filas de cotizaciones', async () => {
    mocks.getCotizacionesDeProveedor.mockResolvedValue([COTIZACION])

    render(await PanelProveedorPage())

    expect(screen.getByTestId('panel-header').className).toContain('flex-wrap')
    expect(screen.getByTestId('quotes-header').className).toContain('flex-wrap')

    const fila = screen.getByTestId('quote-row')
    expect(fila.className).toContain('flex-wrap')

    const titulo = within(fila).getByText('Cotización #aaaaaaaa')
    expect(titulo.parentElement?.className).toContain('min-w-0')
  })

  it('el panel muestra el nombre completo del producto y contiene sus acciones en la fila', async () => {
    mocks.getProductosDeProveedor.mockResolvedValue([PRODUCTO])

    render(await PanelProveedorPage())

    const fila = screen.getByTestId('product-row')
    expect(fila.className).toContain('flex-wrap')
    // En el panel la lista no añade una tarjeta anidada: el panel conserva su
    // tarjeta contenedora única.
    expect(fila.parentElement?.className).not.toContain('rounded-2xl')

    const nombre = screen.getByText('Tubería PVC reforzada de dos pulgadas')
    expect(nombre.className).not.toContain('truncate')
    expect(nombre.parentElement?.className).toContain('min-w-0')

    expect(screen.getByTestId('product-actions').className).toContain('flex-wrap')

    const botones = [
      screen.getByRole('button', { name: 'Desactivar' }),
      screen.getByRole('button', { name: 'Editar' }),
      screen.getByRole('button', { name: 'Eliminar Tubería PVC reforzada de dos pulgadas' }),
    ]
    for (const boton of botones) {
      expect(fila).toContainElement(boton)
      expect(boton.className).toContain('min-h-11')
    }
  })
})

describe('Ruta /proveedor/productos — lista compartida', () => {
  it('la ruta de productos muestra la lista del proveedor autenticado', async () => {
    mocks.getProductosDeProveedor.mockResolvedValue([PRODUCTO])

    render(await ProductosProveedorPage())

    expect(screen.getByRole('heading', { name: 'Mis productos' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Nuevo producto' })).toHaveAttribute(
      'href',
      '/proveedor/productos/nuevo'
    )
    expect(screen.getByText('Tubería PVC reforzada de dos pulgadas')).toBeInTheDocument()
    const fila = screen.getByTestId('product-row')
    expect(fila.className).toContain('flex-wrap')
    // La ruta de productos sí envuelve la lista en su propia tarjeta.
    expect(fila.parentElement?.className).toContain('rounded-2xl')
  })
})

describe('Bandeja de cotizaciones — adaptación a móvil', () => {
  it('la bandeja permite envolver cabeceras y filas con nombres de artículo largos', async () => {
    mocks.getCotizacionesDeProveedor.mockResolvedValue([
      {
        ...COTIZACION,
        items: [
          {
            id: 'item-1',
            cotizacion_id: 'aaaaaaaa-1111-4111-8111-111111111111',
            producto_id: 'prod-1',
            cantidad: 2,
            precio_unitario: 125.5,
            producto: { nombre: 'Tubería PVC reforzada de dos pulgadas' },
          },
        ],
      },
    ])

    render(await PedidosPage())

    expect(screen.getByTestId('order-header').className).toContain('flex-wrap')

    const fila = screen.getByTestId('order-item-row')
    expect(fila.className).toContain('flex-wrap')

    const nombre = screen.getByText('Tubería PVC reforzada de dos pulgadas')
    expect(nombre.className).toContain('min-w-0')

    expect(screen.getByText('x2')).toBeInTheDocument()
    expect(screen.getByText('$251.00')).toBeInTheDocument()
  })
})
