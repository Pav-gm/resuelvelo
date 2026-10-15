import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const migrationsDir = join(process.cwd(), 'supabase/migrations')
const rollbacksDir = join(process.cwd(), 'supabase/rollbacks')
const migrationFile = readdirSync(migrationsDir).find((file) => file.endsWith('_verificacion_proveedores.sql'))
const rollbackFile = readdirSync(rollbacksDir).find((file) => file.endsWith('_verificacion_proveedores.sql'))
const migration = migrationFile ? readFileSync(join(migrationsDir, migrationFile), 'utf8') : ''
const rollback = rollbackFile ? readFileSync(join(rollbacksDir, rollbackFile), 'utf8') : ''

describe('migración de verificación de proveedores', () => {
  it('la migración agrega columnas, migra los proveedores verificados y mantiene el booleano sincronizado', () => {
    expect(migrationFile).toBeDefined()
    for (const column of ['verificacion_estado', 'verificacion_nota', 'verificacion_solicitada_at', 'verificado_at']) {
      expect(migration).toContain(column)
    }
    for (const state of ['sin_solicitar', 'pendiente', 'verificado', 'rechazado']) expect(migration).toContain(state)
    expect(migration).toMatch(/update\s+public\.proveedores[\s\S]*?set\s+verificacion_estado\s*=\s*'verificado'[\s\S]*?verificado_at\s*=\s*now\(\)[\s\S]*?where\s+verificado\s*=\s*true/i)
    expect(migration).toMatch(/new\.verificado\s*:=\s*\(new\.verificacion_estado\s*=\s*'verificado'\)/i)
    expect(migration).toContain('create trigger sincronizar_verificacion_proveedor')
    expect(migration).toContain('verificacion_estado not in')
  })

  it('un proveedor no puede aprobarse a sí mismo y solo un admin puede actualizar los campos de verificación', () => {
    expect(migration).toContain('using (public.is_admin())')
    expect(migration).toContain('with check (public.is_admin())')
    expect(migration).toMatch(/elsif not v_admin and not v_solicitud_rpc[\s\S]*?raise exception 'Solo un administrador puede modificar los campos de verificación\.'/i)
    expect(migration).toMatch(/function public\.solicitar_verificacion_proveedor\(\)[\s\S]*?security definer/i)
    expect(migration).toContain('auth.uid()')
    expect(migration).toContain('where user_id = v_usuario')
    expect(migration).toContain("nullif(btrim(v_proveedor.rnc), '') is null or nullif(btrim(v_proveedor.telefono), '') is null")
    expect(migration).toContain("v_proveedor.verificacion_estado not in ('sin_solicitar', 'rechazado')")
    expect(migration).toContain("set verificacion_estado = 'pendiente'")
    expect(migration).toContain('revoke all on function public.solicitar_verificacion_proveedor() from public')
    expect(migration).toContain('grant execute on function public.solicitar_verificacion_proveedor() to authenticated')
  })

  it('el rollback elimina los objetos añadidos sin borrar proveedores', () => {
    expect(rollbackFile).toBeDefined()
    expect(rollback).toContain('drop policy')
    expect(rollback).toContain('drop trigger')
    expect(rollback).toContain('drop function if exists public.solicitar_verificacion_proveedor()')
    expect(rollback).toContain('drop function if exists public.sincronizar_verificacion_proveedor()')
    for (const column of ['verificado_at', 'verificacion_solicitada_at', 'verificacion_nota', 'verificacion_estado']) {
      expect(rollback).toContain(`drop column if exists ${column}`)
    }
    expect(rollback).not.toMatch(/delete\s+from\s+public\.proveedores|truncate\s+(?:table\s+)?public\.proveedores|delete\s+from\s+proveedores/i)
  })
})
