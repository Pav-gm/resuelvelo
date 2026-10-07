/**
 * Tests de lib/data.ts — fallback a mock cuando no hay Supabase
 * Simulan el entorno sin credenciales de Supabase.
 */
import { describe, it, expect, vi, beforeAll } from 'vitest'

// Asegurar que las env de Supabase NO están configuradas (modo mock)
beforeAll(() => {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://<project-ref>.supabase.co')
})

describe('getProductos — fallback a mock', () => {
  it('devuelve los 10 productos mock sin filtros', async () => {
    const { getProductos } = await import('@/lib/data')
    const productos = await getProductos()
    expect(productos.length).toBe(10)
  })

  it('filtra por búsqueda de texto', async () => {
    const { getProductos } = await import('@/lib/data')
    const productos = await getProductos({ busqueda: 'PVC' })
    expect(productos.length).toBeGreaterThan(0)
    for (const p of productos) {
      const coincide =
        p.nombre.toLowerCase().includes('pvc') ||
        (p.descripcion?.toLowerCase().includes('pvc') ?? false)
      expect(coincide, `"${p.nombre}" no contiene "PVC"`).toBe(true)
    }
  })

  it('filtra por categoría slug', async () => {
    const { getProductos } = await import('@/lib/data')
    const productos = await getProductos({ categoriaSlug: 'plomeria' })
    expect(productos.length).toBeGreaterThan(0)
    for (const p of productos) {
      expect(p.categoria?.slug).toBe('plomeria')
    }
  })

  it('devuelve 0 productos para búsqueda inexistente', async () => {
    const { getProductos } = await import('@/lib/data')
    const productos = await getProductos({ busqueda: 'xyzabc123inexistente' })
    expect(productos.length).toBe(0)
  })

  it('devuelve todos los productos para categoría "todos"', async () => {
    const { getProductos } = await import('@/lib/data')
    const todos = await getProductos({ categoriaSlug: 'todos' })
    const sinFiltro = await getProductos()
    expect(todos.length).toBe(sinFiltro.length)
  })

  it('filtra por precio mínimo', async () => {
    const { getProductos } = await import('@/lib/data')
    const productos = await getProductos({ precioMin: 850 })
    expect(productos.length).toBeGreaterThan(0)
    for (const p of productos) {
      expect(p.precio).toBeGreaterThanOrEqual(850)
    }
    expect(productos.some((p) => p.id === '8')).toBe(true)
    expect(productos.some((p) => p.id === '2')).toBe(false)
  })

  it('filtra por precio máximo', async () => {
    const { getProductos } = await import('@/lib/data')
    const productos = await getProductos({ precioMax: 320 })
    expect(productos.length).toBeGreaterThan(0)
    for (const p of productos) {
      expect(p.precio).toBeLessThanOrEqual(320)
    }
    expect(productos.some((p) => p.id === '3')).toBe(true)
    expect(productos.some((p) => p.id === '1')).toBe(false)
  })

  it('ignora precio mínimo negativo o no numérico al combinarlo con precio máximo', async () => {
    const { getProductos } = await import('@/lib/data')
    const conMinimoNegativo = await getProductos({ precioMin: -5, precioMax: 320 })
    const conMinimoNoNumerico = await getProductos({ precioMin: Number.NaN, precioMax: 320 })
    const soloMaximo = await getProductos({ precioMax: 320 })

    expect(conMinimoNegativo.map((p) => p.id)).toEqual(soloMaximo.map((p) => p.id))
    expect(conMinimoNoNumerico.map((p) => p.id)).toEqual(soloMaximo.map((p) => p.id))
  })

  it('filtra por rango de precio mínimo y máximo', async () => {
    const { getProductos } = await import('@/lib/data')
    const productos = await getProductos({ precioMin: 300, precioMax: 700 })
    expect(productos.length).toBeGreaterThan(0)
    for (const p of productos) {
      expect(p.precio).toBeGreaterThanOrEqual(300)
      expect(p.precio).toBeLessThanOrEqual(700)
    }
    expect(productos.some((p) => p.id === '6')).toBe(true)
    expect(productos.some((p) => p.id === '5')).toBe(false)
  })

  it('conStock excluye productos con stock 0', async () => {
    const { getProductos } = await import('@/lib/data')
    const productos = await getProductos({ conStock: true })
    expect(productos.length).toBe(9)
    for (const p of productos) {
      expect(p.stock).toBeGreaterThan(0)
    }
    expect(productos.some((p) => p.id === '4')).toBe(false)
  })

  it('combina conStock con categoría plomería', async () => {
    const { getProductos } = await import('@/lib/data')
    const productos = await getProductos({ categoriaSlug: 'plomeria', conStock: true })
    expect(productos.length).toBe(3)
    for (const p of productos) {
      expect(p.categoria?.slug).toBe('plomeria')
      expect(p.stock).toBeGreaterThan(0)
    }
  })

  it('combina precio mínimo con búsqueda PVC', async () => {
    const { getProductos } = await import('@/lib/data')
    const productos = await getProductos({ busqueda: 'PVC', precioMin: 500 })
    expect(productos.length).toBe(1)
    expect(productos[0].id).toBe('1')
    expect(productos[0].precio).toBeGreaterThanOrEqual(500)
  })
})

describe('getCategorias — fallback a mock', () => {
  it('devuelve las cinco categorías mock', async () => {
    const { getCategorias } = await import('@/lib/data')
    const cats = await getCategorias()
    expect(cats.length).toBe(5)
  })

  it('cada categoría tiene slug', async () => {
    const { getCategorias } = await import('@/lib/data')
    const cats = await getCategorias()
    for (const c of cats) {
      expect(c.slug).toBeTruthy()
    }
  })
})

describe('getProductosDeProveedor — fallback a mock', () => {
  it('devuelve los productos del proveedor p1 (Promeria)', async () => {
    const { getProductosDeProveedor } = await import('@/lib/data')
    const productos = await getProductosDeProveedor('p1')
    expect(productos.length).toBeGreaterThan(0)
    for (const p of productos) {
      expect(p.proveedor_id).toBe('p1')
    }
  })

  it('devuelve array vacío para proveedor inexistente', async () => {
    const { getProductosDeProveedor } = await import('@/lib/data')
    const productos = await getProductosDeProveedor('proveedor-que-no-existe')
    expect(productos).toHaveLength(0)
  })
})

describe('getProducto — fallback a mock', () => {
  it('devuelve el producto con id exacto', async () => {
    const { getProducto } = await import('@/lib/data')
    const producto = await getProducto('1')
    expect(producto).not.toBeNull()
    expect(producto?.id).toBe('1')
  })

  it('devuelve null para id inexistente', async () => {
    const { getProducto } = await import('@/lib/data')
    const producto = await getProducto('id-que-no-existe')
    expect(producto).toBeNull()
  })
})


describe('filtros nuevos de catálogo — fallback a mock', () => {
  it('filtra por subcategoría sin ocultar productos legacy al filtrar categoría', async () => {
    const { getProductos } = await import('@/lib/data')
    const { PRODUCTOS_MOCK } = await import('@/lib/mock')
    const originales = PRODUCTOS_MOCK.splice(0)
    const producto = originales.find((p) => p.id === '1')!
    const legacy = { ...producto, subcategoria_id: null, subcategoria: null }
    PRODUCTOS_MOCK.push(producto, legacy)
    try {
      const porCategoria = await getProductos({ categoriaSlug: 'plomeria' })
      expect(porCategoria).toHaveLength(2)
      expect(porCategoria.some((p) => p.subcategoria_id === 'plomeria-tuberias')).toBe(true)
      expect(porCategoria.some((p) => p.subcategoria_id === null)).toBe(true)
      const porSubcategoria = await getProductos({ categoriaSlug: 'plomeria', subcategoriaSlug: 'plomeria-tuberias' })
      expect(porSubcategoria.map((p) => p.id)).toEqual(['1'])
    } finally {
      PRODUCTOS_MOCK.splice(0, PRODUCTOS_MOCK.length, ...originales)
    }
  })

  it('filtra por varios proveedores', async () => {
    const { getProductos } = await import('@/lib/data')
    const productos = await getProductos({ proveedorIds: ['p1', 'p2'] })
    expect(productos.every((p) => ['p1', 'p2'].includes(p.proveedor_id))).toBe(true)
    expect(productos.some((p) => p.proveedor_id === 'p3')).toBe(false)
  })

  it('ordena por precio ascendente, descendente y nombre', async () => {
    const { getProductos } = await import('@/lib/data')
    const asc = await getProductos({ orden: 'precio_asc' })
    const desc = await getProductos({ orden: 'precio_desc' })
    const nombre = await getProductos({ orden: 'nombre_asc' })
    expect(asc.map((p) => p.precio)).toEqual([...asc.map((p) => p.precio)].sort((a, b) => a - b))
    expect(desc.map((p) => p.precio)).toEqual([...desc.map((p) => p.precio)].sort((a, b) => b - a))
    const collator = new Intl.Collator('es', { sensitivity: 'base' })
    expect(nombre.map((p) => p.nombre)).toEqual([...nombre.map((p) => p.nombre)].sort((a, b) => collator.compare(a, b)))
    expect(asc.filter((p) => p.precio === asc[0].precio).map((p) => p.id)).toEqual(
      [...asc.filter((p) => p.precio === asc[0].precio)].map((p) => p.id).sort()
    )
  })
})
