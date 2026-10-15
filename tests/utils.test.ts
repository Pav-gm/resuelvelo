import { describe, expect, it } from 'vitest'
import { formatearFecha, formatearPrecio } from '@/lib/utils'

describe('formateadores compartidos', () => {
  it('formatearPrecio muestra RD$ con agrupación y dos decimales', () => {
    expect(formatearPrecio(1234.5)).toBe('RD$ 1,234.50')
    expect(formatearPrecio(0)).toBe('RD$ 0.00')
  })

  it('formatearFecha usa la fecha y hora de Santo Domingo', () => {
    const valor = '2026-10-08T02:20:00.000Z'
    expect(formatearFecha(valor)).toBe('7 de octubre de 2026')
    expect(formatearFecha(valor, { conHora: true })).toBe('7 de octubre de 2026, 10:20 p. m.')
  })

  it('formatearFecha representa una fecha inválida con guion', () => {
    expect(formatearFecha('fecha-invalida')).toBe('—')
  })
})
