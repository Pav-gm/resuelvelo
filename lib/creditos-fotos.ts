import creditos from '@/public/productos/creditos.json'

/** Atribución de una foto con licencia libre (Wikimedia Commons), como la piden CC BY y CC BY-SA. */
export type CreditoFoto = { autor: string; licencia: string; pagina: string; archivo: string }

const registros = Object.entries(creditos as Record<string, CreditoFoto & Record<string, unknown>>)
  .filter(([id]) => id.startsWith('d0000000-'))
  .map(([, credito]) => credito)

// Por archivo y no por producto: dos productos (por ejemplo el mismo cemento de dos proveedores) pueden compartir una foto
// y la licencia exige acreditarla en las dos fichas.
const porArchivo = new Map(registros.map((credito) => [credito.archivo, credito]))

/** Crédito de la foto de un producto, solo si su imagen es una foto de catálogo que lo necesita. */
export function creditoFoto(_productoId: string, imagenUrl?: string | null): CreditoFoto | null {
  const credito = imagenUrl ? porArchivo.get(imagenUrl) : undefined
  if (!credito) return null
  return { autor: credito.autor, licencia: credito.licencia, pagina: credito.pagina, archivo: credito.archivo }
}
