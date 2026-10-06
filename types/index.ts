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

export interface Proveedor {
  id: string
  user_id: string
  nombre_empresa: string
  descripcion?: string
  direccion?: string
  ciudad?: string
  logo_url?: string
  verificado: boolean
  created_at: string
}

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
  imagen_url?: string
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
  items?: ItemCotizacion[]
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
  precio_unitario?: number
  producto?: Producto
}
