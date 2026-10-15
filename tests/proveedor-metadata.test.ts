/**
 * Metadatos de la página pública de un proveedor: el título usa el nombre de
 * la empresa cuando se encuentra y cae al genérico si falla la lectura, no
 * existe el proveedor o no tiene nombre.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { generateMetadata } from '@/app/(marketplace)/proveedores/[id]/page'

const mocks = vi.hoisted(() => ({
  getProveedores: vi.fn(),
  getFeedbackDeProveedor: vi.fn(),
}))

vi.mock('@/lib/data', () => ({
  getProveedores: mocks.getProveedores,
  getFeedbackDeProveedor: mocks.getFeedbackDeProveedor,
}))

vi.mock('next/navigation', () => ({
  notFound: vi.fn(),
  redirect: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

describe('generateMetadata de la página pública del proveedor', () => {
  it('usa el nombre de empresa en el título de la página pública del proveedor', async () => {
    mocks.getProveedores.mockResolvedValue([
      { id: 'prov-1', nombre_empresa: 'Promeria', productos_count: 3 },
    ])

    const metadata = await generateMetadata({ params: Promise.resolve({ id: 'prov-1' }) })

    expect(metadata).toEqual({ title: 'Promeria — Resuélvelo' })
  })

  it('conserva el título genérico cuando falla la lectura o no existe el proveedor', async () => {
    mocks.getProveedores.mockRejectedValueOnce(new Error('consulta fallida'))
    const fallido = await generateMetadata({ params: Promise.resolve({ id: 'prov-1' }) })
    expect(fallido).toEqual({ title: 'Proveedor — Resuélvelo' })

    mocks.getProveedores.mockResolvedValueOnce([])
    const ausente = await generateMetadata({ params: Promise.resolve({ id: 'prov-1' }) })
    expect(ausente).toEqual({ title: 'Proveedor — Resuélvelo' })

    mocks.getProveedores.mockResolvedValueOnce([{ id: 'prov-1', productos_count: 0 }])
    const sinNombre = await generateMetadata({ params: Promise.resolve({ id: 'prov-1' }) })
    expect(sinNombre).toEqual({ title: 'Proveedor — Resuélvelo' })
  })
})