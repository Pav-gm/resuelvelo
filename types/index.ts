export type UserRole = 'comprador' | 'proveedor' | 'admin'

export interface Profile {
  id: string
  email: string
  nombre: string
  rol: UserRole
  telefono?: string
  avatar_url?: string
  created_at: string
}

export type NotificacionTipo =
  | 'nueva_solicitud'
  | 'cotizacion_respondida'
  | 'cotizacion_aceptada'
  | 'cotizacion_rechazada'
  | 'cotizacion_despachada'
  | 'cotizacion_recibida'
  | 'cotizacion_cancelada'

export interface Notificacion {
  id: string
  user_id: string
  tipo: string
  cotizacion_id: string | null
  titulo: string
  cuerpo: string
  leida_at: string | null
  created_at: string
}

export interface Proveedor {
  id: string
  user_id: string
  nombre_empresa: string
  descripcion?: string
  direccion?: string
  ciudad?: string
  logo_url?: string
  rnc?: string | null
  telefono?: string | null
  whatsapp?: string | null
  horario?: string | null
  sitio_web?: string | null
  zonas_cobertura?: string[]
  verificado: boolean
  created_at: string
  promedio_feedback?: number
  conteo_feedback?: number
}

export type PerfilProveedor = Proveedor & {
  rnc: string | null
  telefono: string | null
  whatsapp: string | null
  horario: string | null
  sitio_web: string | null
  zonas_cobertura: string[]
}

export type PerfilProveedorActionResult = { error: string } | { success: true }

export interface Categoria {
  id: string
  nombre: string
  slug: string
  icono?: string
}

export interface Subcategoria {
  id: string
  categoria_id: string
  nombre: string
  slug: string
}

export interface Producto {
  id: string
  proveedor_id: string
  categoria_id: string
  subcategoria_id: string | null
  nombre: string
  descripcion?: string
  precio: number
  unidad: string
  stock: number
  stock_reservado?: number
  imagen_url?: string | null
  sku?: string | null
  especificaciones?: string | null
  itbis_incluido?: boolean
  activo: boolean
  created_at: string
  proveedor?: Proveedor
  categoria?: Categoria
  subcategoria?: Subcategoria | null
}

export interface ItemCarrito {
  producto: Producto
  cantidad: number
}

export interface Cotizacion {
  id: string
  numero: number
  comprador_id: string
  proveedor_id: string
  estado: 'pendiente' | 'respondida' | 'aceptada' | 'rechazada' | 'despachada' | 'recibida' | 'cancelada'
  mensaje?: string
  total_estimado?: number
  created_at: string
  /** Fecha de despacho (columna despachada_at); null hasta que el proveedor despache. */
  despachada_at?: string | null
  /** Quién canceló la venta; null si no está cancelada. */
  cancelada_por?: 'comprador' | 'proveedor' | null
  /** Fecha de cancelación; null en cotizaciones históricas sin esos datos. */
  cancelada_at?: string | null
  /** Motivo de cancelación; null en cotizaciones históricas sin esos datos. */
  cancelada_motivo?: string | null
  plazo_dias?: number | null
  valida_hasta?: string | null
  condiciones?: string | null
  respondida_at?: string | null
  total_ofertado?: number | null
  motivo_rechazo?: string | null
  rechazada_at?: string | null
  aceptada_at?: string | null
  rechazada_motivo?: string | null
  items?: ItemCotizacion[]
}

export type LineaOfertaInput = {
  itemId: string
  precioUnitario: number
  cantidadOfertada: number | null
}

export type OfertaCotizacionInput = {
  lineas: LineaOfertaInput[]
  plazoDias: number
  validaHasta: string
  condiciones: string | null
}

export type CotizacionActionResult = { error: string } | null

export type OpcionMotivoCancelacion =
  | 'Ya no lo necesito'
  | 'Encontré mejor precio'
  | 'Error en el pedido'
  | 'Sin stock'
  | 'Otro'

export type MotivoCancelacionInput = {
  opcion: OpcionMotivoCancelacion
  detalle?: string
}

export type CotizacionDetalle = Cotizacion & {
  proveedor: Pick<Proveedor, 'id' | 'nombre_empresa' | 'ciudad' | 'verificado'>
  comprador: Pick<Profile, 'id' | 'nombre' | 'email'> & { telefono: string | null }
  items: Array<ItemCotizacion & { producto: Pick<Producto, 'id' | 'nombre' | 'activo'> & { precio?: number } | null }>
}

export interface Feedback {
  id: string
  cotizacion_id: string
  proveedor_id: string
  calificacion: number
  comentario?: string | null
  created_at: string
  /** Identidad pública anonimizada; no representa un dato de perfil. */
  autor_anonimo: string
  respuesta?: string | null
  respuesta_at?: string | null
}

export type FeedbackPublico = Omit<Feedback, 'cotizacion_id'>

export interface ResumenFeedbackProveedor {
  reseñas: FeedbackPublico[]
  promedio: number
  conteo: number
}

export interface ItemCotizacion {
  id: string
  cotizacion_id: string
  producto_id: string
  cantidad: number
  /** Cantidad aceptada por el proveedor; null en cotizaciones anteriores o pendientes. */
  cantidad_confirmada?: number | null
  precio_ofertado?: number | null
  cantidad_ofertada?: number | null
  precio_unitario?: number
  producto?: Producto
  /** true si la cantidad pedida superaba el stock al cotizar. */
  sujeta_disponibilidad: boolean
  /** Stock observado al cotizar; null en líneas históricas o sin snapshot. */
  stock_al_cotizar: number | null
}
