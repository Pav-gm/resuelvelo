/**
 * Tests de las páginas públicas: muestran un error de carga con reintento
 * cuando una lectura de datos rechaza.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const refresh = vi.hoisted(() => vi.fn())
const notFound = vi.hoisted(() => vi.fn())

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
  notFound,
}))

const data = vi.hoisted(() => ({
  getProductos: vi.fn(),
  getCategorias: vi.fn(),
  getSubcategorias: vi.fn(),
  getProveedores: vi.fn(),
  getFeedbackDeProveedor: vi.fn(),
}))

vi.mock('@/lib/data', () => ({
  getProductos: data.getProductos,
  getCategorias: data.getCategorias,
  getSubcategorias: data.getSubcategorias,
  getProveedores: data.getProveedores,
  getFeedbackDeProveedor: data.getFeedbackDeProveedor,
}))

import CatalogoPage from '@/app/(marketplace)/catalogo/page'
import ProveedoresPage from '@/app/(marketplace)/proveedores/page'
import ProveedorPage from '@/app/(marketplace)/proveedores/[id]/page'
import ErrorCarga from '@/components/marketplace/ErrorCarga'

const MENSAJE = 'No pudimos cargar los datos. Intenta de nuevo.'

beforeEach(() => {
  refresh.mockReset()
  notFound.mockReset()
  data.getProductos.mockReset().mockResolvedValue([])
  data.getCategorias.mockReset().mockResolvedValue([])
  data.getSubcategorias.mockReset().mockResolvedValue([])
  data.getProveedores.mockReset().mockResolvedValue([])
  data.getFeedbackDeProveedor.mockReset().mockResolvedValue({
    reseñas: [],
    promedio: 0,
    conteo: 0,
  })
})

afterEach(() => {
  cleanup()
})

describe('Páginas públicas — error de carga', () => {
  it('el catálogo muestra error de carga y cero tarjetas si falla una lectura', async () => {
    data.getProductos.mockRejectedValueOnce(new Error('consulta fallida'))

    const ui = await CatalogoPage({ searchParams: Promise.resolve({}) })
    render(ui)

    expect(screen.getByText(MENSAJE)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(screen.queryByText('Sin resultados')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Agregar/ })).not.toBeInTheDocument()
  })

  it('el listado de proveedores muestra el error de carga si falla la lectura', async () => {
    data.getProveedores.mockRejectedValueOnce(new Error('consulta fallida'))

    const ui = await ProveedoresPage()
    render(ui)

    expect(screen.getByText(MENSAJE)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(screen.queryByText('Aún no hay proveedores')).not.toBeInTheDocument()
    expect(screen.queryByText('Ver catálogo')).not.toBeInTheDocument()
  })

  it('el perfil muestra el error de carga si falla una lectura', async () => {
    data.getProveedores.mockRejectedValueOnce(new Error('consulta fallida'))

    const ui = await ProveedorPage({ params: Promise.resolve({ id: 'prov-1' }) })
    render(ui)

    expect(screen.getByText(MENSAJE)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Reintentar' })).toBeInTheDocument()
    expect(notFound).not.toHaveBeenCalled()
  })

  it('Reintentar actualiza la ruta actual', () => {
    render(<ErrorCarga />)

    fireEvent.click(screen.getByRole('button', { name: 'Reintentar' }))

    expect(refresh).toHaveBeenCalledTimes(1)
  })
})
