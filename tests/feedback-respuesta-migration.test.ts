import { readFileSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const migracionesNombre = readdirSync(path.join(process.cwd(), 'supabase/migrations'))
  .filter((archivo) => archivo.endsWith('_respuesta_feedback_proveedor.sql'))
const rollbacksNombre = readdirSync(path.join(process.cwd(), 'supabase/rollbacks'))
  .filter((archivo) => archivo.endsWith('_respuesta_feedback_proveedor.sql'))
const migracionNombre = migracionesNombre[0]
const rollbackNombre = rollbacksNombre[0]
if (!migracionNombre || !rollbackNombre) throw new Error('Falta la migración o su rollback de respuesta de feedback.')

const migracion = readFileSync(path.join(process.cwd(), 'supabase/migrations', migracionNombre), 'utf8')
const rollback = readFileSync(path.join(process.cwd(), 'supabase/rollbacks', rollbackNombre), 'utf8')

describe('migración de respuesta del proveedor', () => {
  it('la migración añade respuesta nullable y restringe la actualización al proveedor propietario', () => {
    expect(migracionesNombre.filter((archivo) => archivo.endsWith('_respuesta_feedback_proveedor.sql'))).toHaveLength(1)
    expect(rollbacksNombre.filter((archivo) => archivo.endsWith('_respuesta_feedback_proveedor.sql'))).toHaveLength(1)
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

    const bloqueVista = migracion.slice(migracion.indexOf('create or replace view public.feedback_publico'))
    expect(bloqueVista).toContain('create or replace view public.feedback_publico')
    expect(bloqueVista).toContain('security_invoker = true')
    expect(bloqueVista).toContain('security_barrier = true')
    expect(bloqueVista).toMatch(/'Comprador verificado'::text as autor_anonimo,\s*respuesta, respuesta_at/)
    expect(bloqueVista).not.toMatch(/comprador_id|email|telefono|correo/i)
  })

  it('el rollback revierte solo las columnas, permisos y política añadidos', () => {
    expect(rollback).toContain('drop policy if exists "feedback: proveedor responde una vez" on public.feedback;')
    expect(rollback).toContain('revoke select (respuesta, respuesta_at) on public.feedback from anon, authenticated;')
    expect(rollback).toContain('revoke update (respuesta, respuesta_at) on public.feedback from authenticated;')
    expect(rollback).toContain('drop column respuesta')
    expect(rollback).toContain('drop column respuesta_at')
    expect(rollback).not.toMatch(/^\s*(delete|truncate|insert|update)\b/im)
    expect(rollback).toContain('drop view public.feedback_publico;')
    expect(rollback).toContain('create view public.feedback_publico')
    expect(rollback).toContain('with (security_invoker = true, security_barrier = true)')
    expect(rollback).toContain('grant select on public.feedback_publico to anon, authenticated;')
    expect(rollback.indexOf('create view public.feedback_publico')).toBeLessThan(
      rollback.indexOf('drop column respuesta')
    )
  })
})
