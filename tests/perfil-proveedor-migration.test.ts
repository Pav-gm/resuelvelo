import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const suffix = '_perfil_proveedor_editable.sql'
const migrationName = readdirSync(join(process.cwd(), 'supabase/migrations')).find((file) => file.endsWith(suffix))
const rollbackName = readdirSync(join(process.cwd(), 'supabase/rollbacks')).find((file) => file.endsWith(suffix))
if (!migrationName || !rollbackName) throw new Error('No se encontró la migración o rollback del perfil editable.')
const migration = readFileSync(join(process.cwd(), 'supabase/migrations', migrationName), 'utf8')
const rollback = readFileSync(join(process.cwd(), 'supabase/rollbacks', rollbackName), 'utf8')

describe('migración del perfil editable del proveedor', () => {
  it('la migración crea perfil editable, zonas y políticas del bucket logos', () => {
    for (const column of ['rnc', 'telefono', 'whatsapp', 'horario', 'sitio_web']) {
      expect(migration).toMatch(new RegExp(`add column ${column} text null`, 'i'))
    }
    expect(migration).toMatch(/create table public\.proveedor_zonas/i)
    expect(migration).toMatch(/primary key\s*\(proveedor_id, provincia\)/i)
    expect(migration).toMatch(/alter table public\.proveedor_zonas enable row level security/i)
    expect(migration).toMatch(/proveedor_zonas: lectura pública/i)
    expect(migration).toMatch(/proveedor_zonas: proveedor inserta las suyas/i)
    expect(migration).toMatch(/proveedor_zonas: proveedor actualiza las suyas/i)
    expect(migration).toMatch(/proveedor_zonas: proveedor elimina las suyas/i)
    expect(migration).toMatch(/values\s*\('logos', 'logos', true\)/i)
    expect(migration).toMatch(/logos storage: lectura pública/i)
    expect(migration).toMatch(/logos storage: proveedor inserta en su carpeta/i)
    expect(migration).toMatch(/logos storage: proveedor elimina de su carpeta/i)
    expect(migration).toMatch(/storage\.foldername\(name\)\)\[1\]/i)
    expect(migration).toMatch(/user_id = auth\.uid\(\)/i)
  })

  it('el rollback preserva objetos almacenados en logos', () => {
    expect(rollback).not.toMatch(/delete\s+from\s+storage\.objects/i)
    expect(rollback).toMatch(/delete\s+from\s+storage\.buckets[\s\S]*not exists\s*\([\s\S]*storage\.objects[\s\S]*bucket_id = 'logos'/i)
    expect(rollback).toMatch(/drop table if exists public\.proveedor_zonas/i)
    for (const column of ['sitio_web', 'horario', 'whatsapp', 'telefono', 'rnc']) {
      expect(rollback).toMatch(new RegExp(`drop column if exists ${column}`, 'i'))
    }
  })
})
