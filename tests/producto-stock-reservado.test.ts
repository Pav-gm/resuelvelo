import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('stock reservado', () => {
  it('la migración informa cuántas unidades reservadas bloquearon el stock', () => {
    const migracion = readFileSync(
      join(process.cwd(), 'supabase/migrations/20261010000203_stock_reservado_error_detallado.sql'),
      'utf8'
    )

    expect(migracion).toContain(
      'Hay % unidades reservadas en cotizaciones aceptadas; el stock no puede ser menor que %.'
    )
    expect(migracion).toContain('NEW.stock < NEW.stock_reservado')
  })
})
