/** Unidades que todavía se pueden vender: stock físico menos lo reservado por ventas aceptadas. */
export function stockDisponible(producto: {
  stock: number
  stock_reservado?: number | null
}): number {
  const reservado = producto.stock_reservado ?? 0
  return Math.max(0, producto.stock - reservado)
}
