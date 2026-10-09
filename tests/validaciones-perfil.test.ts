import { describe, expect, it } from 'vitest'
import { esRncValido } from '@/lib/validaciones-perfil'

describe('esRncValido', () => {
  it('acepta RNC vacío y RNC de nueve u once dígitos', () => {
    expect(esRncValido('')).toBe(true)
    expect(esRncValido('123456789')).toBe(true)
    expect(esRncValido('12345678901')).toBe(true)
  })

  it('rechaza RNC con longitud o caracteres inválidos', () => {
    expect(esRncValido('12345678')).toBe(false)
    expect(esRncValido('1234567890')).toBe(false)
    expect(esRncValido('123456789012')).toBe(false)
    expect(esRncValido('12345A789')).toBe(false)
    expect(esRncValido('123 456789')).toBe(false)
  })
})
