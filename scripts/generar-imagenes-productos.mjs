// Genera las imágenes de relleno del catálogo de demostración.
//
// Cada SVG es determinista: la misma fila (id, nombre, categoría) produce siempre
// los mismos bytes, sin marcas de tiempo ni aleatoriedad. Se usa un SVG de 800×600
// con el color y el icono de la categoría y el nombre del producto en texto.
//
// Solo se declaran aquí las filas que NO reutilizan una foto existente (`.jpg`) ni
// un SVG canónico de otro producto; esas filas conservan su `imagen_url` original.
//
// Uso:
//   node scripts/generar-imagenes-productos.mjs
//   node scripts/generar-imagenes-productos.mjs --salida <directorio>
//   node scripts/generar-imagenes-productos.mjs --salida <directorio> --datos <archivo.json>
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const ANCHO = 800
export const ALTO = 600

/** Color de fondo, color de texto e icono de cada categoría del catálogo. */
export const CATEGORIAS_SVG = {
  materiales: { fondo: '#FEF3C7', texto: '#78350F', icono: '🧱' },
  electricidad: { fondo: '#E0F2FE', texto: '#0C4A6E', icono: '⚡' },
  plomeria: { fondo: '#DBEAFE', texto: '#1E40AF', icono: '🔧' },
  ferreteria: { fondo: '#FCE7F3', texto: '#9D174D', icono: '🔨' },
  automotriz: { fondo: '#DCFCE7', texto: '#166534', icono: '🚗' },
}

/**
 * Filas del catálogo demo que necesitan una imagen de relleno.
 * `path` es `public/productos/<id>.svg` y `imageUrl` es `/productos/<id>.svg`.
 */
export const PRODUCTOS_SVG = [
  // Promeria (plomería)
  { id: 'd0000000-0000-0000-0000-000000000021', nombre: 'Filtro de agua doméstico 10 pulgadas', categoria: 'plomeria' },
  { id: 'd0000000-0000-0000-0000-000000000022', nombre: 'Válvula check PVC 2"', categoria: 'plomeria' },
  { id: 'd0000000-0000-0000-0000-000000000023', nombre: 'Codo PVC sanitario 4"', categoria: 'plomeria' },
  { id: 'd0000000-0000-0000-0000-000000000024', nombre: 'Inodoro de dos piezas blanco', categoria: 'plomeria' },
  { id: 'd0000000-0000-0000-0000-000000000025', nombre: 'Bomba de agua 1/2 HP', categoria: 'plomeria' },
  { id: 'd0000000-0000-0000-0000-000000000026', nombre: 'Ducha eléctrica 4 temperaturas', categoria: 'plomeria' },
  // Ferretería López (ferretería y pinturas)
  { id: 'd0000000-0000-0000-0000-000000000027', nombre: 'Brocha profesional 3 pulgadas', categoria: 'ferreteria' },
  { id: 'd0000000-0000-0000-0000-000000000028', nombre: 'Rodillo para pintar 9 pulgadas', categoria: 'ferreteria' },
  { id: 'd0000000-0000-0000-0000-000000000029', nombre: 'Lija para pared grano 120 (paquete)', categoria: 'ferreteria' },
  { id: 'd0000000-0000-0000-0000-000000000030', nombre: 'Cinta de enmascarar 2 pulgadas', categoria: 'ferreteria' },
  { id: 'd0000000-0000-0000-0000-000000000031', nombre: 'Taladro percutor 1/2"', categoria: 'ferreteria' },
  { id: 'd0000000-0000-0000-0000-000000000032', nombre: 'Juego de destornilladores 6 piezas', categoria: 'ferreteria' },
  { id: 'd0000000-0000-0000-0000-000000000033', nombre: 'Tornillo para madera 2"', categoria: 'ferreteria' },
  // Materiales del Norte (materiales de construcción)
  { id: 'd0000000-0000-0000-0000-000000000034', nombre: 'Alambre negro recocido calibre 16 (rollo)', categoria: 'materiales' },
  { id: 'd0000000-0000-0000-0000-000000000035', nombre: 'Mortero premezclado de albañilería (saco)', categoria: 'materiales' },
  { id: 'd0000000-0000-0000-0000-000000000036', nombre: 'Arena lavada', categoria: 'materiales' },
  { id: 'd0000000-0000-0000-0000-000000000037', nombre: 'Grava triturada', categoria: 'materiales' },
  { id: 'd0000000-0000-0000-0000-000000000038', nombre: 'Cemento blanco', categoria: 'materiales' },
  { id: 'd0000000-0000-0000-0000-000000000039', nombre: 'Panel de plywood 1/2"', categoria: 'materiales' },
  { id: 'd0000000-0000-0000-0000-000000000040', nombre: 'Bloque de hormigón 4"', categoria: 'materiales' },
  // SolarTech RD (electricidad)
  { id: 'd0000000-0000-0000-0000-000000000041', nombre: 'Controlador MPPT 60A', categoria: 'electricidad' },
  { id: 'd0000000-0000-0000-0000-000000000042', nombre: 'Estructura para 6 paneles', categoria: 'electricidad' },
  { id: 'd0000000-0000-0000-0000-000000000043', nombre: 'Cable solar fotovoltaico 10 AWG', categoria: 'electricidad' },
  { id: 'd0000000-0000-0000-0000-000000000044', nombre: 'Optimizador de potencia solar', categoria: 'electricidad' },
  { id: 'd0000000-0000-0000-0000-000000000045', nombre: 'Mantenimiento preventivo de sistema solar', categoria: 'electricidad' },
  // AutoChequeo RD (servicios automotrices)
  { id: 'd0000000-0000-0000-0000-000000000046', nombre: 'Limpieza de inyectores', categoria: 'automotriz' },
  { id: 'd0000000-0000-0000-0000-000000000047', nombre: 'Revisión de frenos', categoria: 'automotriz' },
  { id: 'd0000000-0000-0000-0000-000000000048', nombre: 'Diagnóstico de batería automotriz', categoria: 'automotriz' },
  { id: 'd0000000-0000-0000-0000-000000000049', nombre: 'Lavado detallado de vehículo', categoria: 'automotriz' },
  { id: 'd0000000-0000-0000-0000-000000000050', nombre: 'Cambio de filtro de aire', categoria: 'automotriz' },
  // Pinturas Caribe (ferretería y pinturas)
  { id: 'd0000000-0000-0000-0000-000000000056', nombre: 'Pintura acrílica exterior (cubo 5 galones)', categoria: 'ferreteria' },
  { id: 'd0000000-0000-0000-0000-000000000057', nombre: 'Esmalte sintético anticorrosivo (galón)', categoria: 'ferreteria' },
  { id: 'd0000000-0000-0000-0000-000000000058', nombre: 'Sellador acrílico para paredes (galón)', categoria: 'ferreteria' },
  { id: 'd0000000-0000-0000-0000-000000000059', nombre: 'Masilla para paredes (cubeta)', categoria: 'ferreteria' },
  { id: 'd0000000-0000-0000-0000-000000000060', nombre: 'Thinner multiuso (galón)', categoria: 'ferreteria' },
  // EcoSolar Dominicana (electricidad)
  { id: 'd0000000-0000-0000-0000-000000000066', nombre: 'Microinversor 2kW', categoria: 'electricidad' },
  { id: 'd0000000-0000-0000-0000-000000000067', nombre: 'Batería LiFePO4 10kWh', categoria: 'electricidad' },
  { id: 'd0000000-0000-0000-0000-000000000068', nombre: 'Cable solar fotovoltaico 6 AWG', categoria: 'electricidad' },
  { id: 'd0000000-0000-0000-0000-000000000069', nombre: 'Estructura de techo para 8 paneles', categoria: 'electricidad' },
  { id: 'd0000000-0000-0000-0000-000000000070', nombre: 'Mantenimiento de inversor híbrido', categoria: 'electricidad' },
  // MecaniExpress RD (servicios automotrices)
  { id: 'd0000000-0000-0000-0000-000000000076', nombre: 'Alineación y balanceo', categoria: 'automotriz' },
  { id: 'd0000000-0000-0000-0000-000000000077', nombre: 'Limpieza de inyectores por ultrasonido', categoria: 'automotriz' },
  { id: 'd0000000-0000-0000-0000-000000000078', nombre: 'Revisión de sistema de frenos ABS', categoria: 'automotriz' },
  { id: 'd0000000-0000-0000-0000-000000000079', nombre: 'Cambio de bujías', categoria: 'automotriz' },
  { id: 'd0000000-0000-0000-0000-000000000080', nombre: 'Diagnóstico de alternador y arranque', categoria: 'automotriz' },
  // Hidrosanitarios del Cibao (plomería)
  { id: 'd0000000-0000-0000-0000-000000000084', nombre: 'Pegamento PVC Tangit 237ml', categoria: 'plomeria' },
  { id: 'd0000000-0000-0000-0000-000000000086', nombre: 'Lavamanos cerámico blanco', categoria: 'plomeria' },
  { id: 'd0000000-0000-0000-0000-000000000087', nombre: 'Tanque de agua 500 galones', categoria: 'plomeria' },
  { id: 'd0000000-0000-0000-0000-000000000088', nombre: 'Mezcladora para fregadero', categoria: 'plomeria' },
  { id: 'd0000000-0000-0000-0000-000000000089', nombre: 'Tubo CPVC 3/4" x 6m', categoria: 'plomeria' },
  { id: 'd0000000-0000-0000-0000-000000000090', nombre: 'Bomba presurizadora 1/2 HP', categoria: 'plomeria' },
  // Aceros y Cemento del Este (materiales de construcción)
  { id: 'd0000000-0000-0000-0000-000000000096', nombre: 'Malla electrosoldada 6x6 (panel)', categoria: 'materiales' },
  { id: 'd0000000-0000-0000-0000-000000000097', nombre: 'Cemento de albañilería (saco)', categoria: 'materiales' },
  { id: 'd0000000-0000-0000-0000-000000000098', nombre: 'Varilla corrugada 1/2" x 6m', categoria: 'materiales' },
  { id: 'd0000000-0000-0000-0000-000000000099', nombre: 'Grava fina', categoria: 'materiales' },
  { id: 'd0000000-0000-0000-0000-000000000100', nombre: 'Bloque de hormigón 8"', categoria: 'materiales' },
]

const DIRECTORIO_POR_DEFECTO = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'productos')

/** Escapa un valor para usarlo en XML, tanto en atributos como en contenido de texto. */
export function escaparXml(valor) {
  return String(valor)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;')
}

const FUENTE = 'Arial, Helvetica, sans-serif'
const MAX_CARACTERES_LINEA = 26

/**
 * Divide el nombre en una o dos líneas visibles dentro del recorte cuadrado.
 * `ProductoImagen` recorta 100 unidades a cada lado de la imagen 800×600, por lo
 * que el texto debe mantenerse dentro de x 120–680. Los nombres largos se parten
 * en el último espacio en la posición 26 o anterior.
 */
export function dividirNombre(nombre) {
  const texto = String(nombre)
  if (texto.length <= MAX_CARACTERES_LINEA) return [texto]
  let corte = texto.lastIndexOf(' ', MAX_CARACTERES_LINEA)
  if (corte <= 0) corte = MAX_CARACTERES_LINEA
  const primera = texto.slice(0, corte).trimEnd()
  const segunda = texto.slice(corte + 1).trimStart()
  return segunda ? [primera, segunda] : [texto]
}

/** Devuelve el SVG (determinista) de una fila `{ nombre, categoria }`. */
export function generarSvg({ nombre, categoria }) {
  const estilo = CATEGORIAS_SVG[categoria]
  if (!estilo) throw new Error(`Categoría sin estilo declarado: ${categoria}`)
  const titulo = escaparXml(nombre)
  const lineas = dividirNombre(nombre)
  const texto =
    lineas.length === 1
      ? `  <text x="${ANCHO / 2}" y="460" font-size="34" font-weight="600" text-anchor="middle" fill="${estilo.texto}" font-family="${FUENTE}">${escaparXml(lineas[0])}</text>`
      : `  <text x="${ANCHO / 2}" font-size="34" font-weight="600" text-anchor="middle" fill="${estilo.texto}" font-family="${FUENTE}"><tspan x="${ANCHO / 2}" y="430">${escaparXml(lineas[0])}</tspan><tspan x="${ANCHO / 2}" y="475">${escaparXml(lineas[1])}</tspan></text>`
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${ANCHO}" height="${ALTO}" viewBox="0 0 ${ANCHO} ${ALTO}" role="img" aria-label="${titulo}">`,
    `  <rect width="${ANCHO}" height="${ALTO}" fill="${estilo.fondo}"/>`,
    `  <text x="${ANCHO / 2}" y="250" font-size="200" text-anchor="middle" dominant-baseline="middle">${estilo.icono}</text>`,
    texto,
    '</svg>',
    '',
  ].join('\n')
}

/** Ruta pública del SVG de una fila. */
export function rutaSvg(id) {
  return `/productos/${id}.svg`
}

/**
 * Escribe `<id>.svg` para cada fila en `directorio`.
 * Omite las filas que reutilizan un `.jpg` o el SVG canónico de otro producto.
 */
export function generarImagenes({ productos = PRODUCTOS_SVG, directorio = DIRECTORIO_POR_DEFECTO } = {}) {
  mkdirSync(directorio, { recursive: true })
  const escritos = []
  for (const fila of productos) {
    if (fila.imagenUrl && fila.imagenUrl !== rutaSvg(fila.id)) continue
    if (existsSync(join(directorio, `${fila.id}.jpg`))) continue
    const destino = join(directorio, `${fila.id}.svg`)
    writeFileSync(destino, generarSvg(fila), 'utf8')
    escritos.push(destino)
  }
  return escritos
}

function leerArgumentos(argumentos) {
  const opciones = {}
  for (let i = 0; i < argumentos.length; i += 1) {
    const nombre = argumentos[i]
    if (nombre === '--salida' || nombre === '--datos') {
      const valor = argumentos[i + 1]
      if (!valor) throw new Error(`Falta el valor de ${nombre}`)
      opciones[nombre === '--salida' ? 'salida' : 'datos'] = valor
      i += 1
    } else {
      throw new Error(`Argumento no reconocido: ${nombre}`)
    }
  }
  return opciones
}

function leerDatos(archivo) {
  const contenido = JSON.parse(readFileSync(archivo, 'utf8'))
  const filas = Array.isArray(contenido) ? contenido : contenido?.productos
  if (!Array.isArray(filas)) throw new Error(`El archivo de datos no contiene una lista de productos: ${archivo}`)
  return filas
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const opciones = leerArgumentos(process.argv.slice(2))
  const productos = opciones.datos ? leerDatos(opciones.datos) : PRODUCTOS_SVG
  const escritos = generarImagenes({ productos, directorio: opciones.salida ?? DIRECTORIO_POR_DEFECTO })
  console.log(`SVG de relleno generados: ${escritos.length}`)
}
