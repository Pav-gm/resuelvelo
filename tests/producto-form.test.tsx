/**
 * Tests de ProductoForm — selector de subcategoría dependiente de la categoría,
 * obligatoriedad en productos nuevos y edición de productos legacy.
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ProductoForm from '@/components/marketplace/ProductoForm'
import type { Categoria, Producto, Subcategoria } from '@/types'

const mocks = vi.hoisted(() => ({
  crearMock: vi.fn(),
  actualizarMock: vi.fn(),
}))

vi.mock('@/app/(marketplace)/proveedor/actions', () => ({
  crearProducto: mocks.crearMock,
  actualizarProducto: mocks.actualizarMock,
}))

const CATEGORIAS: Categoria[] = [
  { id: 'cat-elec', nombre: 'Electricidad', slug: 'electricidad' },
  { id: 'cat-plom', nombre: 'Plomería', slug: 'plomeria' },
]

const SUBCATEGORIAS: Subcategoria[] = [
  {
    id: 'electricidad-cables',
    categoria_id: 'cat-elec',
    nombre: 'Cables y conductores',
    slug: 'electricidad-cables',
  },
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

function selectCategoria(): HTMLSelectElement {
  return screen.getByLabelText(/^Categoría/) as HTMLSelectElement
}

function selectSubcategoria(): HTMLSelectElement {
  return screen.getByLabelText(/^Subcategoría/) as HTMLSelectElement
}

afterEach(() => {
  cleanup()
  mocks.crearMock.mockReset()
  mocks.actualizarMock.mockReset()
})

describe('ProductoForm — subcategoría dependiente de categoría', () => {
  it('ofrece solo subcategorías de la categoría elegida', () => {
    render(<ProductoForm categorias={CATEGORIAS} subcategorias={SUBCATEGORIAS} />)

    fireEvent.change(selectCategoria(), { target: { value: 'cat-elec' } })

    const opciones = within(selectSubcategoria())
      .getAllByRole('option')
      .map((opcion) => opcion.textContent)
      .filter((texto) => texto !== 'Seleccionar subcategoría')
    expect(opciones).toEqual(['Cables y conductores', 'Iluminación'])
    expect(within(selectSubcategoria()).queryByText('Tuberías')).not.toBeInTheDocument()
  })
})

describe('ProductoForm — obligatoriedad de subcategoría', () => {
  it('requiere subcategoría al crear producto', () => {
    render(<ProductoForm categorias={CATEGORIAS} subcategorias={SUBCATEGORIAS} />)

    fireEvent.change(selectCategoria(), { target: { value: 'cat-elec' } })

    const subcategoria = selectSubcategoria()
    expect(subcategoria).toBeRequired()
    expect(subcategoria.value).toBe('')
    expect(subcategoria.checkValidity()).toBe(false)
  })

  it('muestra mensaje en español al enviar sin subcategoría', () => {
    render(<ProductoForm categorias={CATEGORIAS} subcategorias={SUBCATEGORIAS} />)

    fireEvent.change(selectCategoria(), { target: { value: 'cat-elec' } })

    const subcategoria = selectSubcategoria()
    subcategoria.checkValidity()
    expect(subcategoria.validationMessage).toBe('Selecciona una subcategoría.')
  })

  it('permite completar subcategoría en producto legacy antes de editar', async () => {
    mocks.actualizarMock.mockResolvedValue(null)

    const producto: Producto = {
      id: 'legacy-1',
      proveedor_id: 'prov-1',
      categoria_id: 'cat-elec',
      subcategoria_id: null,
      nombre: 'Producto legacy',
      precio: 100,
      unidad: 'unidad',
      stock: 5,
      activo: true,
      created_at: '',
    }

    render(
      <ProductoForm
        categorias={CATEGORIAS}
        subcategorias={SUBCATEGORIAS}
        producto={producto}
      />
    )

    const subcategoria = selectSubcategoria()
    expect(subcategoria.value).toBe('')

    fireEvent.change(subcategoria, { target: { value: 'electricidad-cables' } })
    fireEvent.submit(subcategoria.closest('form')!)

    await waitFor(() => expect(mocks.actualizarMock).toHaveBeenCalled())
    const enviado = mocks.actualizarMock.mock.calls[0][1] as FormData
    expect(enviado.get('subcategoria_id')).toBe('electricidad-cables')
  })
})
