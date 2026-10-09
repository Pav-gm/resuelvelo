/**
 * Pruebas de interfaz del archivado de productos: acción contextual
 * (Archivar/Eliminar/Restaurar), resultado visible, pestañas de la ruta de
 * productos, ocultación de archivados en el panel y fallback a cero de las
 * estadísticas opcionales.
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  getProveedorDelUsuario: vi.fn(),
  getStatsProveedor: vi.fn(),
  getProductosDeProveedor: vi.fn(),
  archivarOEliminarProducto: vi.fn(),
  restaurarProducto: vi.fn(),
  toggleProducto: vi.fn(),
  eliminarProducto: vi.fn(),
  solicitarVerificacionProveedor: vi.fn(),
  responderFeedbackProveedor: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: mocks.getUser } }),
}))

vi.mock('@/lib/data', () => ({
  getProveedorDelUsuario: mocks.getProveedorDelUsuario,
  getStatsProveedor: mocks.getStatsProveedor,
  getProductosDeProveedor: mocks.getProductosDeProveedor,
  getCotizacionesDeProveedor: async () => [],
  getFeedbackDeProveedor: async () => null,
}))

vi.mock('@/app/(marketplace)/proveedor/actions', () => ({
  archivarOEliminarProducto: mocks.archivarOEliminarProducto,
  restaurarProducto: mocks.restaurarProducto,
  toggleProducto: mocks.toggleProducto,
  eliminarProducto: mocks.eliminarProducto,
  solicitarVerificacionProveedor: mocks.solicitarVerificacionProveedor,
  responderFeedbackProveedor: mocks.responderFeedbackProveedor,
}))

vi.mock('next/navigation', () => ({
  redirect: mocks.redirect,
  notFound: vi.fn(),
}))

vi.mock('next/link', async () => {
  const { createElement } = await import('react')
  return {
    // El mock reenvía el resto de atributos (por ejemplo `aria-current`) para
    // poder comprobar el estado seleccionado de las pestañas.
    default: (props: {
      href: string
      children: ReactNode
      'aria-current'?: 'page'
    }) => {
      const { href, children, ...rest } = props
      return createElement('a', { href, ...rest }, children)
    },
  }
})

import EliminarProductoButton from '@/components/marketplace/EliminarProductoButton'
import ListaProductosProveedor from '@/components/marketplace/ListaProductosProveedor'
import PanelProveedorPage from '@/app/(marketplace)/proveedor/page'
import ProductosProveedorPage from '@/app/(marketplace)/proveedor/productos/page'

const USUARIO = { id: 'user-prov' }

const PROVEEDOR = {
  id: 'prov-1',
  user_id: 'user-prov',
  nombre_empresa: 'Promeria',
  verificado: true,
  created_at: '',
}

const PRODUCTO_ARCHIVADO = {
  id: 'prod-1',
  proveedor_id: 'prov-1',
  categoria_id: 'cat-1',
  subcategoria_id: null,
  nombre: 'Tubo PVC',
  precio: 125.5,
  unidad: 'unidad',
  stock: 8,
  activo: false,
  archivado_at: '2026-10-08T12:00:00.000Z',
  tieneCotizaciones: true,
  created_at: '2026-03-01T12:00:00.000Z',
}

beforeEach(() => {
  // Las acciones se confirman con `window.confirm`; en las pruebas siempre se acepta.
  vi.stubGlobal('confirm', vi.fn(() => true))
  mocks.getUser.mockResolvedValue({ data: { user: USUARIO } })
  mocks.getProveedorDelUsuario.mockResolvedValue(PROVEEDOR)
  mocks.getStatsProveedor.mockResolvedValue({
    productosActivos: 1,
    cotizacionesPendientes: 0,
    sinStock: 0,
  })
  mocks.getProductosDeProveedor.mockResolvedValue([])
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

describe('Acción de producto — archivar, eliminar y restaurar', () => {
  it('muestra Archivar y confirma el resultado al procesar un producto con cotizaciones', async () => {
    mocks.archivarOEliminarProducto.mockResolvedValue({ success: true, action: 'archived' })

    render(<EliminarProductoButton id="prod-1" nombre="Tubo PVC" tieneCotizaciones />)

    const boton = screen.getByRole('button', { name: 'Archivar Tubo PVC' })
    fireEvent.click(boton)

    const estado = await screen.findByRole('status')
    expect(estado).toHaveTextContent('Producto archivado.')
    expect(mocks.archivarOEliminarProducto).toHaveBeenCalledWith('prod-1')
  })

  it('muestra Eliminar y confirma el resultado al procesar un producto sin cotizaciones', async () => {
    mocks.archivarOEliminarProducto.mockResolvedValue({ success: true, action: 'deleted' })

    render(<EliminarProductoButton id="prod-1" nombre="Tubo PVC" tieneCotizaciones={false} />)

    const boton = screen.getByRole('button', { name: 'Eliminar Tubo PVC' })
    fireEvent.click(boton)

    const estado = await screen.findByRole('status')
    expect(estado).toHaveTextContent('Producto eliminado.')
    expect(mocks.archivarOEliminarProducto).toHaveBeenCalledWith('prod-1')
  })

  it('muestra el error devuelto por la acción de producto', async () => {
    mocks.archivarOEliminarProducto.mockResolvedValue({
      error: 'No se pudo actualizar el producto.',
    })

    render(<EliminarProductoButton id="prod-1" nombre="Tubo PVC" tieneCotizaciones />)
    fireEvent.click(screen.getByRole('button', { name: 'Archivar Tubo PVC' }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('No se pudo actualizar el producto.')
  })
})

describe('Lista de productos — aviso persistente', () => {
  it('el aviso de archivado sigue visible cuando la fila desaparece', async () => {
    mocks.archivarOEliminarProducto.mockResolvedValue({ success: true, action: 'archived' })

    const { rerender } = render(
      <ListaProductosProveedor
        productos={[{ ...PRODUCTO_ARCHIVADO, activo: true, archivado_at: null }]}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Archivar Tubo PVC' }))

    const aviso = await screen.findByRole('status')
    expect(aviso).toHaveTextContent('Producto archivado.')

    // La revalidación del servidor deja la fila fuera de la lista; el aviso
    // vive en la lista, que sigue montada.
    rerender(<ListaProductosProveedor productos={[]} />)

    expect(screen.getByRole('status')).toHaveTextContent('Producto archivado.')
  })
})

describe('Ruta /proveedor/productos — pestaña de archivados', () => {
  it('la pestaña Archivados muestra productos archivados con acción Restaurar', async () => {
    mocks.getProductosDeProveedor.mockResolvedValue([PRODUCTO_ARCHIVADO])

    render(await ProductosProveedorPage({ searchParams: Promise.resolve({ tab: 'archivados' }) }))

    expect(screen.getByRole('link', { name: 'Archivados' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Productos' })).not.toHaveAttribute('aria-current')
    expect(screen.getByText('Tubo PVC')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Restaurar Tubo PVC' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Archivar Tubo PVC' })).toBeNull()
  })

  it('la pestaña Archivados no ofrece Activar', async () => {
    mocks.getProductosDeProveedor.mockResolvedValue([PRODUCTO_ARCHIVADO])

    render(await ProductosProveedorPage({ searchParams: Promise.resolve({ tab: 'archivados' }) }))

    expect(screen.queryByRole('button', { name: 'Activar' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Restaurar Tubo PVC' })).toBeInTheDocument()
  })

  it('la pestaña Archivados vacía lo dice', async () => {
    mocks.getProductosDeProveedor.mockResolvedValue([])

    render(await ProductosProveedorPage({ searchParams: Promise.resolve({ tab: 'archivados' }) }))

    expect(screen.getByText('No tienes productos archivados.')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Publicar ahora' })).toBeNull()
  })
})

describe('Panel del proveedor — estadísticas', () => {
  it('el panel usa cero para estadísticas opcionales ausentes', async () => {
    mocks.getStatsProveedor.mockResolvedValue({
      productosActivos: 1,
      cotizacionesPendientes: 0,
      sinStock: 0,
    })

    render(await PanelProveedorPage())

    const tarjeta = screen.getByText('Pedidos este mes').closest('div') as HTMLElement
    expect(within(tarjeta).getByText('0')).toBeInTheDocument()
    expect(within(tarjeta).getByText('Vendido: RD$ 0.00')).toBeInTheDocument()
  })
})
