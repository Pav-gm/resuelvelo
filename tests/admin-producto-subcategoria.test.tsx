/**
 * Tests de AdminProductoSubcategoria — selector por categoría,
 * guardado de la subcategoría y renderizado del error devuelto.
 */
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import AdminProductoSubcategoria from '@/components/marketplace/AdminProductoSubcategoria'
import type { Subcategoria } from '@/types'

const mocks = vi.hoisted(() => ({ setMock: vi.fn() }))

vi.mock('@/app/(marketplace)/admin/actions', () => ({
  setProductoSubcategoria: mocks.setMock,
}))

const SUBCATEGORIAS: Subcategoria[] = [
  {
    id: 'electricidad-iluminacion',
    categoria_id: 'cat-elec',
    nombre: 'Iluminación',
    slug: 'electricidad-iluminacion',
  },
  {
    id: 'plomeria-tuberias',
    categoria_id: 'cat-plom',
    nombre: 'Tuberías',
    slug: 'plomeria-tuberias',
  },
]

afterEach(() => {
  cleanup()
  mocks.setMock.mockReset()
})

describe('AdminProductoSubcategoria — guardado', () => {
  it('guarda una subcategoría del producto y muestra confirmación', async () => {
    mocks.setMock.mockResolvedValue(undefined)

    render(
      <AdminProductoSubcategoria
        productoId="prod-1"
        categoriaId="cat-elec"
        subcategoriaId={null}
        subcategorias={SUBCATEGORIAS}
      />
    )

    fireEvent.change(screen.getByLabelText('Subcategoría'), {
      target: { value: 'electricidad-iluminacion' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Guardar subcategoría' }))

    await waitFor(() =>
      expect(mocks.setMock).toHaveBeenCalledWith('prod-1', 'electricidad-iluminacion')
    )
    expect(await screen.findByText('Guardado')).toBeInTheDocument()
  })

  it('muestra error devuelto al guardar subcategoría', async () => {
    mocks.setMock.mockResolvedValue({ error: 'No autorizado.' })

    render(
      <AdminProductoSubcategoria
        productoId="prod-1"
        categoriaId="cat-elec"
        subcategoriaId="electricidad-iluminacion"
        subcategorias={SUBCATEGORIAS}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Guardar subcategoría' }))

    expect(await screen.findByText('No autorizado.')).toBeInTheDocument()
    expect(screen.queryByText('Guardado')).not.toBeInTheDocument()
  })
})
