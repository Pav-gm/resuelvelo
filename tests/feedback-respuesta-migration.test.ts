import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const migracionNombre = readdirSync(path.join(process.cwd(), 'supabase/migrations'))
  .find((archivo) => archivo.endsWith('_respuesta_feedback_proveedor.sql'))
const rollbackNombre = readdirSync(path.join(process.cwd(), 'supabase/rollbacks'))
  .find((archivo) => archivo.endsWith('_respuesta_feedback_proveedor.sql'))
if (!migracionNombre || !rollbackNombre) throw new Error('Falta la migración o su rollback de respuesta de feedback.')

const migracion = readFileSync(path.join(process.cwd(), 'supabase/migrations', migracionNombre), 'utf8')
const rollback = readFileSync(path.join(process.cwd(), 'supabase/rollbacks', rollbackNombre), 'utf8')

describe('migración de respuesta del proveedor', () => {
  it('la migración añade respuesta nullable y restringe la actualización al proveedor propietario', () => {
    expect(migracion).toMatch(/add column respuesta text null/i)
    expect(migracion).toMatch(/add column respuesta_at timestamptz null/i)
    expect(migracion).toContain('grant select (respuesta, respuesta_at) on public.feedback to anon, authenticated;')
    expect(migracion).toContain('grant update (respuesta, respuesta_at) on public.feedback to authenticated;')
    expect(migracion).toContain('create policy "feedback: proveedor responde una vez"')
    expect(migracion).toContain('on public.feedback for update to authenticated')
    expect(migracion).toContain('respuesta is null')
    expect(migracion.match(/p\.user_id = auth\.uid\(\)/g)).toHaveLength(2)
    expect(migracion).toContain('p.id = feedback.proveedor_id')
    expect(migracion).not.toMatch(/grant update on public\.feedback\s+to authenticated/i)
  })

  it('el rollback revierte solo las columnas, permisos y política añadidos', () => {
    expect(rollback).toContain('drop policy if exists "feedback: proveedor responde una vez" on public.feedback;')
    expect(rollback).toContain('revoke select (respuesta, respuesta_at) on public.feedback from anon, authenticated;')
    expect(rollback).toContain('revoke update (respuesta, respuesta_at) on public.feedback from authenticated;')
    expect(rollback).toContain('drop column respuesta')
    expect(rollback).toContain('drop column respuesta_at')
    expect(rollback).not.toMatch(/^\s*(delete|truncate|insert|update)\b/im)
  })
})
