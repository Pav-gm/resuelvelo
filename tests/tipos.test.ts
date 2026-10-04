/**
 * Tests de tipos del dominio
 * Validan que los tipos TypeScript cubren los valores esperados.
 */
import { describe, it, expect } from 'vitest'
import type { ActorVenta, Cotizacion, EstadoCotizacion, UserRole } from '@/types'

describe('UserRole', () => {
  it('acepta los tres roles válidos', () => {
    const roles: UserRole[] = ['comprador', 'proveedor', 'admin']
    expect(roles).toHaveLength(3)
    expect(roles).toContain('comprador')
    expect(roles).toContain('proveedor')
    expect(roles).toContain('admin')
  })
})

const ESTADOS_COTIZACION = [
  'pendiente',
  'respondida',
  'aceptada',
  'rechazada',
  'despachada',
  'recibida',
  'cancelada',
] as const satisfies readonly EstadoCotizacion[]

type EstadoSinCubrir = Exclude<EstadoCotizacion, (typeof ESTADOS_COTIZACION)[number]>
const estadosCompletos: [EstadoSinCubrir] extends [never] ? true : EstadoSinCubrir = true

const ACTORES_VENTA = ['comprador', 'proveedor'] as const satisfies readonly ActorVenta[]
type ActorSinCubrir = Exclude<ActorVenta, (typeof ACTORES_VENTA)[number]>
const actoresCompletos: [ActorSinCubrir] extends [never] ? true : ActorSinCubrir = true

describe('Estado de cotización', () => {
  it('cubre el flujo hasta despacho, recepción y cancelación', () => {
    const estados: Cotizacion['estado'][] = [...ESTADOS_COTIZACION]
    expect(estadosCompletos).toBe(true)
    expect(estados).toEqual([
      'pendiente',
      'respondida',
      'aceptada',
      'rechazada',
      'despachada',
      'recibida',
      'cancelada',
    ])
  })
})

describe('Campos de seguimiento', () => {
  it('acepta despachada_at, cancelada_por y recibida_por con los actores acordados', () => {
    expect(actoresCompletos).toBe(true)

    const cotizacion: Cotizacion = {
      id: 'cot-1',
      comprador_id: 'comprador-1',
      proveedor_id: 'prov-1',
      estado: 'recibida',
      created_at: '2026-04-01T12:00:00.000Z',
      despachada_at: '2026-04-02T15:04:00.000Z',
      cancelada_por: 'proveedor',
      recibida_por: 'comprador',
    }

    expect(cotizacion.despachada_at).toBe('2026-04-02T15:04:00.000Z')
    expect(cotizacion.cancelada_por).toBe('proveedor')
    expect(cotizacion.recibida_por).toBe('comprador')
    expect(ACTORES_VENTA).toEqual(['comprador', 'proveedor'])
  })

  it('permite null u omisión cuando la lectura no trae datos de seguimiento', () => {
    const sinDatos: Cotizacion = {
      id: 'cot-2',
      comprador_id: 'comprador-1',
      proveedor_id: 'prov-1',
      estado: 'pendiente',
      created_at: '2026-04-01T12:00:00.000Z',
    }
    const conNulos: Cotizacion = {
      ...sinDatos,
      id: 'cot-3',
      estado: 'aceptada',
      despachada_at: null,
      cancelada_por: null,
      recibida_por: null,
    }

    expect(sinDatos.despachada_at).toBeUndefined()
    expect(sinDatos.cancelada_por).toBeUndefined()
    expect(sinDatos.recibida_por).toBeUndefined()
    expect(conNulos.despachada_at).toBeNull()
    expect(conNulos.cancelada_por).toBeNull()
    expect(conNulos.recibida_por).toBeNull()
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
