import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const sufijo = '_decision_oferta_comprador.sql'
const migracionPath = join(process.cwd(), 'supabase/migrations', readdirSync(join(process.cwd(), 'supabase/migrations')).find((f) => f.endsWith(sufijo))!)
const rollbackPath = join(process.cwd(), 'supabase/rollbacks', readdirSync(join(process.cwd(), 'supabase/rollbacks')).find((f) => f.endsWith(sufijo))!)
const migracion = readFileSync(migracionPath, 'utf8')
const rollback = readFileSync(rollbackPath, 'utf8')

describe('migración de decisión de oferta del comprador', () => {
  it('la migración registra columnas y RPC de decisión del comprador y bloquea aceptación del proveedor', () => {
    expect(migracion).toMatch(/add column aceptada_at\s+timestamptz null/i)
    expect(migracion).toMatch(/add column rechazada_motivo\s+text null/i)
    expect(migracion).toMatch(/function public\.aceptar_oferta_cotizacion\(p_cotizacion_id uuid\)/i)
    expect(migracion).toMatch(/function public\.rechazar_oferta_cotizacion\(\s*p_cotizacion_id uuid,\s*p_motivo text/i)
    expect(migracion).toMatch(/function public\.solicitar_nueva_oferta\(\s*p_cotizacion_id uuid,\s*p_nota text/i)
    expect(migracion).toMatch(/c\.comprador_id = auth\.uid\(\)/i)
    expect(migracion).toMatch(/c\.estado = 'respondida'/i)
    expect(migracion).toMatch(/v_valida_hasta < current_date/i)
    expect(migracion).toMatch(/rechazada_motivo = btrim\(p_motivo\),\s*rechazada_at = now\(\)/i)
    expect(migracion).toMatch(/'aceptada_at', c\.aceptada_at/i)
    expect(migracion).toMatch(/'rechazada_motivo', c\.rechazada_motivo/i)
    for (const firma of [
      'aceptar_oferta_cotizacion(uuid)',
      'rechazar_oferta_cotizacion(uuid, text)',
      'solicitar_nueva_oferta(uuid, text)',
    ]) {
      const nombre = firma.replace(/[()]/g, '\\$&')
      expect(migracion).toMatch(new RegExp(`revoke execute on function public\\.${nombre} from public, anon`, 'i'))
      expect(migracion).toMatch(new RegExp(`grant execute on function public\\.${nombre} to authenticated`, 'i'))
    }
    expect(migracion).toMatch(/revoke execute on function public\.aceptar_cotizacion_con_cantidades\(uuid, jsonb\) from public, anon, authenticated/i)
    expect(migracion).toMatch(/revoke execute on function public\.aceptar_cotizacion\(uuid\) from public, anon, authenticated/i)
  })

  it('el rollback restaura las RPC heredadas y elimina las columnas y RPC añadidas', () => {
    expect(rollback).toMatch(/drop function if exists public\.aceptar_oferta_cotizacion\(uuid\)/i)
    expect(rollback).toMatch(/drop function if exists public\.rechazar_oferta_cotizacion\(uuid, text\)/i)
    expect(rollback).toMatch(/drop function if exists public\.solicitar_nueva_oferta\(uuid, text\)/i)
    expect(rollback).toMatch(/drop column if exists aceptada_at/i)
    expect(rollback).toMatch(/drop column if exists rechazada_motivo/i)
    expect(rollback).toMatch(/function public\.aceptar_cotizacion_con_cantidades\(/i)
    expect(rollback).toMatch(/function public\.aceptar_cotizacion\(p_cotizacion_id uuid\)/i)
    expect(rollback).toMatch(/grant execute on function public\.aceptar_cotizacion_con_cantidades\(uuid, jsonb\) to authenticated/i)
    expect(rollback).toMatch(/function public\.get_cotizacion_detalle\(p_cotizacion_id uuid\)/i)
    expect(rollback).not.toMatch(/'rechazada_motivo', c\.rechazada_motivo/i)
  })
})
