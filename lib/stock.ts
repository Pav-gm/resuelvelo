/** Unidades que todavía se pueden vender: stock físico menos lo reservado por ventas aceptadas. */
export function stockDisponible(producto: {
  stock: number
  stock_reservado?: number | null
}): number {
  const reservado = producto.stock_reservado ?? 0
  return Math.max(0, producto.stock - reservado)
}

/** El proveedor puede cerrar la venta si el cliente no confirma la recepción. */
export const DIAS_CONFIRMACION_PROVEEDOR = 7

export function fechaConfirmacionProveedor(despachadaAt: string | Date): Date {
  const inicio = new Date(despachadaAt)
  return new Date(inicio.getTime() + DIAS_CONFIRMACION_PROVEEDOR * 24 * 60 * 60 * 1000)
}

export function proveedorPuedeConfirmarRecepcion(
  despachadaAt: string | Date | null | undefined,
  ahora: Date = new Date()
): boolean {
  if (!despachadaAt) return false
  const inicio = new Date(despachadaAt)
  if (Number.isNaN(inicio.getTime())) return false
  return ahora.getTime() >= fechaConfirmacionProveedor(inicio).getTime()
}
