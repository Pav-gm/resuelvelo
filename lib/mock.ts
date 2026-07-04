import type { Categoria, Producto } from '@/types'

export const CATEGORIAS_MOCK: Categoria[] = [
  { id: 'c1', nombre: 'Materiales de construcción', slug: 'materiales', icono: '🧱' },
  { id: 'c2', nombre: 'Electricidad',               slug: 'electricidad', icono: '⚡' },
  { id: 'c3', nombre: 'Plomería',                   slug: 'plomeria', icono: '🔧' },
  { id: 'c4', nombre: 'Ferretería y pinturas',      slug: 'ferreteria', icono: '🔨' },
]

export const PRODUCTOS_MOCK: Producto[] = [
  {
    id: '1', proveedor_id: 'p1', categoria_id: 'c3',
    nombre: 'Tubo PVC 4" x 6m (sanitario)',
    descripcion: 'Tubería PVC sanitaria cédula 40, para sistemas de desagüe y alcantarillado.',
    precio: 680, unidad: 'unidad', stock: 120, activo: true, created_at: '',
    proveedor: { id: 'p1', user_id: 'u1', nombre_empresa: 'Promeria', verificado: true, created_at: '' },
    categoria: CATEGORIAS_MOCK[2],
  },
  {
    id: '2', proveedor_id: 'p1', categoria_id: 'c3',
    nombre: 'Tubo PVC 1/2" x 6m (presión)',
    precio: 180, unidad: 'unidad', stock: 350, activo: true, created_at: '',
    proveedor: { id: 'p1', user_id: 'u1', nombre_empresa: 'Promeria', verificado: true, created_at: '' },
    categoria: CATEGORIAS_MOCK[2],
  },
  {
    id: '3', proveedor_id: 'p1', categoria_id: 'c3',
    nombre: 'Llave de paso esférica 1/2" (bronce)',
    precio: 320, unidad: 'unidad', stock: 200, activo: true, created_at: '',
    proveedor: { id: 'p1', user_id: 'u1', nombre_empresa: 'Promeria', verificado: true, created_at: '' },
    categoria: CATEGORIAS_MOCK[2],
  },
  {
    id: '4', proveedor_id: 'p1', categoria_id: 'c3',
    nombre: 'Pegamento PVC Tangit 237ml',
    precio: 290, unidad: 'frasco', stock: 0, activo: true, created_at: '',
    proveedor: { id: 'p1', user_id: 'u1', nombre_empresa: 'Promeria', verificado: true, created_at: '' },
    categoria: CATEGORIAS_MOCK[2],
  },
  {
    id: '5', proveedor_id: 'p2', categoria_id: 'c2',
    nombre: 'Cable eléctrico THHN 12 AWG (rollo 100m)',
    precio: 3200, unidad: 'rollo', stock: 45, activo: true, created_at: '',
    proveedor: { id: 'p2', user_id: 'u2', nombre_empresa: 'Ferretería López', verificado: true, created_at: '' },
    categoria: CATEGORIAS_MOCK[1],
  },
  {
    id: '6', proveedor_id: 'p2', categoria_id: 'c2',
    nombre: 'Breaker Square D 20A 1 polo',
    precio: 580, unidad: 'unidad', stock: 80, activo: true, created_at: '',
    proveedor: { id: 'p2', user_id: 'u2', nombre_empresa: 'Ferretería López', verificado: true, created_at: '' },
    categoria: CATEGORIAS_MOCK[1],
  },
  {
    id: '7', proveedor_id: 'p2', categoria_id: 'c4',
    nombre: 'Pintura acrílica interior (cubo 5 galones)',
    precio: 2800, unidad: 'cubo', stock: 25, activo: true, created_at: '',
    proveedor: { id: 'p2', user_id: 'u2', nombre_empresa: 'Ferretería López', verificado: true, created_at: '' },
    categoria: CATEGORIAS_MOCK[3],
  },
  {
    id: '8', proveedor_id: 'p3', categoria_id: 'c1',
    nombre: 'Cemento Portland Tipo I (42.5 kg)',
    descripcion: 'Saco de cemento Portland gris, resistencia mínima 42.5 MPa.',
    precio: 850, unidad: 'saco', stock: 500, activo: true, created_at: '',
    proveedor: { id: 'p3', user_id: 'u3', nombre_empresa: 'Materiales del Norte', verificado: true, created_at: '' },
    categoria: CATEGORIAS_MOCK[0],
  },
  {
    id: '9', proveedor_id: 'p3', categoria_id: 'c1',
    nombre: 'Varilla de hierro 3/8" x 6m',
    precio: 420, unidad: 'unidad', stock: 300, activo: true, created_at: '',
    proveedor: { id: 'p3', user_id: 'u3', nombre_empresa: 'Materiales del Norte', verificado: true, created_at: '' },
    categoria: CATEGORIAS_MOCK[0],
  },
  {
    id: '10', proveedor_id: 'p3', categoria_id: 'c1',
    nombre: 'Bloques de hormigón 6" (pallet x 100)',
    precio: 4800, unidad: 'pallet', stock: 30, activo: true, created_at: '',
    proveedor: { id: 'p3', user_id: 'u3', nombre_empresa: 'Materiales del Norte', verificado: true, created_at: '' },
    categoria: CATEGORIAS_MOCK[0],
  },
]
