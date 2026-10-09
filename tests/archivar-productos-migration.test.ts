import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationDir = join(process.cwd(), 'supabase/migrations')
const rollbackDir = join(process.cwd(), 'supabase/rollbacks')

function findBySuffix(directory: string): string {
  const file = readdirSync(directory).find((entry) => entry.endsWith('_archivar_productos.sql'))
  if (!file) throw new Error(`No se encontró migración _archivar_productos.sql en ${directory}`)
  return readFileSync(join(directory, file), 'utf8')
}

describe('migración de archivado de productos', () => {
  it('la migración de archivado añade solo la columna nullable y no altera políticas', () => {
    const migration = findBySuffix(migrationDir)
    const schema = readFileSync(join(process.cwd(), 'supabase/schema.sql'), 'utf8')

    expect(migration).toMatch(/alter\s+table\s+public\.productos\s+add\s+column\s+archivado_at\s+timestamptz\s+null\s*;/i)
    expect(migration).not.toMatch(/create\s+policy|drop\s+policy|alter\s+policy/i)
    expect(migration.replace(/alter\s+table\s+public\.productos\s+add\s+column\s+archivado_at\s+timestamptz\s+null\s*;/i, '').trim()).toBe('')
    expect(schema).toMatch(/archivado_at\s+timestamptz/i)
  })

  it('el rollback de archivado solo quita la columna añadida', () => {
    const rollback = findBySuffix(rollbackDir)

    expect(rollback).toMatch(/alter\s+table\s+public\.productos\s+drop\s+column\s+archivado_at\s*;/i)
    expect(rollback.replace(/alter\s+table\s+public\.productos\s+drop\s+column\s+archivado_at\s*;/i, '').trim()).toBe('')
  })
})
