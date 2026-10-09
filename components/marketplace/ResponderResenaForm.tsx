'use client'

import { useState } from 'react'
import { responderFeedbackProveedor } from '@/app/(marketplace)/proveedor/actions'

// Traducción al español de los códigos estables del contrato de respuesta.
const ERRORES: Record<string, string> = {
  FEEDBACK_RESPUESTA_VALIDACION: 'La respuesta debe tener entre 1 y 1000 caracteres.',
  FEEDBACK_NO_DISPONIBLE: 'Esta reseña ya fue respondida o no está disponible.',
  FEEDBACK_RESPUESTA_ERROR: 'No se pudo publicar la respuesta. Intenta de nuevo.',
}

function mensajeDeError(code: string): string {
  return ERRORES[code] ?? ERRORES.FEEDBACK_RESPUESTA_ERROR
}

export default function ResponderResenaForm({ feedbackId }: { feedbackId: string }) {
  const [texto, setTexto] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)
  const [publicada, setPublicada] = useState(false)

  // El formulario sigue disponible tras el éxito; el mensaje «Respuesta
  // publicada.» permanece visible (sin temporizador) hasta que el proveedor
  // edite el texto o vuelva a enviar.
  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (enviando) return

    const textoLimpio = texto.trim()
    if (!textoLimpio) {
      setError('Escribe una respuesta antes de publicarla.')
      return
    }

    setError(null)
    // Un nuevo envío borra el estado anterior antes de llamar a la acción.
    setPublicada(false)
    setEnviando(true)

    const resultado = await responderFeedbackProveedor(feedbackId, textoLimpio)

    setEnviando(false)

    if ('error' in resultado) {
      setError(mensajeDeError(resultado.error))
      return
    }

    setPublicada(true)
  }

  return (
    <>
      <form onSubmit={handleSubmit} aria-label="Responder reseña" className="flex flex-col">
        <label
          htmlFor={`respuesta-${feedbackId}`}
          className="text-xs font-medium text-gray-600"
        >
          Respuesta
        </label>
        <textarea
          id={`respuesta-${feedbackId}`}
          value={texto}
          onChange={(e) => {
            setTexto(e.target.value)
            // Al editar, se oculta el estado y se permite un nuevo envío.
            setPublicada(false)
          }}
          maxLength={1000}
          rows={3}
          disabled={enviando}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60"
        />

        {error && (
          <p className="mt-2 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={enviando || !texto.trim()}
          className="mt-2 w-fit rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {enviando ? 'Publicando…' : 'Publicar respuesta'}
        </button>
      </form>

      {publicada && (
        <p className="mt-2 text-sm font-medium text-teal-700" role="status" aria-live="polite">
          Respuesta publicada.
        </p>
      )}
    </>
  )
}
