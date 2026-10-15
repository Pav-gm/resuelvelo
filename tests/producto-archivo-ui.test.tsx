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
  toggleProductoConResultado: vi.fn(),
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
  toggleProductoConResultado: mocks.toggleProductoConResultado,
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
import ToggleProductoButton from '@/components/marketplace/ToggleProductoButton'
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

const PRODUCTO_ACTIVO = {
  ...PRODUCTO_ARCHIVADO,
  id: 'prod-2',
  nombre: 'Cemento',
  activo: true,
  archivado_at: null,
  tieneCotizaciones: false,
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
  it('el aviso de archivado incluye enlace a la pestaña Archivados aunque desaparezca la fila', async () => {
    mocks.archivarOEliminarProducto.mockResolvedValue({ success: true, action: 'archived' })

    const { rerender } = render(
      <ListaProductosProveedor
        productos={[{ ...PRODUCTO_ARCHIVADO, activo: true, archivado_at: null }]}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Archivar Tubo PVC' }))

    const aviso = await screen.findByRole('status')
    expect(aviso).toHaveTextContent('Producto archivado.')
    expect(within(aviso).getByRole('link', { name: 'Ver archivados' })).toHaveAttribute(
      'href',
      '/proveedor/productos?tab=archivados'
    )

    // La revalidación del servidor deja la fila fuera de la lista; el aviso
    // vive en la lista, que sigue montada, y conserva su enlace.
    rerender(<ListaProductosProveedor productos={[]} />)

    expect(screen.getByRole('status')).toHaveTextContent('Producto archivado.')
    expect(screen.getByRole('link', { name: 'Ver archivados' })).toHaveAttribute(
      'href',
      '/proveedor/productos?tab=archivados'
    )
  })

  it('restaurar un producto muestra el aviso persistente Producto restaurado', async () => {
    mocks.restaurarProducto.mockResolvedValue({ success: true, action: 'restored' })

    render(
      <ListaProductosProveedor
        productos={[PRODUCTO_ARCHIVADO]}
        mensajeVacio="No tienes productos archivados."
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Restaurar Tubo PVC' }))

    const aviso = await screen.findByRole('status')
    expect(aviso).toHaveTextContent('Producto restaurado.')
    expect(within(aviso).queryByRole('link', { name: 'Ver archivados' })).toBeNull()
  })
})

describe('ToggleProductoButton — avisos de estado', () => {
  it('ToggleProductoButton muestra avisos de desactivación y activación', async () => {
    mocks.toggleProductoConResultado.mockResolvedValue({ success: true })

    const { rerender } = render(<ToggleProductoButton id="prod-1" activo={true} />)
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }))
    expect(await screen.findByText('Producto desactivado.')).toBeInTheDocument()

    rerender(<ToggleProductoButton id="prod-1" activo={false} />)
    fireEvent.click(screen.getByRole('button', { name: 'Activar' }))
    expect(await screen.findByText('Producto activado.')).toBeInTheDocument()
  })

  it('ToggleProductoButton muestra errores de activación sin mostrar éxito', async () => {
    mocks.toggleProductoConResultado.mockResolvedValue({ error: 'update failed' })

    render(<ToggleProductoButton id="prod-1" activo={true} />)
    fireEvent.click(screen.getByRole('button', { name: 'Desactivar' }))

    const alerta = await screen.findByRole('alert')
    expect(alerta).toHaveTextContent('update failed')
    expect(screen.queryByText('Producto desactivado.')).toBeNull()
  })
})

describe('Ruta /proveedor/productos — pestaña de archivados', () => {
  it('la pestaña Archivados muestra el número de productos archivados', async () => {
    mocks.getProductosDeProveedor.mockResolvedValue([PRODUCTO_ARCHIVADO, PRODUCTO_ACTIVO])

    render(await ProductosProveedorPage({ searchParams: Promise.resolve({ tab: 'archivados' }) }))

    expect(screen.getByRole('link', { name: 'Archivados (1)' })).toHaveAttribute(
      'aria-current',
      'page'
    )
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

  it('la pestaña Archivados vacía muestra el contador cero', async () => {
    mocks.getProductosDeProveedor.mockResolvedValue([])

    render(await ProductosProveedorPage({ searchParams: Promise.resolve({ tab: 'archivados' }) }))

    expect(screen.getByRole('link', { name: 'Archivados (0)' })).toBeInTheDocument()
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
