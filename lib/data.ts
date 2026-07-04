import type { Categoria, Cotizacion, Producto, Proveedor } from '@/types'
import { CATEGORIAS_MOCK, PRODUCTOS_MOCK } from '@/lib/mock'

const SUPABASE_DISPONIBLE =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://<project-ref>.supabase.co'

async function getServerClient() {
  const { createClient } = await import('@/lib/supabase/server')
  return createClient()
}

// ─── Categorías ──────────────────────────────────────────────

export async function getCategorias(): Promise<Categoria[]> {
  if (!SUPABASE_DISPONIBLE) return CATEGORIAS_MOCK

  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .order('nombre')

  if (error || !data) return CATEGORIAS_MOCK
  return data as Categoria[]
}

// ─── Productos ───────────────────────────────────────────────

export interface FiltrosProductos {
  busqueda?: string
  categoriaSlug?: string
  proveedorId?: string
}

export async function getProductos(filtros?: FiltrosProductos): Promise<Producto[]> {
  if (!SUPABASE_DISPONIBLE) {
    let productos = PRODUCTOS_MOCK
    if (filtros?.busqueda) {
      const q = filtros.busqueda.toLowerCase()
      productos = productos.filter(
        (p) =>
          p.nombre.toLowerCase().includes(q) ||
          p.descripcion?.toLowerCase().includes(q)
      )
    }
    if (filtros?.categoriaSlug && filtros.categoriaSlug !== 'todos') {
      productos = productos.filter(
        (p) => p.categoria?.slug === filtros.categoriaSlug
      )
    }
    if (filtros?.proveedorId) {
      productos = productos.filter((p) => p.proveedor_id === filtros.proveedorId)
    }
    return productos
  }

  const supabase = await getServerClient()
  let query = supabase
    .from('productos')
    .select(`
      *,
      proveedor:proveedores(*),
      categoria:categorias(*)
    `)
    .eq('activo', true)
    .order('created_at', { ascending: false })

  if (filtros?.busqueda) {
    query = query.ilike('nombre', `%${filtros.busqueda}%`)
  }

  if (filtros?.categoriaSlug && filtros.categoriaSlug !== 'todos') {
    const { data: cat } = await supabase
      .from('categorias')
      .select('id')
      .eq('slug', filtros.categoriaSlug)
      .single()
    if (cat) {
      query = query.eq('categoria_id', cat.id)
    }
  }

  if (filtros?.proveedorId) {
    query = query.eq('proveedor_id', filtros.proveedorId)
  }

  const { data, error } = await query
  if (error || !data) return PRODUCTOS_MOCK
  return data as unknown as Producto[]
}

// ─── Productos de un proveedor específico ────────────────────

export async function getProductosDeProveedor(proveedorId: string): Promise<Producto[]> {
  if (!SUPABASE_DISPONIBLE) {
    return PRODUCTOS_MOCK.filter((p) => p.proveedor_id === proveedorId)
  }

  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('productos')
    .select('*, categoria:categorias(*)')
    .eq('proveedor_id', proveedorId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data as unknown as Producto[]
}

// ─── Listado público de proveedores ─────────────────────────

export interface ProveedorConConteo extends Proveedor {
  productos_count: number
}

export async function getProveedores(): Promise<ProveedorConConteo[]> {
  if (!SUPABASE_DISPONIBLE) {
    const map = new Map<string, Proveedor>()
    for (const p of PRODUCTOS_MOCK) {
      if (p.proveedor) map.set(p.proveedor.id, p.proveedor)
    }
    return [...map.values()].map((prov) => ({
      ...prov,
      productos_count: PRODUCTOS_MOCK.filter(
        (p) => p.proveedor?.id === prov.id
      ).length,
    }))
  }

  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('proveedores')
    .select('*, productos(count)')
    .order('nombre_empresa')

  if (error || !data) return []

  return data.map((prov) => {
    const { productos, ...rest } = prov as Proveedor & {
      productos?: { count: number }[]
    }
    return {
      ...(rest as Proveedor),
      productos_count: productos?.[0]?.count ?? 0,
    }
  })
}

// ─── Proveedor del usuario autenticado ───────────────────────

export async function getProveedorDelUsuario(): Promise<Proveedor | null> {
  if (!SUPABASE_DISPONIBLE) return null

  const supabase = await getServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('proveedores')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (error || !data) return null
  return data as Proveedor
}

// ─── Stats del proveedor ─────────────────────────────────────

export interface StatsProveedor {
  productosActivos: number
  cotizacionesPendientes: number
  sinStock: number
}

export async function getStatsProveedor(proveedorId: string): Promise<StatsProveedor> {
  const fallback = { productosActivos: 0, cotizacionesPendientes: 0, sinStock: 0 }
  if (!SUPABASE_DISPONIBLE) return fallback

  const supabase = await getServerClient()

  const [productosRes, cotizacionesRes] = await Promise.all([
    supabase
      .from('productos')
      .select('activo, stock')
      .eq('proveedor_id', proveedorId),
    supabase
      .from('cotizaciones')
      .select('estado')
      .eq('proveedor_id', proveedorId)
      .eq('estado', 'pendiente'),
  ])

  const productos = productosRes.data ?? []
  return {
    productosActivos: productos.filter((p) => p.activo).length,
    cotizacionesPendientes: cotizacionesRes.data?.length ?? 0,
    sinStock: productos.filter((p) => p.stock === 0).length,
  }
}

// ─── Cotizaciones del proveedor ──────────────────────────────

export async function getCotizacionesDeProveedor(proveedorId: string): Promise<Cotizacion[]> {
  if (!SUPABASE_DISPONIBLE) return []

  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('cotizaciones')
    .select(`
      *,
      items:items_cotizacion(
        *,
        producto:productos(nombre)
      )
    `)
    .eq('proveedor_id', proveedorId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error || !data) return []
  return data as unknown as Cotizacion[]
}

// ─── Cotizaciones del comprador ──────────────────────────────

export async function getCotizacionesDelComprador(compradorId: string): Promise<Cotizacion[]> {
  if (!SUPABASE_DISPONIBLE) return []

  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('cotizaciones')
    .select(`
      *,
      proveedor:proveedores(nombre_empresa),
      items:items_cotizacion(
        *,
        producto:productos(nombre, precio)
      )
    `)
    .eq('comprador_id', compradorId)
    .order('created_at', { ascending: false })

  if (error || !data) return []
  return data as unknown as Cotizacion[]
}

// ─── Producto individual ─────────────────────────────────────

export async function getProducto(id: string): Promise<Producto | null> {
  if (!SUPABASE_DISPONIBLE) {
    return PRODUCTOS_MOCK.find((p) => p.id === id) ?? null
  }

  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('productos')
    .select('*, proveedor:proveedores(*), categoria:categorias(*)')
    .eq('id', id)
    .single()

  if (error || !data) return null
  return data as unknown as Producto
}
