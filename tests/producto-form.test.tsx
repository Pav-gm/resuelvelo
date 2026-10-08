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

// jsdom no implementa las URL de objeto; se simulan para cubrir la vista previa.
Object.defineProperty(URL, 'createObjectURL', {
  value: vi.fn(() => 'blob:nueva'),
  configurable: true,
})
Object.defineProperty(URL, 'revokeObjectURL', {
  value: vi.fn(),
  configurable: true,
})

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
    expect(precio).toHaveAttribute('min', '0.01')
    fireEvent.change(precio, { target: { value: '-1' } })
    precio.checkValidity()
    expect(precio.validationMessage).toBe('El precio no puede ser negativo.')
    fireEvent.change(precio, { target: { value: '0' } })
    precio.checkValidity()
    expect(precio.validationMessage).toBe('El precio debe ser mayor que cero.')
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

  it('muestra el mensaje acordado cuando el precio es cero', () => {
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

    function comprobarPrecio() {
      const precio = screen.getByLabelText(/^Precio \(RD\$\)/) as HTMLInputElement
      expect(precio).toHaveAttribute('min', '0.01')
      fireEvent.change(precio, { target: { value: '0' } })
      precio.checkValidity()
      expect(precio.validationMessage).toBe('El precio debe ser mayor que cero.')
      fireEvent.change(precio, { target: { value: '-1' } })
      precio.checkValidity()
      expect(precio.validationMessage).toBe('El precio no puede ser negativo.')
    }

    const { unmount } = render(
      <ProductoForm categorias={CATEGORIAS} subcategorias={SUBCATEGORIAS} />
    )
    comprobarPrecio()
    unmount()

    render(
      <ProductoForm
        categorias={CATEGORIAS}
        subcategorias={SUBCATEGORIAS}
        producto={producto}
      />
    )
    comprobarPrecio()
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

  it('no envía el archivo de imagen a la acción y conserva la URL actual', async () => {
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
      imagen_url: 'https://ejemplo.test/actual.jpg',
      activo: true,
      created_at: '',
    }

    render(
      <ProductoForm
        categorias={CATEGORIAS}
        subcategorias={SUBCATEGORIAS}
        producto={producto}
        proveedorId="prov-1"
      />
    )

    fireEvent.change(selectSubcategoria(), { target: { value: 'electricidad-cables' } })
    fireEvent.submit(selectSubcategoria().closest('form')!)

    await waitFor(() => expect(mocks.actualizarMock).toHaveBeenCalled())
    const enviado = mocks.actualizarMock.mock.calls[0][1] as FormData
    expect(enviado.has('imagen')).toBe(false)
    expect(enviado.get('imagen_url')).toBe('https://ejemplo.test/actual.jpg')
    expect(mocks.createClientMock).not.toHaveBeenCalled()
  })
})

describe('ProductoForm — previsualización de imagen', () => {
  it('previsualiza la imagen elegida y permite cambiarla o quitarla al editar', async () => {
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
      imagen_url: 'https://ejemplo.test/actual.jpg',
      activo: true,
      created_at: '',
    }

    render(
      <ProductoForm
        categorias={CATEGORIAS}
        subcategorias={SUBCATEGORIAS}
        producto={producto}
        proveedorId="prov-1"
      />
    )

    // Al editar se muestra la foto actual.
    expect(screen.getByRole('img', { name: 'Vista previa del producto' })).toHaveAttribute(
      'src',
      'https://ejemplo.test/actual.jpg'
    )

    // Al elegir un archivo se muestra su previsualización (URL de objeto).
    const input = screen.getByLabelText(/^Imagen del producto/) as HTMLInputElement
    seleccionarImagen(input, new File(['png'], 'nueva.png', { type: 'image/png' }))
    expect(screen.getByRole('img', { name: 'Vista previa del producto' })).toHaveAttribute(
      'src',
      'blob:nueva'
    )

    // Quitar foto limpia la selección y la imagen mostrada.
    fireEvent.click(screen.getByRole('button', { name: 'Quitar foto' }))
    expect(screen.queryByRole('img', { name: 'Vista previa del producto' })).toBeNull()
    expect(input.value).toBe('')

    fireEvent.submit(input.closest('form')!)

    await waitFor(() => expect(mocks.actualizarMock).toHaveBeenCalled())
    const enviado = mocks.actualizarMock.mock.calls[0][1] as FormData
    expect(enviado.get('imagen_url')).toBe('')
    expect(enviado.has('imagen')).toBe(false)
    expect(mocks.createClientMock).not.toHaveBeenCalled()
  })
})

describe('ProductoForm — estado de guardado', () => {
  it('desactiva el botón y muestra Guardando mientras se guarda al crear y editar', async () => {
    let resolverCrear: (value: null) => void = () => {}
    let resolverActualizar: (value: null) => void = () => {}
    mocks.crearMock.mockImplementation(
      () =>
        new Promise<null>((resolve) => {
          resolverCrear = resolve
        })
    )
    mocks.actualizarMock.mockImplementation(
      () =>
        new Promise<null>((resolve) => {
          resolverActualizar = resolve
        })
    )

    const producto: Producto = {
      id: 'prod-1',
      proveedor_id: 'prov-1',
      categoria_id: 'cat-elec',
      subcategoria_id: 'electricidad-cables',
      nombre: 'Producto',
      precio: 100,
      unidad: 'unidad',
      stock: 5,
      activo: true,
      created_at: '',
    }

    const { unmount } = render(
      <ProductoForm categorias={CATEGORIAS} subcategorias={SUBCATEGORIAS} proveedorId="prov-1" />
    )

    fireEvent.change(screen.getByLabelText(/^Nombre del producto/), { target: { value: 'Nuevo' } })
    fireEvent.change(selectCategoria(), { target: { value: 'cat-elec' } })
    fireEvent.change(selectSubcategoria(), { target: { value: 'electricidad-cables' } })
    fireEvent.submit(screen.getByRole('button', { name: 'Publicar producto' }).closest('form')!)

    const botonCrear = await screen.findByRole('button', { name: 'Guardando...' })
    expect(botonCrear).toBeDisabled()

    resolverCrear(null)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Publicar producto' })).toBeEnabled()
    })
    unmount()

    render(
      <ProductoForm
        categorias={CATEGORIAS}
        subcategorias={SUBCATEGORIAS}
        producto={producto}
        proveedorId="prov-1"
      />
    )
    fireEvent.submit(screen.getByRole('button', { name: 'Actualizar producto' }).closest('form')!)

    const botonEditar = await screen.findByRole('button', { name: 'Guardando...' })
    expect(botonEditar).toBeDisabled()

    resolverActualizar(null)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Actualizar producto' })).toBeEnabled()
    })
  })
})

describe('ProductoForm — error de stock reservado', () => {
  it('muestra cuántas unidades reservadas impiden bajar el stock', async () => {
    mocks.actualizarMock.mockResolvedValue({
      error: 'Hay 4 unidades reservadas en cotizaciones aceptadas; el stock no puede ser menor que 4.',
    })

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

    fireEvent.submit(screen.getByRole('button', { name: 'Actualizar producto' }).closest('form')!)

    expect(
      await screen.findByText(
        'Hay 4 unidades reservadas en cotizaciones aceptadas; el stock no puede ser menor que 4.'
      )
    ).toBeInTheDocument()
  })
})
