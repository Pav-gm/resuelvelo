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

export interface Producto {
  id: string
  proveedor_id: string
  categoria_id: string
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
}

export interface ItemCarrito {
  producto: Producto
  cantidad: number
}

export type EstadoCotizacion =
  | 'pendiente'
  | 'respondida'
  | 'aceptada'
  | 'rechazada'
  | 'despachada'
  | 'recibida'
  | 'cancelada'

/** Actor de una transición de venta; lo escriben las RPC de seguimiento. */
export type ActorVenta = 'comprador' | 'proveedor'

export interface Cotizacion {
  id: string
  comprador_id: string
  proveedor_id: string
  estado: EstadoCotizacion
  mensaje?: string
  total_estimado?: number
  created_at: string
  /** Fecha de despacho; la RPC despachar_cotizacion la fija al despachar. */
  despachada_at?: string | null
  /** Quién canceló; la RPC cancelar_venta escribe 'comprador' o 'proveedor'. */
  cancelada_por?: ActorVenta | null
  /** Quién confirmó la recepción; la RPC confirmar_recepcion lo escribe. */
  recibida_por?: ActorVenta | null
  items?: ItemCotizacion[]
}

export interface ItemCotizacion {
  id: string
  cotizacion_id: string
  producto_id: string
  cantidad: number
  precio_unitario?: number
  producto?: Producto
}
