import { describe, expect, it } from 'vitest'
import {
  fechaConfirmacionProveedor,
  proveedorPuedeConfirmarRecepcion,
  stockDisponible,
} from '@/lib/stock'

describe('stockDisponible', () => {
  it('resta lo reservado del stock físico', () => {
    expect(stockDisponible({ stock: 50, stock_reservado: 50 })).toBe(0)
    expect(stockDisponible({ stock: 50, stock_reservado: 20 })).toBe(30)
  })

  it('trata una reserva ausente como cero', () => {
    expect(stockDisponible({ stock: 10 })).toBe(10)
  })

  it('no devuelve un disponible negativo', () => {
    expect(stockDisponible({ stock: 5, stock_reservado: 8 })).toBe(0)
  })
})

describe('proveedorPuedeConfirmarRecepcion', () => {
  const despacho = new Date('2026-10-01T12:00:00.000Z')

  it('el cliente no espera, pero el proveedor sí: antes de 7 días no puede', () => {
    const casi = new Date(fechaConfirmacionProveedor(despacho).getTime() - 1)
    expect(proveedorPuedeConfirmarRecepcion(despacho, casi)).toBe(false)
  })

  it('a los 7 días exactos del despacho ya puede', () => {
    expect(proveedorPuedeConfirmarRecepcion(despacho, fechaConfirmacionProveedor(despacho))).toBe(true)
  })

  it('sin fecha de despacho no puede', () => {
    expect(proveedorPuedeConfirmarRecepcion(null)).toBe(false)
  })
})
