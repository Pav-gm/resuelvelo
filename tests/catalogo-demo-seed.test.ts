import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

type ValorSql = string | number | boolean | null

type ProductoDemo = {
  numero: number
  id: string
  proveedorId: string
  categoriaId: string
  nombre: string
  descripcion: string | null
  precio: number
  unidad: string
  stock: number
  subcategoriaId: string
}

const seed = readFileSync(join(process.cwd(), 'supabase/seed.sql'), 'utf8')
const migracion = readFileSync(
  join(process.cwd(), 'supabase/migrations/20261015010000_catalogo_demo_10_por_proveedor.sql'),
  'utf8',
)
const rollback = readFileSync(
  join(process.cwd(), 'supabase/rollbacks/20261015010000_catalogo_demo_10_por_proveedor.sql'),
  'utf8',
)

const PATRONES_DESTRUCTIVOS = [
  /\bdrop\b/i,
  /\bdelete\s+from\b/i,
  /\btruncate\b/i,
  /\brevoke\b/i,
  /\balter\s+policy\b/i,
  /\balter\s+(?:type\b|column\b[^;]*\btype\b|table\b[^;]*\btype\b)/i,
]

const SUBCATEGORIAS_PINTURA = new Set([
  'ferreteria-pinturas-y-esmaltes',
  'ferreteria-brochas-y-accesorios',
])

function uuid(prefijo: string, numero: number): string {
  return `${prefijo}-${String(numero).padStart(12, '0')}`
}

function proveedor(numero: number): string {
  return uuid('b0000000-0000-0000-0000', numero)
}

function idProducto(numero: number): string {
  return uuid('d0000000-0000-0000-0000', numero)
}

function rango(desde: number, hasta: number): number[] {
  return Array.from({ length: hasta - desde + 1 }, (_, indice) => desde + indice)
}

const FILAS_ESPERADAS: Record<string, number[]> = {
  [proveedor(1)]: [...rango(1, 4), ...rango(21, 26)],
  [proveedor(2)]: [...rango(5, 7), ...rango(27, 33)],
  [proveedor(3)]: [...rango(8, 10), ...rango(34, 40)],
  [proveedor(4)]: [...rango(11, 15), ...rango(41, 45)],
  [proveedor(5)]: [...rango(16, 20), ...rango(46, 50)],
  [proveedor(6)]: rango(51, 60),
  [proveedor(7)]: rango(61, 70),
  [proveedor(8)]: rango(71, 80),
  [proveedor(9)]: rango(81, 90),
  [proveedor(10)]: rango(91, 100),
}

const PAREJAS: Array<{
  proveedores: [string, string]
  pares: Array<[number, number]>
  obligatorios: string[]
}> = [
  {
    proveedores: [proveedor(4), proveedor(7)],
    pares: [
      [11, 61],
      [12, 62],
      [13, 63],
      [14, 64],
      [15, 65],
    ],
    obligatorios: [
      'Panel solar monocristalino 550W',
      'Batería de litio 5kWh',
      'Inversor híbrido 5kW (instalación incluida)',
      'Kit solar residencial 3kW llave en mano',
      'Evaluación de sistema eléctrico y consumo',
    ],
  },
  {
    proveedores: [proveedor(5), proveedor(8)],
    pares: [
      [16, 71],
      [17, 72],
      [18, 73],
      [19, 74],
      [20, 75],
    ],
    obligatorios: [
      'Chequeo pre-compra de vehículo',
      'Diagnóstico computarizado (scanner OBD-II)',
      'Inspección técnica de motocicleta',
      'Evaluación de chasis y suspensión',
      'Cambio de aceite y filtros (mano de obra)',
    ],
  },
  {
    proveedores: [proveedor(1), proveedor(9)],
    pares: [
      [1, 81],
      [2, 82],
      [3, 83],
      [4, 84],
      [21, 85],
    ],
    obligatorios: [
      'Tubo PVC 4" x 6m (sanitario)',
      'Tubo PVC 1/2" x 6m (presión)',
      'Llave de paso esférica 1/2" (bronce)',
      'Pegamento PVC Tangit 237ml',
    ],
  },
  {
    proveedores: [proveedor(3), proveedor(10)],
    pares: [
      [8, 91],
      [9, 92],
      [10, 93],
      [34, 94],
      [35, 95],
    ],
    obligatorios: [
      'Cemento Portland Tipo I (42.5 kg)',
      'Varilla de hierro 3/8" x 6m',
      'Bloques de hormigón 6" (pallet x 100)',
    ],
  },
  {
    proveedores: [proveedor(2), proveedor(6)],
    pares: [
      [7, 51],
      [27, 52],
      [28, 53],
      [29, 54],
      [30, 55],
    ],
    obligatorios: ['Pintura acrílica interior (cubo 5 galones)'],
  },
]

function saltarEspacios(sql: string, indice: number): number {
  let cursor = indice
  while (cursor < sql.length && /\s/.test(sql[cursor] ?? '')) cursor += 1
  return cursor
}

function saltarCast(sql: string, indice: number): number {
  const cast = /^\s*::[A-Za-z_][A-Za-z0-9_]*/.exec(sql.slice(indice))
  if (!cast) return indice
  return indice + cast[0].length
}

function leerValor(sql: string, inicio: number): { valor: ValorSql; fin: number } {
  if (sql[inicio] === "'") {
    let valor = ''
    let cursor = inicio + 1
    while (cursor < sql.length) {
      if (sql[cursor] === "'") {
        if (sql[cursor + 1] === "'") {
          valor += "'"
          cursor += 2
          continue
        }
        return { valor, fin: saltarCast(sql, cursor + 1) }
      }
      valor += sql[cursor]
      cursor += 1
    }
    throw new Error('Cadena SQL sin cerrar')
  }

  const token = /^(null|true|false|-?\d+(?:\.\d+)?)/i.exec(sql.slice(inicio))
  if (!token?.[1]) throw new Error(`Valor SQL inesperado cerca de: ${sql.slice(inicio, inicio + 60)}`)
  const texto = token[1]
  const fin = saltarCast(sql, inicio + texto.length)
  if (/^null$/i.test(texto)) return { valor: null, fin }
  if (/^true$/i.test(texto)) return { valor: true, fin }
  if (/^false$/i.test(texto)) return { valor: false, fin }
  return { valor: Number(texto), fin }
}

function parsearTupla(sql: string, inicio: number): ValorSql[] {
  const valores: ValorSql[] = []
  let cursor = inicio + 1
  while (cursor < sql.length) {
    cursor = saltarEspacios(sql, cursor)
    if (sql[cursor] === ')') return valores
    if (sql[cursor] === ',') {
      cursor += 1
      continue
    }
    const leido = leerValor(sql, cursor)
    valores.push(leido.valor)
    cursor = leido.fin
  }
  throw new Error('Tupla de producto sin cerrar')
}

function texto(valor: ValorSql, numero: number, campo: string): string {
  if (typeof valor !== 'string') throw new Error(`El producto ${numero} tiene ${campo} inválido`)
  return valor
}

function aProducto(valores: ValorSql[], numero: number): ProductoDemo {
  if (valores.length !== 9 && valores.length !== 13) {
    throw new Error(`El producto ${numero} tiene ${valores.length} columnas`)
  }
  const descripcion = valores[4]
  if (descripcion !== null && typeof descripcion !== 'string') {
    throw new Error(`El producto ${numero} tiene descripción inválida`)
  }
  if (typeof valores[5] !== 'number' || typeof valores[7] !== 'number') {
    throw new Error(`El producto ${numero} tiene precio o stock inválido`)
  }
  const subcategoria = valores[valores.length - 1]
  return {
    numero,
    id: texto(valores[0], numero, 'id'),
    proveedorId: texto(valores[1], numero, 'proveedor'),
    categoriaId: texto(valores[2], numero, 'categoría'),
    nombre: texto(valores[3], numero, 'nombre'),
    descripcion,
    precio: valores[5],
    unidad: texto(valores[6], numero, 'unidad'),
    stock: valores[7],
    subcategoriaId: texto(subcategoria, numero, 'subcategoría'),
  }
}

function extraerProductos(sql: string, desde: number, hasta: number): ProductoDemo[] {
  const productos: ProductoDemo[] = []
  for (const match of sql.matchAll(/\('d0000000-0000-0000-0000-(\d{12})'/g)) {
    const numero = Number(match[1])
    if (numero < desde || numero > hasta || match.index === undefined) continue
    productos.push(aProducto(parsearTupla(sql, match.index), numero))
  }
  return productos
}

function bloqueInsert(sql: string, encabezado: string): string {
  const inicio = sql.indexOf(encabezado)
  if (inicio < 0) throw new Error(`No se encontró ${encabezado}`)
  const fin = sql.indexOf('on conflict', inicio)
  if (fin < 0) throw new Error(`No se encontró el cierre de ${encabezado}`)
  return sql.slice(inicio, fin)
}

function catalogos(sql: string): { categorias: Map<string, string>; subcategorias: Set<string> } {
  const categorias = new Map<string, string>()
  const bloqueCategorias = bloqueInsert(sql, 'insert into public.categorias')
  for (const match of bloqueCategorias.matchAll(
    /\('(c1000000-0000-0000-0000-\d{12})'\s*,\s*'(?:[^']|'')*'\s*,\s*'([a-z0-9-]+)'/g,
  )) {
    const id = match[1]
    const slug = match[2]
    if (id && slug) categorias.set(id, slug)
  }

  const subcategorias = new Set<string>()
  const bloqueSubcategorias = bloqueInsert(sql, 'insert into public.subcategorias')
  for (const match of bloqueSubcategorias.matchAll(
    /\('([a-z0-9-]+)'\s*,\s*'([a-z0-9-]+)'\s*,\s*'(?:[^']|'')*'\)/g,
  )) {
    const categoria = match[1]
    const nombre = match[2]
    if (categoria && nombre) subcategorias.add(`${categoria}-${nombre}`)
  }

  return { categorias, subcategorias }
}

const productos = [
  ...extraerProductos(seed, 1, 20),
  ...extraerProductos(migracion, 21, 100),
]
const { categorias, subcategorias } = catalogos(seed)
const porNumero = new Map(productos.map((producto) => [producto.numero, producto]))

function exigirProducto(numero: number): ProductoDemo {
  const producto = porNumero.get(numero)
  if (!producto) throw new Error(`Falta el producto ${numero}`)
  return producto
}

function nombresDe(proveedorId: string): Map<string, ProductoDemo> {
  const nombres = new Map<string, ProductoDemo>()
  for (const producto of productos) {
    if (producto.proveedorId === proveedorId) nombres.set(producto.nombre, producto)
  }
  return nombres
}

describe('catálogo demo', () => {
  it('la migración crea exactamente diez productos para cada proveedor demo', () => {
    expect(productos).toHaveLength(100)
    expect(new Set(productos.map((producto) => producto.id)).size).toBe(100)
    expect(new Set(productos.map((producto) => producto.numero)).size).toBe(100)

    const proveedores = new Set(productos.map((producto) => producto.proveedorId))
    expect([...proveedores].sort()).toEqual(Object.keys(FILAS_ESPERADAS).sort())

    for (const [proveedorId, esperados] of Object.entries(FILAS_ESPERADAS)) {
      const numeros = productos
        .filter((producto) => producto.proveedorId === proveedorId)
        .map((producto) => producto.numero)
        .sort((a, b) => a - b)
      expect(numeros).toEqual(esperados)
      expect(numeros).toHaveLength(10)
    }
  })

  it('los IDs del catálogo demo son únicos y las categorías y subcategorías existen', () => {
    expect(new Set(productos.map((producto) => producto.id)).size).toBe(productos.length)
    expect(productos.map((producto) => producto.numero).sort((a, b) => a - b)).toEqual(rango(1, 100))

    for (const producto of productos) {
      const slugCategoria = categorias.get(producto.categoriaId)
      expect(slugCategoria, producto.id).toBeTruthy()
      expect(subcategorias.has(producto.subcategoriaId), `${producto.id} ${producto.subcategoriaId}`).toBe(true)
    }
  })

  it('las contrapartes repiten los productos requeridos con ofertas distintas', () => {
    for (const pareja of PAREJAS) {
      const [origenId, copiaId] = pareja.proveedores
      const origen = nombresDe(origenId)
      const copia = nombresDe(copiaId)
      const compartidos = [...origen.keys()].filter((nombre) => copia.has(nombre))

      expect(compartidos.length).toBeGreaterThanOrEqual(5)
      for (const nombre of pareja.obligatorios) expect(compartidos).toContain(nombre)

      for (const nombre of compartidos) {
        const izquierda = origen.get(nombre)
        const derecha = copia.get(nombre)
        if (!izquierda || !derecha) throw new Error(`Falta la oferta compartida ${nombre}`)
        expect(derecha.nombre).toBe(izquierda.nombre)
        expect(derecha.unidad).toBe(izquierda.unidad)
        expect(derecha.precio).not.toBe(izquierda.precio)
        expect(derecha.stock).not.toBe(izquierda.stock)
        expect(derecha.descripcion).not.toBe(izquierda.descripcion)
      }

      for (const [numeroOrigen, numeroCopia] of pareja.pares) {
        const izquierda = exigirProducto(numeroOrigen)
        const derecha = exigirProducto(numeroCopia)
        expect(derecha.nombre).toBe(izquierda.nombre)
        expect(derecha.unidad).toBe(izquierda.unidad)
        expect(derecha.precio).not.toBe(izquierda.precio)
        expect(derecha.stock).not.toBe(izquierda.stock)
        expect(derecha.descripcion).not.toBe(izquierda.descripcion)
      }
    }
  })

  it('Pinturas Caribe usa exclusivamente subcategorías de pintura', () => {
    const pinturas = productos.filter((producto) => producto.proveedorId === proveedor(6))
    expect(pinturas).toHaveLength(10)
    for (const producto of pinturas) {
      expect(SUBCATEGORIAS_PINTURA.has(producto.subcategoriaId), producto.nombre).toBe(true)
    }
  })

  it('la migración no contiene operaciones destructivas', () => {
    for (const patron of PATRONES_DESTRUCTIVOS) expect(migracion).not.toMatch(patron)
  })

  it('el rollback solo elimina productos nuevos sin cotizaciones', () => {
    expect(rollback.match(/\bdelete\s+from\b/gi)).toHaveLength(1)
    expect(rollback).toMatch(/delete\s+from\s+public\.productos\b/i)
    expect(rollback).toMatch(
      /between\s+'d0000000-0000-0000-0000-000000000021'::uuid\s+and\s+'d0000000-0000-0000-0000-000000000100'::uuid/i,
    )
    expect(rollback).toMatch(/not\s+exists\s*\(\s*select\s+1\s+from\s+public\.items_cotizacion\b/i)
    expect(rollback).not.toMatch(
      /\bdelete\s+from\s+(?:auth\.users|auth\.identities|public\.profiles|public\.proveedores|public\.proveedor_zonas)\b/i,
    )
    for (let numero = 1; numero <= 20; numero += 1) {
      expect(rollback).not.toContain(idProducto(numero))
    }
  })
})
