import { describe, expect, it } from 'vitest'
import { stockDisponible } from '@/lib/stock'

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
