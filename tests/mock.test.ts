/**
 * Tests de los datos mock
 * Validan integridad: estructura, tipos, relaciones entre productos y categorías
 */
import { describe, it, expect } from 'vitest'
import { PRODUCTOS_MOCK, CATEGORIAS_MOCK, SUBCATEGORIAS_MOCK } from '@/lib/mock'

describe('Datos mock — categorías', () => {
  it('existen cinco categorías mock incluyendo automotriz', () => {
    expect(CATEGORIAS_MOCK).toHaveLength(5)
  })

  it('cada categoría tiene id, nombre y slug únicos', () => {
    const ids   = CATEGORIAS_MOCK.map((c) => c.id)
    const slugs = CATEGORIAS_MOCK.map((c) => c.slug)
    expect(new Set(ids).size).toBe(CATEGORIAS_MOCK.length)
    expect(new Set(slugs).size).toBe(CATEGORIAS_MOCK.length)
  })

  it('los slugs requeridos existen', () => {
    const slugs = CATEGORIAS_MOCK.map((c) => c.slug)
    expect(slugs).toContain('materiales')
    expect(slugs).toContain('electricidad')
    expect(slugs).toContain('plomeria')
    expect(slugs).toContain('ferreteria')
    expect(slugs).toContain('automotriz')
  })
})

describe('Datos mock — subcategorías', () => {
  it('cada producto mock tiene subcategoría de su categoría', () => {
    expect(SUBCATEGORIAS_MOCK).toHaveLength(26)
    for (const categoria of CATEGORIAS_MOCK) {
      expect(SUBCATEGORIAS_MOCK.filter((s) => s.categoria_id === categoria.id)).toHaveLength(
        categoria.slug === 'electricidad' ? 6 : 5,
      )
    }
    for (const producto of PRODUCTOS_MOCK) {
      expect(producto.subcategoria_id).toBeTruthy()
      expect(producto.subcategoria).toBeDefined()
      expect(producto.subcategoria?.categoria_id).toBe(producto.categoria_id)
    }
  })
})

describe('Datos mock — productos', () => {
  it('existen 100 productos de ejemplo', () => {
    expect(PRODUCTOS_MOCK).toHaveLength(100)
  })

  it('todos los productos tienen campos obligatorios', () => {
    for (const p of PRODUCTOS_MOCK) {
      expect(p.id, `Producto "${p.nombre}" sin id`).toBeTruthy()
      expect(p.nombre, `Producto sin nombre`).toBeTruthy()
      expect(p.precio, `Producto "${p.nombre}" con precio inválido`).toBeGreaterThan(0)
      expect(p.unidad, `Producto "${p.nombre}" sin unidad`).toBeTruthy()
      expect(typeof p.stock).toBe('number')
      expect(typeof p.activo).toBe('boolean')
    }
  })

  it('ningún precio es negativo', () => {
    for (const p of PRODUCTOS_MOCK) {
      expect(p.precio).toBeGreaterThanOrEqual(0)
    }
  })

  it('ningún stock es negativo', () => {
    for (const p of PRODUCTOS_MOCK) {
      expect(p.stock).toBeGreaterThanOrEqual(0)
    }
  })

  it('todos los productos tienen proveedor embebido', () => {
    for (const p of PRODUCTOS_MOCK) {
      expect(p.proveedor, `Producto "${p.nombre}" sin proveedor`).toBeDefined()
      expect(p.proveedor?.nombre_empresa).toBeTruthy()
    }
  })

  it('todos los IDs de productos son únicos', () => {
    const ids = PRODUCTOS_MOCK.map((p) => p.id)
    expect(new Set(ids).size).toBe(PRODUCTOS_MOCK.length)
  })

  it('los 10 proveedores de demo están presentes con diez productos cada uno', () => {
    const empresas = new Set(PRODUCTOS_MOCK.map((p) => p.proveedor?.nombre_empresa))
    expect(empresas).toEqual(new Set([
      'Promeria', 'Ferretería López', 'Materiales del Norte', 'SolarTech RD', 'AutoChequeo RD',
      'Pinturas Caribe', 'EcoSolar Dominicana', 'MecaniExpress RD', 'Hidrosanitarios del Cibao',
      'Aceros y Cemento del Este',
    ]))
    for (const empresa of empresas) {
      expect(PRODUCTOS_MOCK.filter((p) => p.proveedor?.nombre_empresa === empresa)).toHaveLength(10)
    }
  })

  it('todos los productos tienen categoría embebida con slug válido', () => {
    const slugsValidos = CATEGORIAS_MOCK.map((c) => c.slug)
    for (const p of PRODUCTOS_MOCK) {
      expect(p.categoria, `Producto "${p.nombre}" sin categoría`).toBeDefined()
      expect(slugsValidos).toContain(p.categoria?.slug)
    }
  })
})
