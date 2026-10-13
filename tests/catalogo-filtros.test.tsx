/**
 * Tests de CatalogoFiltros — subcategorías dependientes de categoría,
 * proveedores múltiples, orden, chips y limpieza de filtros.
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import CatalogoFiltros from '@/components/marketplace/CatalogoFiltros'
import { getProductos, type ProveedorConConteo } from '@/lib/data'
import type { Categoria, Subcategoria } from '@/types'

// Los datos en memoria solo se usan sin Supabase: en CI la URL está definida y getProductos iría a la base.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = ''
})

const mocks = vi.hoisted(() => ({
  pushMock: vi.fn(),
  paramsState: { value: '' },
  // Como en Next, el mismo objeto mientras la URL no cambia: un re-render por estado local no lo renueva.
  cache: { value: null as string | null, params: new URLSearchParams() },
}))

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.pushMock }),
  usePathname: () => '/catalogo',
  useSearchParams: () => {
    if (mocks.cache.value !== mocks.paramsState.value) {
      mocks.cache.value = mocks.paramsState.value
      mocks.cache.params = new URLSearchParams(mocks.paramsState.value)
    }
    return mocks.cache.params
  },
}))

// Catálogo de datos en memoria para probar el filtro por provincia de cobertura
// sin depender del catálogo de demostración.
const catalogoProvincia = vi.hoisted(() => ({
  productos: [
    {
      id: 'prod-santiago',
      proveedor_id: 'prov-santiago',
      categoria_id: 'c1',
      subcategoria_id: null,
      nombre: 'Bloques de hormigón',
      precio: 100,
      unidad: 'unidad',
      stock: 10,
      activo: true,
      created_at: '',
      proveedor: {
        id: 'prov-santiago',
        user_id: 'u-santiago',
        nombre_empresa: 'Proveedor Santiago',
        verificado: true,
        created_at: '',
        zonas_cobertura: ['Santiago'],
      },
    },
    {
      id: 'prod-duarte',
      proveedor_id: 'prov-duarte',
      categoria_id: 'c1',
      subcategoria_id: null,
      nombre: 'Varilla de hierro',
      precio: 200,
      unidad: 'unidad',
      stock: 10,
      activo: true,
      created_at: '',
      proveedor: {
        id: 'prov-duarte',
        user_id: 'u-duarte',
        nombre_empresa: 'Proveedor Duarte',
        verificado: true,
        created_at: '',
        zonas_cobertura: ['Duarte'],
      },
    },
  ],
}))

vi.mock('@/lib/mock', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/mock')>()
  return { ...actual, PRODUCTOS_MOCK: catalogoProvincia.productos }
})

const CATEGORIAS: Categoria[] = [
  { id: 'c1', nombre: 'Plomería', slug: 'plomeria' },
  { id: 'c2', nombre: 'Electricidad', slug: 'electricidad' },
]

const NOMBRES_ELECTRICIDAD = [
  'Cables y conductores',
  'Tomacorrientes e interruptores',
  'Iluminación',
  'Breakers y paneles',
  'Canalización y accesorios',
]

const NOMBRES_PLOMERIA = [
  'Tuberías',
  'Conexiones y accesorios',
  'Grifería',
  'Sanitarios y lavamanos',
  'Tanques y bombas',
]

const SUBCATEGORIAS: Subcategoria[] = [
  ...NOMBRES_ELECTRICIDAD.map((nombre, i) => ({
    id: `electricidad-${i}`,
    categoria_id: 'c2',
    nombre,
    slug: `electricidad-${i}`,
  })),
  ...NOMBRES_PLOMERIA.map((nombre, i) => ({
    id: `plomeria-${i}`,
    categoria_id: 'c1',
    nombre,
    slug: `plomeria-${i}`,
  })),
]

const PROVEEDORES: ProveedorConConteo[] = [
  {
    id: 'p1',
    user_id: 'u1',
    nombre_empresa: 'Promeria',
    verificado: true,
    created_at: '',
    productos_count: 4,
    zonas_cobertura: [],
  },
  {
    id: 'p2',
    user_id: 'u2',
    nombre_empresa: 'Ferretería López',
    verificado: true,
    created_at: '',
    productos_count: 3,
    zonas_cobertura: [],
  },
]

function ultimoPush(): URLSearchParams {
  const llamada = mocks.pushMock.mock.calls.at(-1)
  const url = new URL(llamada![0] as string, 'http://localhost')
  return url.searchParams
}

afterEach(() => {
  cleanup()
  mocks.pushMock.mockReset()
  mocks.paramsState.value = ''
})

describe('CatalogoFiltros — subcategorías', () => {
  it('muestra exactamente las subcategorías de la categoría seleccionada', () => {
    mocks.paramsState.value = '?categoria=electricidad'
    const { rerender } = render(
      <CatalogoFiltros
        categorias={CATEGORIAS}
        subcategorias={SUBCATEGORIAS}
        proveedores={PROVEEDORES} provincias={[]}
        categoriaInicial="electricidad"
      />
    )

    const selector = screen.getByLabelText('Subcategoría')
    const opciones = within(selector)
      .getAllByRole('option')
      .map((opcion) => opcion.textContent)
    expect(opciones).toEqual(NOMBRES_ELECTRICIDAD)
    expect(screen.queryByText('Tuberías')).not.toBeInTheDocument()

    rerender(
      <CatalogoFiltros
        categorias={CATEGORIAS}
        subcategorias={SUBCATEGORIAS}
        proveedores={PROVEEDORES} provincias={[]}
      />
    )
    expect(screen.queryByLabelText('Subcategoría')).not.toBeInTheDocument()
  })

  it('sin subcategoría activa el selector no marca ninguna', () => {
    mocks.paramsState.value = '?categoria=electricidad'
    render(
      <CatalogoFiltros
        categorias={CATEGORIAS}
        subcategorias={SUBCATEGORIAS}
        proveedores={PROVEEDORES} provincias={[]}
        categoriaInicial="electricidad"
      />
    )

    const selector = screen.getByLabelText('Subcategoría') as HTMLSelectElement
    expect(selector.value).toBe('')

    fireEvent.change(selector, { target: { value: 'electricidad-0' } })
    expect(ultimoPush().get('subcategoria')).toBe('electricidad-0')
  })
})

describe('CatalogoFiltros — proveedores y orden', () => {
  it('mantiene proveedores múltiples y orden al cambiar otros filtros', () => {
    mocks.paramsState.value = '?proveedor=p1&proveedor=p2&orden=precio_desc'
    render(
      <CatalogoFiltros
        categorias={CATEGORIAS}
        subcategorias={SUBCATEGORIAS}
        proveedores={PROVEEDORES} provincias={[]}
        proveedorInicialIds={['p1', 'p2']}
        ordenInicial="precio_desc"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Electricidad' }))

    const params = ultimoPush()
    expect(params.getAll('proveedor')).toEqual(['p1', 'p2'])
    expect(params.get('orden')).toBe('precio_desc')
    expect(params.get('categoria')).toBe('electricidad')
  })
})

describe('CatalogoFiltros — búsqueda y filtros', () => {
  it('Aplicar filtros incluye la búsqueda escrita y conserva los filtros existentes', () => {
    mocks.paramsState.value = '?orden=precio_desc'
    const { rerender } = render(
      <CatalogoFiltros
        categorias={CATEGORIAS}
        subcategorias={SUBCATEGORIAS}
        proveedores={PROVEEDORES} provincias={[]}
        ordenInicial="precio_desc"
      />
    )

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'cable' } })
    fireEvent.change(screen.getByLabelText('Precio mínimo (DOP)'), {
      target: { value: '10' },
    })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Solo con stock' }))

    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))

    const params = ultimoPush()
    expect(params.get('busqueda')).toBe('cable')
    expect(params.get('precioMin')).toBe('10')
    expect(params.get('conStock')).toBe('1')
    expect(params.get('orden')).toBe('precio_desc')
    expect(params.has('precioMax')).toBe(false)

    rerender(
      <CatalogoFiltros
        categorias={CATEGORIAS}
        subcategorias={SUBCATEGORIAS}
        proveedores={PROVEEDORES} provincias={[]}
        busquedaInicial="cable"
        ordenInicial="precio_desc"
      />
    )
    expect(screen.getByText('Búsqueda: cable')).toBeInTheDocument()
  })

  it('Aplicar filtros justo después de cambiar el orden no pierde el orden', () => {
    render(
      <CatalogoFiltros categorias={CATEGORIAS} subcategorias={SUBCATEGORIAS} proveedores={PROVEEDORES} provincias={[]} />
    )

    // La URL del orden ya se pidió, pero searchParams todavía no cambió (la navegación no terminó).
    fireEvent.change(screen.getByLabelText('Ordenar por'), { target: { value: 'nombre_asc' } })
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'cable' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))

    const params = ultimoPush()
    expect(params.get('orden')).toBe('nombre_asc')
    expect(params.get('busqueda')).toBe('cable')
  })
})

describe('CatalogoFiltros — validación de precios', () => {
  it('no aplica filtros y muestra un error si el precio mínimo supera el máximo', () => {
    render(
      <CatalogoFiltros categorias={CATEGORIAS} subcategorias={SUBCATEGORIAS} proveedores={PROVEEDORES} provincias={[]} />
    )

    fireEvent.change(screen.getByLabelText('Precio mínimo (DOP)'), { target: { value: '300' } })
    fireEvent.change(screen.getByLabelText('Precio máximo (DOP)'), { target: { value: '200' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))

    expect(mocks.pushMock).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'El precio mínimo no puede ser mayor que el máximo.'
    )
  })

  it('no aplica filtros y muestra un error propio si un precio es negativo', () => {
    render(
      <CatalogoFiltros categorias={CATEGORIAS} subcategorias={SUBCATEGORIAS} proveedores={PROVEEDORES} provincias={[]} />
    )

    fireEvent.change(screen.getByLabelText('Precio mínimo (DOP)'), { target: { value: '-5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))

    expect(mocks.pushMock).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('Los precios no pueden ser negativos.')

    const precioMin = screen.getByLabelText('Precio mínimo (DOP)')
    const precioMax = screen.getByLabelText('Precio máximo (DOP)')
    expect(precioMin).toHaveAttribute('min', '0')
    expect(precioMax).toHaveAttribute('min', '0')
    expect(precioMin.closest('form')).toHaveAttribute('novalidate')
  })

  it('el aviso de precios desaparece al limpiar filtros o quitar un chip', () => {
    mocks.paramsState.value = '?busqueda=cable&conStock=1'
    render(
      <CatalogoFiltros
        categorias={CATEGORIAS}
        subcategorias={SUBCATEGORIAS}
        proveedores={PROVEEDORES} provincias={[]}
        busquedaInicial="cable"
        conStockInicial
      />
    )

    fireEvent.change(screen.getByLabelText('Precio mínimo (DOP)'), { target: { value: '-5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Limpiar filtros/ }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Precio mínimo (DOP)'), { target: { value: '-5' } })
    fireEvent.click(screen.getByRole('button', { name: 'Aplicar filtros' }))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    fireEvent.click(screen.getAllByRole('button', { name: /Quitar/ })[0])
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})

describe('CatalogoFiltros — chips y limpieza', () => {
  it('quitar el chip de categoría elimina también la subcategoría', () => {
    mocks.paramsState.value =
      '?categoria=electricidad&subcategoria=electricidad-0&orden=nombre_asc'
    render(
      <CatalogoFiltros
        categorias={CATEGORIAS}
        subcategorias={SUBCATEGORIAS}
        proveedores={PROVEEDORES} provincias={[]}
        categoriaInicial="electricidad"
        subcategoriaInicial="electricidad-0"
        ordenInicial="nombre_asc"
      />
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Quitar filtro Categoría: Electricidad' })
    )

    const params = ultimoPush()
    expect(params.has('categoria')).toBe(false)
    expect(params.has('subcategoria')).toBe(false)
    expect(params.get('orden')).toBe('nombre_asc')
  })

  it('quita un chip sin borrar otros filtros y limpia todos los filtros', () => {
    mocks.paramsState.value =
      '?busqueda=cable&categoria=electricidad&subcategoria=electricidad-0&proveedor=p1&proveedor=p2&precioMin=10&precioMax=30&conStock=1&orden=nombre_asc'
    render(
      <CatalogoFiltros
        categorias={CATEGORIAS}
        subcategorias={SUBCATEGORIAS}
        proveedores={PROVEEDORES} provincias={[]}
        busquedaInicial="cable"
        categoriaInicial="electricidad"
        subcategoriaInicial="electricidad-0"
        proveedorInicialIds={['p1', 'p2']}
        precioMinInicial="10"
        precioMaxInicial="30"
        conStockInicial
        ordenInicial="nombre_asc"
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Quitar filtro Proveedor: Promeria' }))

    const trasQuitar = ultimoPush()
    expect(trasQuitar.getAll('proveedor')).toEqual(['p2'])
    expect(trasQuitar.get('busqueda')).toBe('cable')
    expect(trasQuitar.get('categoria')).toBe('electricidad')
    expect(trasQuitar.get('subcategoria')).toBe('electricidad-0')
    expect(trasQuitar.get('precioMin')).toBe('10')
    expect(trasQuitar.get('precioMax')).toBe('30')
    expect(trasQuitar.get('conStock')).toBe('1')
    expect(trasQuitar.get('orden')).toBe('nombre_asc')

    fireEvent.click(screen.getByRole('button', { name: 'Limpiar filtros' }))

    const trasLimpiar = ultimoPush()
    expect(trasLimpiar.has('busqueda')).toBe(false)
    expect(trasLimpiar.has('categoria')).toBe(false)
    expect(trasLimpiar.has('subcategoria')).toBe(false)
    expect(trasLimpiar.has('proveedor')).toBe(false)
    expect(trasLimpiar.has('precioMin')).toBe(false)
    expect(trasLimpiar.has('precioMax')).toBe(false)
    expect(trasLimpiar.has('conStock')).toBe(false)
    expect(trasLimpiar.get('orden')).toBe('nombre_asc')
  })

  it('al quitar filtros los campos del formulario se vacían', () => {
    mocks.paramsState.value = ''
    const { rerender } = render(
      <CatalogoFiltros
        categorias={CATEGORIAS}
        subcategorias={SUBCATEGORIAS}
        proveedores={PROVEEDORES} provincias={[]}
        conStockInicial={false}
      />
    )

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'cable' } })
    fireEvent.click(screen.getByRole('checkbox', { name: 'Solo con stock' }))

    rerender(
      <CatalogoFiltros
        categorias={CATEGORIAS}
        subcategorias={SUBCATEGORIAS}
        proveedores={PROVEEDORES} provincias={[]}
        busquedaInicial="cable"
        conStockInicial
      />
    )
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('cable')
    expect(screen.getByRole('checkbox', { name: 'Solo con stock' })).toBeChecked()

    rerender(
      <CatalogoFiltros
        categorias={CATEGORIAS}
        subcategorias={SUBCATEGORIAS}
        proveedores={PROVEEDORES} provincias={[]}
      />
    )
    expect((screen.getByRole('searchbox') as HTMLInputElement).value).toBe('')
    expect(screen.getByRole('checkbox', { name: 'Solo con stock' })).not.toBeChecked()
  })
})

describe('CatalogoFiltros — provincia de entrega', () => {
  it('CatalogoFiltros conserva la provincia de entrega en la URL y muestra el chip correspondiente', () => {
    mocks.paramsState.value = '?orden=precio_desc'
    render(
      <CatalogoFiltros
        categorias={CATEGORIAS}
        subcategorias={SUBCATEGORIAS}
        proveedores={PROVEEDORES}
        provincias={['Duarte', 'Santiago']}
        provinciaInicial="Santiago"
        ordenInicial="precio_desc"
      />
    )

    const selector = screen.getByLabelText('Provincia de entrega') as HTMLSelectElement
    expect(selector.value).toBe('Santiago')

    fireEvent.change(selector, { target: { value: 'Santiago' } })

    const trasCambiar = ultimoPush()
    expect(trasCambiar.get('provincia')).toBe('Santiago')
    expect(trasCambiar.get('orden')).toBe('precio_desc')

    expect(screen.getByText('Entrega en: Santiago')).toBeInTheDocument()

    fireEvent.click(
      screen.getByRole('button', { name: 'Quitar filtro Entrega en: Santiago' })
    )

    const trasQuitar = ultimoPush()
    expect(trasQuitar.has('provincia')).toBe(false)
    expect(trasQuitar.get('orden')).toBe('precio_desc')
  })
})

describe('getProductos — provincia de cobertura', () => {
  it('getProductos filtra por provincia de cobertura del proveedor', async () => {
    const productos = await getProductos({ provincia: 'Santiago' })

    expect(productos.map((producto) => producto.id)).toEqual(['prod-santiago'])
  })

  it('getProductos conserva todos los productos cuando no se indica provincia', async () => {
    const productos = await getProductos({})

    expect(productos.map((producto) => producto.id)).toEqual(['prod-santiago', 'prod-duarte'])
  })
})
