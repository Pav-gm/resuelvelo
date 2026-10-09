'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  actualizarDireccionObra,
  crearDireccionObra,
  eliminarDireccionObra,
  guardarPerfil,
} from '@/app/(marketplace)/perfil/actions'
import {
  esRncValido,
  esTelefonoDoValido,
  normalizarTelefonoDo,
} from '@/lib/validaciones-perfil'
import { PROVINCIAS_RD } from '@/lib/provincias'

type DireccionObra = {
  id: string
  etiqueta: string
  direccion: string
  provincia: string
  municipio: string | null
  referencia: string | null
  es_principal: boolean
}

type PerfilCompradorProps = {
  perfil: {
    nombre: string
    razon_social: string | null
    rnc: string | null
    telefono: string | null
  }
  direcciones: DireccionObra[]
  errorCargaDirecciones: string | null
}

type Mensaje = { tipo: 'exito' | 'error'; texto: string } | null

const ERROR_RNC = 'El RNC debe tener 9 u 11 dígitos numéricos.'
const ERROR_TELEFONO = 'El teléfono debe ser un número dominicano válido de 10 dígitos.'
const ERROR_CAMPOS_DIRECCION = 'La etiqueta, la dirección y la provincia son obligatorias.'

// Id del mensaje de teléfono, referenciado por el input con `aria-describedby`.
const ID_ERROR_TELEFONO = 'error-telefono'

function nuevoId(): string {
  return `tmp-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`
}

const claseInput =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500 disabled:opacity-60'
const claseBotonPrimario =
  'rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-60'

/** Aviso en línea reutilizable: éxito como `status`, error como `alert`. */
function Aviso({ mensaje }: { mensaje: Mensaje }) {
  if (!mensaje) return null
  return (
    <p
      role={mensaje.tipo === 'error' ? 'alert' : 'status'}
      className={`mt-2 text-sm ${mensaje.tipo === 'error' ? 'text-red-600' : 'text-green-700'}`}
    >
      {mensaje.texto}
    </p>
  )
}

/**
 * Perfil del comprador: datos de empresa y contacto, y direcciones de obra.
 * Cada sección guarda por su cuenta contra las Server Actions y, mientras la
 * acción está en curso, bloquea nuevos envíos.
 */
export default function PerfilComprador({
  perfil,
  direcciones,
  errorCargaDirecciones,
}: PerfilCompradorProps) {
  const [nombre, setNombre] = useState(perfil.nombre)
  const [razonSocial, setRazonSocial] = useState(perfil.razon_social ?? '')
  const [rnc, setRnc] = useState(perfil.rnc ?? '')
  const [telefono, setTelefono] = useState(perfil.telefono ?? '')
  const [guardandoPerfil, setGuardandoPerfil] = useState(false)
  const [mensajePerfil, setMensajePerfil] = useState<Mensaje>(null)
  const [errorTelefono, setErrorTelefono] = useState<string | null>(null)

  const [listaDirecciones, setListaDirecciones] = useState<DireccionObra[]>(direcciones)
  // Sincroniza la lista con las direcciones que entrega el servidor tras `revalidatePath('/perfil')`:
  // así los ids reales sustituyen a los temporales de las direcciones recién creadas.
  const [direccionesServidor, setDireccionesServidor] = useState(direcciones)
  if (direcciones !== direccionesServidor) {
    setDireccionesServidor(direcciones)
    setListaDirecciones(direcciones)
  }
  const [editandoId, setEditandoId] = useState<string | null>(null)
  const [etiqueta, setEtiqueta] = useState('')
  const [direccion, setDireccion] = useState('')
  const [provincia, setProvincia] = useState('')
  const [municipio, setMunicipio] = useState('')
  const [referencia, setReferencia] = useState('')
  const [esPrincipal, setEsPrincipal] = useState(false)
  const [guardandoDireccion, setGuardandoDireccion] = useState(false)
  const [mensajeDireccion, setMensajeDireccion] = useState<Mensaje>(null)

  async function handlePerfil(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (guardandoPerfil) return

    if (!esRncValido(rnc.trim())) {
      setMensajePerfil({ tipo: 'error', texto: ERROR_RNC })
      return
    }

    // El teléfono vacío sigue permitido; se valida y se normaliza antes de
    // enviarlo para que el servidor guarde solo los diez dígitos.
    const telefonoLimpio = telefono.trim()
    if (!esTelefonoDoValido(telefonoLimpio)) {
      setMensajePerfil(null)
      setErrorTelefono(ERROR_TELEFONO)
      return
    }

    setMensajePerfil(null)
    setErrorTelefono(null)
    setGuardandoPerfil(true)
    const resultado = await guardarPerfil({
      nombre,
      razon_social: razonSocial,
      rnc,
      telefono: normalizarTelefonoDo(telefonoLimpio),
    })
    setGuardandoPerfil(false)

    if (resultado.error) {
      // El mismo error de teléfono se muestra junto al campo; el resto, en `Aviso`.
      if (resultado.error === ERROR_TELEFONO) {
        setErrorTelefono(ERROR_TELEFONO)
        return
      }
      setMensajePerfil({ tipo: 'error', texto: resultado.error })
      return
    }
    setMensajePerfil({ tipo: 'exito', texto: 'Perfil actualizado.' })
  }

  function limpiarFormularioDireccion() {
    setEditandoId(null)
    setEtiqueta('')
    setDireccion('')
    setProvincia('')
    setMunicipio('')
    setReferencia('')
    setEsPrincipal(false)
  }

  function empezarEdicion(d: DireccionObra) {
    setEditandoId(d.id)
    setEtiqueta(d.etiqueta)
    setDireccion(d.direccion)
    setProvincia(d.provincia)
    setMunicipio(d.municipio ?? '')
    setReferencia(d.referencia ?? '')
    setEsPrincipal(d.es_principal)
    setMensajeDireccion(null)
  }

  async function handleDireccion(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (guardandoDireccion) return

    if (!etiqueta.trim() || !direccion.trim() || !provincia.trim()) {
      setMensajeDireccion({ tipo: 'error', texto: ERROR_CAMPOS_DIRECCION })
      return
    }

    setMensajeDireccion(null)
    setGuardandoDireccion(true)
    const datos = {
      etiqueta,
      direccion,
      provincia,
      municipio,
      referencia,
      es_principal: esPrincipal,
    }
    const idEnEdicion = editandoId
    const resultado = idEnEdicion
      ? await actualizarDireccionObra(idEnEdicion, datos)
      : await crearDireccionObra(datos)
    setGuardandoDireccion(false)

    if (resultado.error) {
      setMensajeDireccion({ tipo: 'error', texto: resultado.error })
      return
    }

    const direccionGuardada = {
      ...datos,
      municipio: municipio.trim() || null,
      referencia: referencia.trim() || null,
    }
    if (idEnEdicion) {
      setListaDirecciones((previas) =>
        previas.map((d) => (d.id === idEnEdicion ? { ...d, ...direccionGuardada } : d))
      )
      setMensajeDireccion({ tipo: 'exito', texto: 'Dirección actualizada.' })
    } else {
      setListaDirecciones((previas) => [{ id: nuevoId(), ...direccionGuardada }, ...previas])
      setMensajeDireccion({ tipo: 'exito', texto: 'Dirección añadida.' })
    }
    limpiarFormularioDireccion()
  }

  async function quitarDireccion(id: string) {
    if (guardandoDireccion) return
    setMensajeDireccion(null)
    setGuardandoDireccion(true)
    const resultado = await eliminarDireccionObra(id)
    setGuardandoDireccion(false)

    if (resultado.error) {
      setMensajeDireccion({ tipo: 'error', texto: resultado.error })
      return
    }
    setListaDirecciones((previas) => previas.filter((d) => d.id !== id))
    setMensajeDireccion({ tipo: 'exito', texto: 'Dirección eliminada.' })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <h1 className="mb-2 text-2xl font-bold text-gray-900">Mi perfil</h1>
      <p className="mb-6 text-sm text-gray-500">
        Tus datos de empresa y contacto y las direcciones de tus obras. ¿Necesitas ayuda?{' '}
        <Link href="/contacto" className="font-medium text-orange-500 hover:underline">
          Contacto
        </Link>
      </p>

      <section className="rounded-2xl border bg-white p-6 shadow-sm" aria-labelledby="datos-perfil">
        <h2 id="datos-perfil" className="mb-4 text-lg font-semibold text-gray-900">
          Datos de la empresa
        </h2>
        <form onSubmit={handlePerfil} className="flex flex-col gap-4" aria-label="Datos del perfil">
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Nombre
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              disabled={guardandoPerfil}
              className={claseInput}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Razón social
            <input
              type="text"
              value={razonSocial}
              onChange={(e) => setRazonSocial(e.target.value)}
              disabled={guardandoPerfil}
              className={claseInput}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            RNC
            <input
              type="text"
              inputMode="numeric"
              value={rnc}
              onChange={(e) => setRnc(e.target.value)}
              disabled={guardandoPerfil}
              className={claseInput}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Teléfono
            <input
              type="tel"
              value={telefono}
              onChange={(e) => {
                setTelefono(e.target.value)
                setErrorTelefono(null)
              }}
              disabled={guardandoPerfil}
              aria-describedby={errorTelefono ? ID_ERROR_TELEFONO : undefined}
              className={claseInput}
            />
          </label>
          {errorTelefono && (
            <p id={ID_ERROR_TELEFONO} role="alert" className="text-sm text-red-600">
              {errorTelefono}
            </p>
          )}

          <Aviso mensaje={mensajePerfil} />

          <button type="submit" disabled={guardandoPerfil} className={claseBotonPrimario}>
            {guardandoPerfil ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </form>
      </section>

      <section className="mt-6 rounded-2xl border bg-white p-6 shadow-sm" aria-labelledby="direcciones-obra">
        <h2 id="direcciones-obra" className="mb-4 text-lg font-semibold text-gray-900">
          Direcciones de obra
        </h2>

        {errorCargaDirecciones && (
          <p role="alert" className="mb-4 text-sm text-red-600">
            {errorCargaDirecciones}
          </p>
        )}

        {listaDirecciones.length === 0 ? (
          <p className="text-sm text-gray-400">Aún no has registrado direcciones de obra.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {listaDirecciones.map((d) => (
              <li key={d.id} className="rounded-xl border p-4">
                <p className="font-medium text-gray-900">
                  {d.etiqueta}
                  {d.es_principal && (
                    <span className="ml-2 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
                      Principal
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm text-gray-700">{d.direccion}</p>
                <p className="text-sm text-gray-500">
                  {[d.municipio, d.provincia].filter(Boolean).join(', ')}
                </p>
                {d.referencia && <p className="text-sm text-gray-500">Referencia: {d.referencia}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => empezarEdicion(d)}
                    disabled={guardandoDireccion || d.id.startsWith('tmp-')}
                    aria-label={`Editar ${d.etiqueta}`}
                    className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    Editar
                  </button>
                  <button
                    type="button"
                    onClick={() => quitarDireccion(d.id)}
                    disabled={guardandoDireccion || d.id.startsWith('tmp-')}
                    aria-label={`Quitar ${d.etiqueta}`}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                  >
                    Quitar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form
          onSubmit={handleDireccion}
          className="mt-6 flex flex-col gap-4 border-t pt-6"
          aria-label={editandoId ? 'Editar dirección de obra' : 'Añadir dirección de obra'}
        >
          <h3 className="text-base font-semibold text-gray-900">
            {editandoId ? 'Editar dirección' : 'Añadir dirección'}
          </h3>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Etiqueta
            <input
              type="text"
              value={etiqueta}
              onChange={(e) => setEtiqueta(e.target.value)}
              disabled={guardandoDireccion}
              className={claseInput}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Dirección
            <input
              type="text"
              value={direccion}
              onChange={(e) => setDireccion(e.target.value)}
              disabled={guardandoDireccion}
              className={claseInput}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Provincia
            <select
              value={provincia}
              onChange={(e) => setProvincia(e.target.value)}
              disabled={guardandoDireccion}
              className={claseInput}
            >
              <option value="">Selecciona una provincia</option>
              {PROVINCIAS_RD.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Municipio
            <input
              type="text"
              value={municipio}
              onChange={(e) => setMunicipio(e.target.value)}
              disabled={guardandoDireccion}
              className={claseInput}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium text-gray-700">
            Referencia
            <input
              type="text"
              value={referencia}
              onChange={(e) => setReferencia(e.target.value)}
              disabled={guardandoDireccion}
              className={claseInput}
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              checked={esPrincipal}
              onChange={(e) => setEsPrincipal(e.target.checked)}
              disabled={guardandoDireccion}
              className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            Dirección principal
          </label>

          <Aviso mensaje={mensajeDireccion} />

          <div className="flex flex-wrap gap-2">
            <button type="submit" disabled={guardandoDireccion} className={claseBotonPrimario}>
              {guardandoDireccion
                ? 'Guardando…'
                : editandoId
                  ? 'Guardar dirección'
                  : 'Añadir dirección'}
            </button>
            {editandoId && (
              <button
                type="button"
                onClick={limpiarFormularioDireccion}
                disabled={guardandoDireccion}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      </section>
    </div>
  )
}
