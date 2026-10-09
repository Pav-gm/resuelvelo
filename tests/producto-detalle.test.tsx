/**
 * Tests de la ficha pública de producto (página de servidor).
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ProductoPage from '@/app/(marketplace)/productos/[id]/page'
import type { Producto } from '@/types'

const mocks = vi.hoisted(() => ({
  getProductoMock: vi.fn(),
  getFeedbackDeProveedorMock: vi.fn(),
  notFoundMock: vi.fn(),
  redirectMock: vi.fn(),
}))

vi.mock('@/lib/data', () => ({
  getProducto: mocks.getProductoMock,
  getFeedbackDeProveedor: mocks.getFeedbackDeProveedorMock,
}))

vi.mock('next/navigation', () => ({
  notFound: mocks.notFoundMock,
  redirect: mocks.redirectMock,
}))

function producto(overrides: Partial<Producto> = {}): Producto {
  return {
    id: 'prod-1',
    nombre: 'Tubo PVC',
    descripcion: 'PVC sanitario',
    proveedor_id: 'prov-1',
    categoria_id: 'cat-1',
    subcategoria_id: 'sub-1',
    precio: 1234.56,
    unidad: 'unidad',
    stock: 8,
    imagen_url: 'https://ejemplo.test/tubo.jpg',
    sku: 'PVC-04',
    especificaciones: 'Diámetro 4 pulgadas',
    itbis_incluido: true,
    activo: true,
    created_at: '',
    proveedor: {
      id: 'prov-1',
      user_id: 'user-1',
      nombre_empresa: 'Promeria',
      verificado: true,
      verificacion_estado: 'verificado',
      verificado_at: '2026-01-02T00:00:00.000Z',
      created_at: '',
    },
    categoria: { id: 'cat-1', nombre: 'Plomería', slug: 'plomeria' },
    subcategoria: {
      id: 'sub-1',
      categoria_id: 'cat-1',
      nombre: 'Tuberías',
      slug: 'tuberias',
    },
    ...overrides,
  }
}

async function renderFicha() {
  const ui = await ProductoPage({ params: Promise.resolve({ id: 'prod-1' }) })
  render(ui)
}

beforeEach(() => {
  mocks.getFeedbackDeProveedorMock.mockResolvedValue({ reseñas: [], promedio: 0, conteo: 0 })
})

afterEach(() => {
  cleanup()
  mocks.getProductoMock.mockReset()
  mocks.getFeedbackDeProveedorMock.mockReset()
  mocks.notFoundMock.mockReset()
  mocks.redirectMock.mockReset()
})

describe('ProductoPage — ficha pública', () => {
  it('renderiza la ficha con precio, ITBIS, proveedor y enlace al catálogo', async () => {
    mocks.getProductoMock.mockResolvedValue(producto())
    await renderFicha()

    expect(screen.getByText('Tubo PVC')).toBeInTheDocument()
    expect(screen.getByText('RD$ 1,234.56')).toBeInTheDocument()
    expect(screen.getByText('ITBIS incluido')).toBeInTheDocument()
    expect(screen.getByText('Promeria')).toBeInTheDocument()
    expect(screen.getByText('Verificado')).toBeInTheDocument()
    expect(screen.getByText('unidad')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
    expect(screen.getByText('Tuberías')).toBeInTheDocument()
    expect(screen.getByText('PVC-04')).toBeInTheDocument()
    expect(screen.getByText('Diámetro 4 pulgadas')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Agregar al carrito' })).toBeInTheDocument()

    const enlaceCatalogo = screen.getByRole('link', { name: 'Ver catálogo del proveedor' })
    expect(enlaceCatalogo).toHaveAttribute('href', '/catalogo?proveedor=prov-1')
  })

  it('la ficha del producto muestra la insignia con fecha y enlace explicativo', async () => {
    mocks.getProductoMock.mockResolvedValue(producto())
    await renderFicha()

    const insignia = screen.getByRole('link', { name: 'Verificado' })
    expect(insignia).toHaveAttribute('href', '/como-funciona#verificacion-proveedores')
    expect(insignia).toHaveAttribute('title', expect.stringContaining('2 de enero de 2026'))
  })

  it('muestra el placeholder de categoría cuando el producto no tiene imagen', async () => {
    mocks.getProductoMock.mockResolvedValue(
      producto({
        imagen_url: null,
        categoria: { id: 'cat-1', nombre: 'Plomería', slug: 'plomeria', icono: '🔧' },
      })
    )
    await renderFicha()

    const placeholder = screen.getByRole('img', { name: 'Tubo PVC' })
    expect(placeholder).toHaveTextContent('🔧')
    expect(document.querySelector('img')).toBeNull()
  })

  it('muestra el stock disponible restando las unidades reservadas', async () => {
    mocks.getProductoMock.mockResolvedValue(producto({ stock: 299, stock_reservado: 213 }))
    await renderFicha()

    expect(screen.getByText('Stock disponible')).toBeInTheDocument()
    expect(screen.getByText('86')).toBeInTheDocument()
  })

  it('trata reservas omitidas como cero en la ficha', async () => {
    mocks.getProductoMock.mockResolvedValue(producto({ stock: 8 }))
    await renderFicha()

    expect(screen.getByText('Stock disponible')).toBeInTheDocument()
    expect(screen.getByText('8')).toBeInTheDocument()
  })

  it('muestra la calificación del proveedor junto al nombre en la ficha', async () => {
    mocks.getProductoMock.mockResolvedValue(producto())
    mocks.getFeedbackDeProveedorMock.mockResolvedValue({
      reseñas: [],
      promedio: 4.5,
      conteo: 2,
    })
    await renderFicha()

    expect(screen.getByText('Tubo PVC')).toBeInTheDocument()
    expect(screen.getByText('Promeria')).toBeInTheDocument()
    expect(screen.getByText('4.50')).toBeInTheDocument()
    expect(screen.getByText('(2 reseñas)')).toBeInTheDocument()
  })

  it('mantiene la ficha si el proveedor no tiene reseñas o falla la lectura', async () => {
    mocks.getProductoMock.mockResolvedValue(producto())
    mocks.getFeedbackDeProveedorMock.mockResolvedValue({
      reseñas: [],
      promedio: 0,
      conteo: 0,
    })
    await renderFicha()

    expect(screen.getByText('Tubo PVC')).toBeInTheDocument()
    expect(screen.queryByText('4.50')).toBeNull()
    expect(screen.queryByText(/reseñas\)/)).toBeNull()

    cleanup()

    mocks.getProductoMock.mockResolvedValue(producto())
    mocks.getFeedbackDeProveedorMock.mockRejectedValue(new Error('timeout'))
    await renderFicha()

    expect(screen.getByText('Tubo PVC')).toBeInTheDocument()
    expect(screen.queryByText('4.50')).toBeNull()
    expect(screen.queryByText(/reseñas\)/)).toBeNull()
  })
})
