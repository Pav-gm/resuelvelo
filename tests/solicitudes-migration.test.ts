import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('migración de solicitudes multi proveedor', () => {
  it('la migración de solicitudes incluye su rollback e invariante de líneas', () => {
    const migracionesDir = path.join(process.cwd(), 'supabase/migrations')
    const rollbacksDir = path.join(process.cwd(), 'supabase/rollbacks')
    const sufijo = '_solicitudes_multiproveedor.sql'
    const nombreMigracion = readdirSync(migracionesDir).find((archivo) => archivo.endsWith(sufijo))
    const nombreRollback = readdirSync(rollbacksDir).find((archivo) => archivo.endsWith(sufijo))

    expect(nombreMigracion).toBeTruthy()
    expect(nombreRollback).toBe(nombreMigracion)
    const migracion = readFileSync(path.join(migracionesDir, nombreMigracion!), 'utf8')
    const rollback = readFileSync(path.join(rollbacksDir, nombreRollback!), 'utf8')
    const check = readFileSync(path.join(process.cwd(), 'supabase/checks/solicitudes_multiproveedor.sql'), 'utf8')

    expect(migracion).toMatch(/create table public\.solicitudes/i)
    expect(migracion).toMatch(/create policy[\s\S]*solicitudes: comprador ve las suyas/i)
    expect(migracion).toMatch(/solicitud_id uuid null references public\.solicitudes/i)
    expect(migracion).toMatch(/add column descripcion text null/i)
    expect(migracion).toMatch(/add column unidad text null/i)
    expect(migracion).toMatch(/alter column producto_id drop not null/i)
    expect(migracion).toMatch(/producto_id is not null or nullif\(btrim\(descripcion\), ''\) is not null/i)
    expect(migracion).toContain('crear_solicitud_a_proveedores')
    expect(migracion).toContain('aceptar_oferta_de_solicitud')
    expect(check).toContain('producto_id is null')
    expect(check).toContain('c.comprador_id <> s.comprador_id')
    expect(rollback).toContain('drop table public.solicitudes')
  })
})
