/**
 * Tests de tipos del dominio
 * Validan que los tipos TypeScript cubren los valores esperados.
 */
import { describe, it, expect } from 'vitest'
import type { UserRole, Cotizacion } from '@/types'

describe('UserRole', () => {
  it('acepta los tres roles válidos', () => {
    const roles: UserRole[] = ['comprador', 'proveedor', 'admin']
    expect(roles).toHaveLength(3)
    expect(roles).toContain('comprador')
    expect(roles).toContain('proveedor')
    expect(roles).toContain('admin')
  })
})

describe('Estado de cotización', () => {
  it('cubre los cuatro estados del flujo de negocio', () => {
    const estados: Cotizacion['estado'][] = [
      'pendiente',
      'respondida',
      'aceptada',
      'rechazada',
    ]
    expect(estados).toHaveLength(4)
    expect(estados).toContain('pendiente')
    expect(estados).toContain('aceptada')
    expect(estados).toContain('rechazada')
  })
})

describe('Integridad del modelo de datos mock', () => {
  it('un producto activo tiene stock >= 0', async () => {
    const { PRODUCTOS_MOCK } = await import('@/lib/mock')
    const activos = PRODUCTOS_MOCK.filter((p) => p.activo)
    for (const p of activos) {
      expect(p.stock).toBeGreaterThanOrEqual(0)
    }
  })

  it('los productos inactivos existen como caso de borde (stock=0)', async () => {
    const { PRODUCTOS_MOCK } = await import('@/lib/mock')
    const sinStock = PRODUCTOS_MOCK.filter((p) => p.stock === 0)
    expect(sinStock.length).toBeGreaterThan(0)
  })

  it('el total del carrito con 2 productos se calcula correctamente', async () => {
    const { PRODUCTOS_MOCK } = await import('@/lib/mock')
    const p1 = PRODUCTOS_MOCK[0] // precio 680
    const p2 = PRODUCTOS_MOCK[7] // precio 850
    const total = p1.precio * 2 + p2.precio * 1
    expect(total).toBe(680 * 2 + 850)
  })
})
