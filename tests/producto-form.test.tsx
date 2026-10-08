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
  createClientMock: vi.fn(),
}))

vi.mock('@/app/(marketplace)/proveedor/actions', () => ({
  crearProducto: mocks.crearMock,
  actualizarProducto: mocks.actualizarMock,
}))

vi.mock('@/lib/supabase/client', () => ({
  createClient: mocks.createClientMock,
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
  mocks.createClientMock.mockReset()
})

function seleccionarImagen(input: HTMLInputElement, archivo: File) {
  Object.defineProperty(input, 'files', { value: [archivo], configurable: true })
  fireEvent.change(input)
}

describe('ProductoForm — validación de la imagen', () => {
  it('rechaza tipos de imagen distintos de JPG, PNG y WebP', () => {
    const { container } = render(
      <ProductoForm categorias={CATEGORIAS} subcategorias={SUBCATEGORIAS} proveedorId="prov-1" />
    )

    const input = screen.getByLabelText(/^Imagen del producto/) as HTMLInputElement
    seleccionarImagen(input, new File(['gif'], 'producto.gif', { type: 'image/gif' }))

    expect(screen.getByText('El formato debe ser JPG, PNG o WebP.')).toBeInTheDocument()
    expect(mocks.createClientMock).not.toHaveBeenCalled()
    const urlInput = container.querySelector('input[name="imagen_url"]') as HTMLInputElement
    expect(urlInput.value).toBe('')
  })

  it('rechaza imágenes mayores de 2 MB', () => {
    const { container } = render(
      <ProductoForm categorias={CATEGORIAS} subcategorias={SUBCATEGORIAS} proveedorId="prov-1" />
    )

    const input = screen.getByLabelText(/^Imagen del producto/) as HTMLInputElement
    seleccionarImagen(
      input,
      new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'producto.png', { type: 'image/png' })
    )

    expect(screen.getByText('La imagen no puede superar 2 MB.')).toBeInTheDocument()
    expect(mocks.createClientMock).not.toHaveBeenCalled()
    const urlInput = container.querySelector('input[name="imagen_url"]') as HTMLInputElement
    expect(urlInput.value).toBe('')
  })
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

describe('ProductoForm — validaciones en español', () => {
  function comprobarMensajesPropios() {
    const nombre = screen.getByLabelText(/^Nombre del producto/) as HTMLInputElement
    const categoria = selectCategoria()
    const precio = screen.getByLabelText(/^Precio \(RD\$\)/) as HTMLInputElement
    const unidad = screen.getByLabelText(/^Unidad/) as HTMLInputElement
    const stock = screen.getByLabelText(/^Stock/) as HTMLInputElement

    fireEvent.change(nombre, { target: { value: '' } })
    nombre.checkValidity()
    expect(nombre.validationMessage).toBe('Escribe el nombre del producto.')
    fireEvent.change(nombre, { target: { value: 'Producto' } })
    expect(nombre.validationMessage).toBe('')

    fireEvent.change(categoria, { target: { value: '' } })
    categoria.checkValidity()
    expect(categoria.validationMessage).toBe('Selecciona una categoría.')
    fireEvent.change(categoria, { target: { value: 'cat-elec' } })
    expect(categoria.validationMessage).toBe('')

    const subcategoria = selectSubcategoria()
    subcategoria.checkValidity()
    expect(subcategoria.validationMessage).toBe('Selecciona una subcategoría.')
    fireEvent.change(subcategoria, { target: { value: 'electricidad-cables' } })
    expect(subcategoria.validationMessage).toBe('')

    fireEvent.change(precio, { target: { value: '' } })
    precio.checkValidity()
    expect(precio.validationMessage).toBe('Ingresa un precio válido.')
    fireEvent.change(precio, { target: { value: '-1' } })
    precio.checkValidity()
    expect(precio.validationMessage).toBe('El precio no puede ser negativo.')
    fireEvent.change(precio, { target: { value: '100' } })
    expect(precio.validationMessage).toBe('')

    fireEvent.change(unidad, { target: { value: '' } })
    unidad.checkValidity()
    expect(unidad.validationMessage).toBe('Ingresa la unidad del producto.')
    fireEvent.change(unidad, { target: { value: 'unidad' } })
    expect(unidad.validationMessage).toBe('')

    fireEvent.change(stock, { target: { value: '' } })
    stock.checkValidity()
    expect(stock.validationMessage).toBe('Ingresa el stock disponible.')
    fireEvent.change(stock, { target: { value: '-1' } })
    stock.checkValidity()
    expect(stock.validationMessage).toBe('El stock no puede ser negativo.')
    fireEvent.change(stock, { target: { value: '5' } })
    expect(stock.validationMessage).toBe('')
  }

  it('muestra mensajes de validación propios en español al crear y editar', () => {
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

    const { unmount } = render(
      <ProductoForm categorias={CATEGORIAS} subcategorias={SUBCATEGORIAS} />
    )
    comprobarMensajesPropios()
    unmount()

    render(
      <ProductoForm
        categorias={CATEGORIAS}
        subcategorias={SUBCATEGORIAS}
        producto={producto}
      />
    )
    comprobarMensajesPropios()
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
