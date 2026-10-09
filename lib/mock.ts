import type { Categoria, Feedback, Producto, Subcategoria } from '@/types'

// El catálogo de demostración no incluye ventas recibidas; por eso no muestra
// reseñas inventadas ni permite asociarlas a cotizaciones inexistentes.
export const FEEDBACK_MOCK: Feedback[] = []

export const CATEGORIAS_MOCK: Categoria[] = [
  { id: 'c1', nombre: 'Materiales de construcción', slug: 'materiales', icono: '🧱' },
  { id: 'c2', nombre: 'Electricidad',               slug: 'electricidad', icono: '⚡' },
  { id: 'c3', nombre: 'Plomería',                   slug: 'plomeria', icono: '🔧' },
  { id: 'c4', nombre: 'Ferretería y pinturas',      slug: 'ferreteria', icono: '🔨' },
  { id: 'c5', nombre: 'Servicios automotrices',     slug: 'automotriz', icono: '🚗' },
]

const NOMBRES_SUBCATEGORIAS: Record<string, string[]> = {
  electricidad: ['Cables y conductores', 'Tomacorrientes e interruptores', 'Iluminación', 'Breakers y paneles', 'Canalización y accesorios'],
  ferreteria: ['Herramientas manuales', 'Herramientas eléctricas', 'Tornillería y fijaciones', 'Pinturas y esmaltes', 'Brochas y accesorios'],
  materiales: ['Cemento y mezclas', 'Bloques y ladrillos', 'Acero y varillas', 'Madera y paneles', 'Arena, grava y agregados'],
  plomeria: ['Tuberías', 'Conexiones y accesorios', 'Grifería', 'Sanitarios y lavamanos', 'Tanques y bombas'],
  automotriz: ['Mecánica general', 'Aceite y filtros', 'Frenos y suspensión', 'Baterías y electricidad automotriz', 'Lavado y estética'],
}

function slugNombre(nombre: string): string {
  return nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

export const SUBCATEGORIAS_MOCK: Subcategoria[] = CATEGORIAS_MOCK.flatMap((categoria) =>
  NOMBRES_SUBCATEGORIAS[categoria.slug].map((nombre) => ({
    id: `${categoria.slug}-${slugNombre(nombre)}`,
    categoria_id: categoria.id,
    nombre,
    slug: `${categoria.slug}-${slugNombre(nombre)}`,
  }))
)

function subcategoria(slug: string): Subcategoria {
  return SUBCATEGORIAS_MOCK.find((item) => item.slug === slug)!
}

export const PRODUCTOS_MOCK: Producto[] = [
  {
    id: '1', proveedor_id: 'p1', categoria_id: 'c3',
    subcategoria_id: 'plomeria-tuberias',
    nombre: 'Tubo PVC 4" x 6m (sanitario)',
    descripcion: 'Tubería PVC sanitaria cédula 40, para sistemas de desagüe y alcantarillado.',
    precio: 680, unidad: 'unidad', stock: 120, activo: true, created_at: '',
    proveedor: { id: 'p1', user_id: 'u1', nombre_empresa: 'Promeria', verificado: true, verificacion_estado: 'verificado', verificado_at: '2026-01-02T00:00:00.000Z', created_at: '' },
    categoria: CATEGORIAS_MOCK[2],
    subcategoria: subcategoria('plomeria-tuberias'),
  },
  {
    id: '2', proveedor_id: 'p1', categoria_id: 'c3',
    subcategoria_id: 'plomeria-tuberias',
    nombre: 'Tubo PVC 1/2" x 6m (presión)',
    precio: 180, unidad: 'unidad', stock: 350, activo: true, created_at: '',
    proveedor: { id: 'p1', user_id: 'u1', nombre_empresa: 'Promeria', verificado: true, verificacion_estado: 'verificado', verificado_at: '2026-01-02T00:00:00.000Z', created_at: '' },
    categoria: CATEGORIAS_MOCK[2],
    subcategoria: subcategoria('plomeria-tuberias'),
  },
  {
    id: '3', proveedor_id: 'p1', categoria_id: 'c3',
    subcategoria_id: 'plomeria-griferia',
    nombre: 'Llave de paso esférica 1/2" (bronce)',
    precio: 320, unidad: 'unidad', stock: 200, activo: true, created_at: '',
    proveedor: { id: 'p1', user_id: 'u1', nombre_empresa: 'Promeria', verificado: true, verificacion_estado: 'verificado', verificado_at: '2026-01-02T00:00:00.000Z', created_at: '' },
    categoria: CATEGORIAS_MOCK[2],
    subcategoria: subcategoria('plomeria-griferia'),
  },
  {
    id: '4', proveedor_id: 'p1', categoria_id: 'c3',
    subcategoria_id: 'plomeria-conexiones-y-accesorios',
    nombre: 'Pegamento PVC Tangit 237ml',
    precio: 290, unidad: 'frasco', stock: 0, activo: true, created_at: '',
    proveedor: { id: 'p1', user_id: 'u1', nombre_empresa: 'Promeria', verificado: true, verificacion_estado: 'verificado', verificado_at: '2026-01-02T00:00:00.000Z', created_at: '' },
    categoria: CATEGORIAS_MOCK[2],
    subcategoria: subcategoria('plomeria-conexiones-y-accesorios'),
  },
  {
    id: '5', proveedor_id: 'p2', categoria_id: 'c2',
    subcategoria_id: 'electricidad-cables-y-conductores',
    nombre: 'Cable eléctrico THHN 12 AWG (rollo 100m)',
    precio: 3200, unidad: 'rollo', stock: 45, activo: true, created_at: '',
    proveedor: { id: 'p2', user_id: 'u2', nombre_empresa: 'Ferretería López', verificado: true, verificacion_estado: 'verificado', verificado_at: '2026-01-02T00:00:00.000Z', created_at: '' },
    categoria: CATEGORIAS_MOCK[1],
    subcategoria: subcategoria('electricidad-cables-y-conductores'),
  },
  {
    id: '6', proveedor_id: 'p2', categoria_id: 'c2',
    subcategoria_id: 'electricidad-breakers-y-paneles',
    nombre: 'Breaker Square D 20A 1 polo',
    precio: 580, unidad: 'unidad', stock: 80, activo: true, created_at: '',
    proveedor: { id: 'p2', user_id: 'u2', nombre_empresa: 'Ferretería López', verificado: true, verificacion_estado: 'verificado', verificado_at: '2026-01-02T00:00:00.000Z', created_at: '' },
    categoria: CATEGORIAS_MOCK[1],
    subcategoria: subcategoria('electricidad-breakers-y-paneles'),
  },
  {
    id: '7', proveedor_id: 'p2', categoria_id: 'c4',
    subcategoria_id: 'ferreteria-pinturas-y-esmaltes',
    nombre: 'Pintura acrílica interior (cubo 5 galones)',
    precio: 2800, unidad: 'cubo', stock: 25, activo: true, created_at: '',
    proveedor: { id: 'p2', user_id: 'u2', nombre_empresa: 'Ferretería López', verificado: true, verificacion_estado: 'verificado', verificado_at: '2026-01-02T00:00:00.000Z', created_at: '' },
    categoria: CATEGORIAS_MOCK[3],
    subcategoria: subcategoria('ferreteria-pinturas-y-esmaltes'),
  },
  {
    id: '8', proveedor_id: 'p3', categoria_id: 'c1',
    subcategoria_id: 'materiales-cemento-y-mezclas',
    nombre: 'Cemento Portland Tipo I (42.5 kg)',
    descripcion: 'Saco de cemento Portland gris, resistencia mínima 42.5 MPa.',
    precio: 850, unidad: 'saco', stock: 500, activo: true, created_at: '',
    proveedor: { id: 'p3', user_id: 'u3', nombre_empresa: 'Materiales del Norte', verificado: true, verificacion_estado: 'verificado', verificado_at: '2026-01-02T00:00:00.000Z', created_at: '' },
    categoria: CATEGORIAS_MOCK[0],
    subcategoria: subcategoria('materiales-cemento-y-mezclas'),
  },
  {
    id: '9', proveedor_id: 'p3', categoria_id: 'c1',
    subcategoria_id: 'materiales-acero-y-varillas',
    nombre: 'Varilla de hierro 3/8" x 6m',
    precio: 420, unidad: 'unidad', stock: 300, activo: true, created_at: '',
    proveedor: { id: 'p3', user_id: 'u3', nombre_empresa: 'Materiales del Norte', verificado: true, verificacion_estado: 'verificado', verificado_at: '2026-01-02T00:00:00.000Z', created_at: '' },
    categoria: CATEGORIAS_MOCK[0],
    subcategoria: subcategoria('materiales-acero-y-varillas'),
  },
  {
    id: '10', proveedor_id: 'p3', categoria_id: 'c1',
    subcategoria_id: 'materiales-bloques-y-ladrillos',
    nombre: 'Bloques de hormigón 6" (pallet x 100)',
    precio: 4800, unidad: 'pallet', stock: 30, activo: true, created_at: '',
    proveedor: { id: 'p3', user_id: 'u3', nombre_empresa: 'Materiales del Norte', verificado: true, verificacion_estado: 'verificado', verificado_at: '2026-01-02T00:00:00.000Z', created_at: '' },
    categoria: CATEGORIAS_MOCK[0],
    subcategoria: subcategoria('materiales-bloques-y-ladrillos'),
  },
]
