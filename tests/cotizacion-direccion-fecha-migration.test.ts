import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationDir = join(process.cwd(), 'supabase/migrations')
const rollbackDir = join(process.cwd(), 'supabase/rollbacks')
const suffix = '_cotizacion_direccion_fecha_requerida.sql'

function findBySuffix(directory: string): string {
  const file = readdirSync(directory).find((entry) => entry.endsWith(suffix))
  if (!file) throw new Error(`No se encontró ${suffix} en ${directory}`)
  return readFileSync(join(directory, file), 'utf8')
}

describe('migración de dirección y fecha de cotización', () => {
  it('la migración de dirección y fecha amplía cotizaciones y el detalle', () => {
    const migration = findBySuffix(migrationDir)
    const rollback = findBySuffix(rollbackDir)

    expect(migration).toMatch(/direccion_obra_id\s+uuid\s+null\s+references\s+public\.direcciones_obra\s*\(id\)/i)
    expect(migration).toMatch(/fecha_requerida\s+date\s+null/i)
    expect(migration).toMatch(/'fecha_requerida',\s*c\.fecha_requerida/i)
    expect(migration).toMatch(/'direccion_obra',\s*\(/i)
    expect(migration).toMatch(/'id',\s*direccion\.id/i)
    expect(migration).toMatch(/'provincia',\s*direccion\.provincia/i)
    expect(migration).toMatch(/'municipio',\s*direccion\.municipio/i)
    expect(migration).toMatch(/'referencia',\s*direccion\.referencia/i)
    expect(rollback).toMatch(/drop column direccion_obra_id/i)
    expect(rollback).toMatch(/drop column fecha_requerida/i)
    expect(rollback).not.toMatch(/'fecha_requerida',\s*c\.fecha_requerida/i)
    expect(rollback).not.toMatch(/'direccion_obra',\s*\(/i)
  })
})
