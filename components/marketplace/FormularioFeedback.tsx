'use client'

import { useState } from 'react'
import { crearFeedback } from '@/app/(marketplace)/cotizaciones/actions'
import type { Feedback } from '@/types'

// Traducción al español de los códigos estables del contrato C-CREACION.
const ERRORES: Record<string, string> = {
  FEEDBACK_NO_AUTENTICADO: 'Debes iniciar sesión para dejar tu reseña.',
  FEEDBACK_NO_ELEGIBLE: 'Solo puedes reseñar cotizaciones que confirmaste como recibidas.',
  FEEDBACK_DUPLICADO: 'Esta cotización ya tiene una reseña guardada.',
  FEEDBACK_VALIDACION:
    'Revisa tu reseña: la calificación debe ser de 1 a 5 y el comentario no puede superar los 1000 caracteres.',
  FEEDBACK_ERROR: 'No se pudo guardar tu reseña. Intenta de nuevo.',
}

function mensajeDeError(code: string): string {
  return ERRORES[code] ?? ERRORES.FEEDBACK_ERROR
}

function Estrellas({
  valor,
  onSeleccionar,
  disabled,
}: {
  valor: number
  onSeleccionar: (valor: number) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-1" role="radiogroup" aria-label="Calificación">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={valor === n}
          aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}`}
          disabled={disabled}
          onClick={() => onSeleccionar(n)}
          className={`text-2xl leading-none transition-colors ${
            disabled ? 'cursor-default' : 'cursor-pointer'
          } ${n <= valor ? 'text-yellow-400' : 'text-gray-300'}`}
        >
          ★
        </button>
      ))}
    </div>
  )
}

export default function FormularioFeedback({
  cotizacionId,
  feedback,
}: {
  cotizacionId: string
  feedback: Feedback | null
}) {
  const [calificacion, setCalificacion] = useState(0)
  const [comentario, setComentario] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [guardada, setGuardada] = useState<Feedback | null>(null)

  // La reseña guardada en servidor (o recién creada en esta sesión) reemplaza
  // al formulario y bloquea un segundo envío.
  const resenaGuardada = feedback ?? guardada

  if (resenaGuardada) {
    return <ResenaGuardada feedback={resenaGuardada} />
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (enviando) return

    if (calificacion < 1 || calificacion > 5) {
      setError('Selecciona una calificación de 1 a 5 estrellas.')
      return
    }

    setError(null)
    setEnviando(true)

    const resultado = await crearFeedback({
      cotizacionId,
      calificacion,
      comentario: comentario.trim() ? comentario.trim() : undefined,
    })

    setEnviando(false)

    if ('error' in resultado) {
      setError(mensajeDeError(resultado.error))
      return
    }

    setGuardada({
      id: resultado.data.id,
      cotizacion_id: cotizacionId,
      proveedor_id: '',
      calificacion,
      comentario: comentario.trim() || null,
      created_at: new Date().toISOString(),
      autor_anonimo: 'Tú',
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border-t bg-gray-50 px-6 py-4"
      aria-label="Dejar reseña del proveedor"
    >
      <p className="text-sm font-medium text-gray-900">¿Cómo fue tu experiencia?</p>
      <p className="mt-0.5 text-xs text-gray-500">
        Califica esta cotización recibida; tu reseña es anónima para otros compradores.
      </p>

      <div className="mt-3">
        <Estrellas valor={calificacion} onSeleccionar={setCalificacion} disabled={enviando} />
      </div>

      <textarea
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        maxLength={1000}
        rows={3}
        placeholder="Comentario opcional (hasta 1000 caracteres)…"
        disabled={enviando}
        className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60"
      />

      {error && (
        <p className="mt-2 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando || calificacion < 1}
        className="mt-3 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {enviando ? 'Guardando…' : 'Enviar reseña'}
      </button>
    </form>
  )
}

function ResenaGuardada({ feedback }: { feedback: Feedback }) {
  const fecha = new Date(feedback.created_at).toLocaleDateString('es-DO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className="border-t bg-teal-50 px-6 py-4" aria-label="Reseña guardada">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-teal-800">Tu reseña</span>
        <span className="text-yellow-400" aria-hidden="true">
          {'★'.repeat(feedback.calificacion)}
          <span className="text-gray-300">{'★'.repeat(5 - feedback.calificacion)}</span>
        </span>
        <span className="sr-only">{`${feedback.calificacion} de 5 estrellas`}</span>
      </div>
      {feedback.comentario && (
        <p className="mt-1 text-sm text-gray-700">{feedback.comentario}</p>
      )}
      <p className="mt-1 text-xs text-gray-500">Guardada el {fecha}</p>
    </div>
  )
}