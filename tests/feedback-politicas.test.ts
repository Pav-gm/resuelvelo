/**
 * Contratos de esquema: elegibilidad, unicidad, lectura pública y recepción.
 * La base local no ejecuta Postgres; estas pruebas fijan el SQL que es la autoridad.
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const schema = readFileSync(path.join(process.cwd(), 'supabase/schema.sql'), 'utf8')
const accion = readFileSync(
  path.join(process.cwd(), 'app/(marketplace)/cotizaciones/actions.ts'),
  'utf8'
)
const formulario = readFileSync(
  path.join(process.cwd(), 'components/marketplace/FormularioFeedback.tsx'),
  'utf8'
)

function bloque(marca: string, fin: string): string {
  const inicio = schema.indexOf(marca)
  expect(inicio, marca).toBeGreaterThan(-1)
  const cierre = schema.indexOf(fin, inicio)
  expect(cierre, fin).toBeGreaterThan(inicio)
  return schema.slice(inicio, cierre)
}

const crearFeedback = bloque('function public.crear_feedback', '$$;')
const confirmar = bloque('function public.confirmar_recepcion', '$$;')
const despachar = bloque('function public.despachar_cotizacion', '$$;')
const vista = bloque('view public.feedback_publico', 'revoke all on public.feedback_publico')
const crearFeedbackTs = accion.slice(accion.indexOf('export async function crearFeedback'))

describe('C-ELIGIBILIDAD y C-CREACION en schema.sql', () => {
  it('guarda una reseña por cotización, con calificación 1–5 y comentario de hasta 1000', () => {
    expect(schema).toContain('create table if not exists public.feedback')
    expect(schema).toContain('constraint feedback_cotizacion_id_key unique (cotizacion_id)')
    expect(schema).toContain('calificacion   smallint not null check (calificacion between 1 and 5)')
    expect(schema).toContain('comentario     text check (comentario is null or char_length(comentario) <= 1000)')
    expect(schema).toContain('create index if not exists idx_feedback_proveedor_fecha')
    expect(schema).toContain('create index if not exists idx_feedback_comprador')
  })

  it('solo el comprador autenticado de una cotización recibida puede crear la reseña', () => {
    expect(crearFeedback).toContain("raise exception 'FEEDBACK_NO_AUTENTICADO'")
    expect(crearFeedback).toContain('if auth.uid() is null then')
    expect(crearFeedback).toContain("raise exception 'FEEDBACK_NO_ELEGIBLE'")
    expect(crearFeedback).toContain(
      "v_comprador_id is distinct from auth.uid() or v_estado is distinct from 'recibida'"
    )
    expect(crearFeedback).not.toMatch(/user_id = auth\.uid\(\)/)
    for (const estado of ['pendiente', 'respondida', 'aceptada', 'rechazada', 'despachada', 'cancelada']) {
      expect(crearFeedback).not.toContain(`'${estado}'`)
    }
  })

  it('deriva comprador y proveedor de la cotización y rechaza el duplicado', () => {
    expect(crearFeedback).not.toMatch(/p_comprador_id|p_proveedor_id/)
    expect(crearFeedback).toContain(
      'insert into public.feedback(cotizacion_id, comprador_id, proveedor_id, calificacion, comentario)'
    )
    expect(crearFeedback).toContain(
      'values (p_cotizacion_id, v_comprador_id, v_proveedor_id, p_calificacion, p_comentario)'
    )
    expect(crearFeedback).toContain("raise exception 'FEEDBACK_DUPLICADO'")
    expect(crearFeedback).toContain('when unique_violation then')
    expect(crearFeedback).toContain("raise exception 'FEEDBACK_VALIDACION'")
  })

  it('no ofrece políticas de escritura directa y limita la lectura de la tabla al comprador', () => {
    expect(schema).toContain('alter table public.feedback enable row level security;')
    expect(schema).toContain('create policy "feedback: comprador consulta la suya"')
    expect(schema).toContain('using (comprador_id = auth.uid())')
    expect(schema).not.toMatch(/on public\.feedback for insert/)
    expect(schema).not.toMatch(/on public\.feedback for update/)
    expect(schema).not.toMatch(/on public\.feedback for delete/)
    expect(schema).toContain('revoke all on public.feedback from anon, authenticated;')
    expect(schema).toContain('grant select on public.feedback to authenticated;')
    expect(schema).toContain(
      'revoke execute on function public.crear_feedback(uuid, integer, text) from public, anon;'
    )
    expect(schema).toContain(
      'grant execute on function public.crear_feedback(uuid, integer, text) to authenticated;'
    )
  })

  it('la acción de aplicación acepta solo cotizacionId, calificacion y comentario', () => {
    expect(crearFeedbackTs).toContain('cotizacionId: string')
    expect(crearFeedbackTs).toContain('calificacion: number')
    expect(crearFeedbackTs).toContain('comentario?: string')
    expect(crearFeedbackTs).not.toMatch(/comprador_id|proveedor_id/)
    expect(crearFeedbackTs).toContain("return { error: 'FEEDBACK_NO_AUTENTICADO' }")
    expect(crearFeedbackTs).toContain("return { error: 'FEEDBACK_VALIDACION' }")
    expect(crearFeedbackTs).toContain(
      'FEEDBACK_(?:DUPLICADO|NO_ELEGIBLE|VALIDACION|NO_AUTENTICADO)'
    )
  })

  it('los códigos estables del SQL están traducidos en el formulario', () => {
    for (const code of [
      'FEEDBACK_NO_AUTENTICADO',
      'FEEDBACK_NO_ELEGIBLE',
      'FEEDBACK_DUPLICADO',
      'FEEDBACK_VALIDACION',
    ]) {
      expect(crearFeedback).toContain(code)
      expect(crearFeedbackTs).toContain(code.replace("FEEDBACK_", "")) // la acción los reconoce con una regex
      expect(formulario).toContain(code)
    }
    expect(formulario).toContain('FEEDBACK_ERROR')
  })
})

describe('C-LECTURA — superficie pública', () => {
  it('la vista publica solo reseña y autor anonimizado', () => {
    expect(vista).toContain('security_barrier = true')
    expect(vista).toContain('id, proveedor_id, calificacion, comentario, created_at')
    expect(vista).toContain("'Comprador verificado'::text as autor_anonimo")
    expect(vista).not.toMatch(/comprador_id|email|telefono|correo/)
    expect(schema).toContain('grant select on public.feedback_publico to anon, authenticated;')
  })
})

describe('C-RECEPCION — el estado recibida solo sale del servidor', () => {
  it('no hay política para que el cliente actualice cotizaciones', () => {
    expect(schema).toContain('drop policy if exists "cotizaciones: proveedor actualiza estado"')
    expect(schema).not.toMatch(/create policy "cotizaciones: proveedor actualiza estado"/)
    expect(schema).not.toMatch(/on public\.cotizaciones for update/)
  })

  it('despachar avanza de aceptada a despachada y confirmar solo desde despachada', () => {
    expect(despachar).toContain("set estado = 'despachada'")
    expect(despachar).toContain("and c.estado = 'aceptada'")
    expect(despachar).not.toContain("'recibida'")
    expect(confirmar).toContain("v_estado is distinct from 'despachada'")
    expect(confirmar).toContain("set estado = 'recibida'")
    expect(confirmar).not.toMatch(/p_estado/)
    expect(schema).toMatch(
      /grant execute on function public\.confirmar_recepcion\(uuid\)\s+to authenticated;/
    )
    expect(schema).toMatch(
      /grant execute on function public\.despachar_cotizacion\(uuid\)\s+to authenticated;/
    )
  })
})
