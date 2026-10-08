import type {
  Categoria,
  Cotizacion,
  CotizacionDetalle,
  Feedback,
  FeedbackPublico,
  Producto,
  Proveedor,
  ResumenFeedbackProveedor,
  Subcategoria,
} from '@/types'
import { CATEGORIAS_MOCK, FEEDBACK_MOCK, PRODUCTOS_MOCK, SUBCATEGORIAS_MOCK } from '@/lib/mock'

const SUPABASE_DISPONIBLE =
  !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
  process.env.NEXT_PUBLIC_SUPABASE_URL !== 'https://<project-ref>.supabase.co'

async function getServerClient() {
  const { createClient } = await import('@/lib/supabase/server')
  return createClient()
}

function propagarErrorLectura(funcion: string, error: unknown): never {
  console.error(`[${funcion}] Error al consultar Supabase:`, error)
  throw error
}

function errorSinDatos(funcion: string): never {
  const error = new Error(`[${funcion}] Supabase no devolvió datos.`)
  console.error(`[${funcion}] Error al consultar Supabase:`, error)
  throw error
}

// ─── Categorías ──────────────────────────────────────────────

export async function getCategorias(): Promise<Categoria[]> {
  if (!SUPABASE_DISPONIBLE) return CATEGORIAS_MOCK

  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('categorias')
    .select('*')
    .order('nombre')

  if (error) propagarErrorLectura('getCategorias', error)
  if (data === null) errorSinDatos('getCategorias')
  return data as Categoria[]
}

// ─── Subcategorías ───────────────────────────────────────────

export async function getSubcategorias(categoriaId?: string): Promise<Subcategoria[]> {
  if (!SUPABASE_DISPONIBLE) {
    return SUBCATEGORIAS_MOCK.filter((s) => !categoriaId || s.categoria_id === categoriaId)
      .slice().sort((a, b) => compareNames(a.nombre, b.nombre) || a.id.localeCompare(b.id))
  }

  const supabase = await getServerClient()
  let query = supabase.from('subcategorias').select('*').order('nombre')
  if (categoriaId) query = query.eq('categoria_id', categoriaId)
  const { data, error } = await query
  if (error) propagarErrorLectura('getSubcategorias', error)
  if (data === null) errorSinDatos('getSubcategorias')
  return data as Subcategoria[]
}

// ─── Productos ───────────────────────────────────────────────

export interface FiltrosProductos {
  busqueda?: string
  categoriaSlug?: string
  subcategoriaSlug?: string
  proveedorIds?: string[]
  /** Compatibilidad temporal con consumidores existentes de un solo proveedor. */
  proveedorId?: string
  precioMin?: number
  precioMax?: number
  /** true: solo productos con stock > 0; false u omitido: sin filtro por stock */
  conStock?: boolean
  orden?: 'precio_asc' | 'precio_desc' | 'nombre_asc'
}

const collator = new Intl.Collator('es', { sensitivity: 'base' })

function compareNames(a: string, b: string): number {
  return collator.compare(a, b)
}

function ordenarProductos(productos: Producto[], orden: FiltrosProductos['orden']): Producto[] {
  const direccion = orden === 'precio_desc' ? -1 : 1
  return productos.slice().sort((a, b) => {
    if (orden === 'nombre_asc') return compareNames(a.nombre, b.nombre) || a.id.localeCompare(b.id)
    return (a.precio - b.precio) * direccion || compareNames(a.nombre, b.nombre) || a.id.localeCompare(b.id)
  })
}

function filtrarProductos(productos: Producto[], filtros?: FiltrosProductos): Producto[] {
  let resultado = productos
  if (filtros?.busqueda) {
    const q = filtros.busqueda.toLocaleLowerCase('es')
    resultado = resultado.filter((p) =>
      p.nombre.toLocaleLowerCase('es').includes(q) || p.descripcion?.toLocaleLowerCase('es').includes(q)
    )
  }
  if (filtros?.categoriaSlug && filtros.categoriaSlug !== 'todos') {
    resultado = resultado.filter((p) => p.categoria?.slug === filtros.categoriaSlug)
  }
  if (filtros?.subcategoriaSlug) {
    resultado = resultado.filter((p) => p.subcategoria?.slug === filtros.subcategoriaSlug)
  }
  const proveedorIds = filtros?.proveedorIds?.length ? filtros.proveedorIds : filtros?.proveedorId ? [filtros.proveedorId] : undefined
  if (proveedorIds) resultado = resultado.filter((p) => proveedorIds.includes(p.proveedor_id))
  const { min, max } = normalizePrecioRange(filtros?.precioMin, filtros?.precioMax)
  if (min !== undefined) resultado = resultado.filter((p) => p.precio >= min)
  if (max !== undefined) resultado = resultado.filter((p) => p.precio <= max)
  if (filtros?.conStock === true) {
    resultado = resultado.filter((p) => Math.max(0, p.stock - (p.stock_reservado ?? 0)) > 0)
  }
  return ordenarProductos(resultado, filtros?.orden ?? 'precio_asc')
}

function normalizePrecioRange(precioMin?: number, precioMax?: number): { min?: number; max?: number } {
  let min = precioMin !== undefined && Number.isFinite(precioMin) && precioMin >= 0 ? precioMin : undefined
  let max = precioMax !== undefined && Number.isFinite(precioMax) && precioMax >= 0 ? precioMax : undefined
  if (min !== undefined && max !== undefined && min > max) [min, max] = [max, min]
  return { min, max }
}

export async function getProductos(filtros?: FiltrosProductos): Promise<Producto[]> {
  if (!SUPABASE_DISPONIBLE) return filtrarProductos(PRODUCTOS_MOCK, filtros)

  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('productos')
    .select(`*, proveedor:proveedores(*), categoria:categorias(*), subcategoria:subcategorias(*)`)
    .eq('activo', true)

  if (error) propagarErrorLectura('getProductos', error)
  if (data === null) errorSinDatos('getProductos')
  return filtrarProductos(data as unknown as Producto[], filtros)
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

  if (error) propagarErrorLectura('getProductosDeProveedor', error)
  if (data === null) errorSinDatos('getProductosDeProveedor')
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
        (p) => p.proveedor?.id === prov.id && p.activo
      ).length,
    }))
  }

  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('proveedores')
    .select('*, productos(count)')
    .eq('productos.activo', true)
    .order('nombre_empresa')

  if (error) propagarErrorLectura('getProveedores', error)
  if (data === null) errorSinDatos('getProveedores')

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
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) propagarErrorLectura('getProveedorDelUsuario', userError)
  if (!user) return null

  const { data, error } = await supabase
    .from('proveedores')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) propagarErrorLectura('getProveedorDelUsuario', error)
  if (!data) return null
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

  if (productosRes.error) propagarErrorLectura('getStatsProveedor', productosRes.error)
  if (cotizacionesRes.error) propagarErrorLectura('getStatsProveedor', cotizacionesRes.error)
  if (productosRes.data === null || cotizacionesRes.data === null) errorSinDatos('getStatsProveedor')
  const productos = productosRes.data
  return {
    productosActivos: productos.filter((p) => p.activo).length,
    cotizacionesPendientes: cotizacionesRes.data.length,
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
        producto:productos(nombre, precio, stock, stock_reservado)
      )
    `)
    .eq('proveedor_id', proveedorId)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) propagarErrorLectura('getCotizacionesDeProveedor', error)
  if (data === null) errorSinDatos('getCotizacionesDeProveedor')
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

  if (error) propagarErrorLectura('getCotizacionesDelComprador', error)
  if (data === null) errorSinDatos('getCotizacionesDelComprador')
  return data as unknown as Cotizacion[]
}

// ─── Detalle compartido de una cotización ────────────────────

export async function getCotizacionDetalle(cotizacionId: string): Promise<CotizacionDetalle | null> {
  if (!SUPABASE_DISPONIBLE) return null

  const supabase = await getServerClient()
  const { data, error } = await supabase.rpc('get_cotizacion_detalle', {
    p_cotizacion_id: cotizacionId,
  })

  if (error) {
    if (error.code === '22P02' || error.message.includes('COTIZACION_NO_AUTORIZADA')) return null
    propagarErrorLectura('getCotizacionDetalle', error)
  }
  if (data === null) return null
  const detalle = data as unknown as CotizacionDetalle
  if (detalle.estado !== 'pendiente' || !detalle.items.some((item) => item.producto != null)) {
    return detalle
  }

  const productoIds = Array.from(new Set(
    detalle.items
      .filter((item) => item.producto != null)
      .map((item) => item.producto_id)
  ))
  let productos: { id: string; stock: number; stock_reservado: number | null }[] | null
  let errorProductos: unknown
  try {
    const resultado = await supabase
      .from('productos')
      .select('id, stock, stock_reservado')
      .in('id', productoIds)
    productos = resultado.data
    errorProductos = resultado.error
  } catch {
    return detalle
  }

  if (errorProductos || productos === null) return detalle

  const productoPorId = new Map(productos.map((producto) => [producto.id, producto]))
  const detalleConInventario = {
    ...detalle,
    items: detalle.items.map((item) => {
      if (item.producto == null) return item
      const productoActual = productoPorId.get(item.producto_id)
      if (!productoActual) return item
      return {
        ...item,
        producto: {
          ...item.producto,
          stock: productoActual.stock,
          stock_reservado: productoActual.stock_reservado,
        },
      }
    }),
  }
  // El RPC tipa `producto` sin inventario y el tipo Producto no contempla que
  // stock_reservado sea null, aunque ese es el valor que devuelve la base.
  return detalleConInventario as unknown as CotizacionDetalle
}

// ─── Feedback público y feedback de una cotización ─────────

export async function getFeedbackDeProveedor(
  proveedorId: string
): Promise<ResumenFeedbackProveedor> {
  if (!SUPABASE_DISPONIBLE) {
    const reseñasMock = FEEDBACK_MOCK.filter((feedback) => feedback.proveedor_id === proveedorId)
    return resumirFeedback(reseñasMock)
  }

  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('feedback_publico')
    .select('id, proveedor_id, calificacion, comentario, created_at, autor_anonimo')
    .eq('proveedor_id', proveedorId)
    .order('created_at', { ascending: false })

  if (error) propagarErrorLectura('getFeedbackDeProveedor', error)
  if (data === null) errorSinDatos('getFeedbackDeProveedor')
  return resumirFeedback(data as FeedbackPublico[])
}

export async function getFeedbackPorCotizacion(
  cotizacionId: string
): Promise<Feedback | null> {
  if (!SUPABASE_DISPONIBLE) {
    return FEEDBACK_MOCK.find((feedback) => feedback.cotizacion_id === cotizacionId) ?? null
  }

  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('feedback')
    .select('id, cotizacion_id, proveedor_id, calificacion, comentario, created_at')
    .eq('cotizacion_id', cotizacionId)
    .maybeSingle()

  if (error) propagarErrorLectura('getFeedbackPorCotizacion', error)
  if (!data) return null
  return { ...data, autor_anonimo: 'Comprador verificado' } as Feedback
}

function resumirFeedback(reseñas: FeedbackPublico[]): ResumenFeedbackProveedor {
  const conteo = reseñas.length
  const promedio = conteo
    ? Math.round((reseñas.reduce((suma, reseña) => suma + reseña.calificacion, 0) / conteo) * 100) / 100
    : 0
  return { reseñas: reseñas.slice(0, 50), promedio, conteo }
}

// ─── Producto individual ─────────────────────────────────────

export async function getProducto(id: string): Promise<Producto | null> {
  if (!SUPABASE_DISPONIBLE) {
    return PRODUCTOS_MOCK.find((p) => p.id === id) ?? null
  }

  const supabase = await getServerClient()
  const { data, error } = await supabase
    .from('productos')
    .select('*, proveedor:proveedores(*), categoria:categorias(*), subcategoria:subcategorias(*)')
    .eq('id', id)
    .maybeSingle()

  if (error) propagarErrorLectura('getProducto', error)
  if (!data) return null
  return data as unknown as Producto
}
