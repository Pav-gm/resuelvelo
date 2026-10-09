import creditos from '@/public/productos/creditos.json'

/** Atribución de una foto con licencia libre (Wikimedia Commons), como la piden CC BY y CC BY-SA. */
export type CreditoFoto = { autor: string; licencia: string; pagina: string; archivo: string }

const porProducto = creditos as Record<string, CreditoFoto & Record<string, unknown>>

/** Crédito de la foto de un producto, solo si su imagen es la foto de catálogo que lo necesita. */
export function creditoFoto(productoId: string, imagenUrl?: string | null): CreditoFoto | null {
  const credito = porProducto[productoId]
  if (!credito || !imagenUrl || imagenUrl !== credito.archivo) return null
  return { autor: credito.autor, licencia: credito.licencia, pagina: credito.pagina, archivo: credito.archivo }
}
