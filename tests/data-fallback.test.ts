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
})

describe('getCategorias — fallback a mock', () => {
  it('devuelve las 4 categorías mock', async () => {
    const { getCategorias } = await import('@/lib/data')
    const cats = await getCategorias()
    expect(cats.length).toBe(4)
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
