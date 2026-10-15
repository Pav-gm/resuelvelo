'use client'

import Link from 'next/link'
import { useActionState, useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { guardarPerfilProveedor } from '@/app/(marketplace)/proveedor/actions'
import { createClient } from '@/lib/supabase/client'
import { PROVINCIAS } from '@/lib/provincias'
import type { PerfilProveedor, PerfilProveedorActionResult } from '@/types'

interface PerfilProveedorFormProps {
  perfil: PerfilProveedor
}

const MIMES_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp']
const EXTENSIONES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}
const TAMANIO_MAXIMO = 2 * 1024 * 1024
const LADO_MAXIMO = 1200

function validarImagen(archivo: File): string | null {
  if (!MIMES_PERMITIDOS.includes(archivo.type)) return 'El formato debe ser JPG, PNG o WebP.'
  if (archivo.size > TAMANIO_MAXIMO) return 'La imagen no puede superar 2 MB.'
  return null
}

// Decodifica la imagen, escala su lado mayor a LADO_MAXIMO conservando la
// proporción y la vuelve a codificar en su MIME original.
async function redimensionarImagen(archivo: File): Promise<Blob> {
  const bitmap = await createImageBitmap(archivo)
  const ladoMayor = Math.max(bitmap.width, bitmap.height)
  const escala = ladoMayor > LADO_MAXIMO ? LADO_MAXIMO / ladoMayor : 1
  const ancho = Math.max(1, Math.round(bitmap.width * escala))
  const alto = Math.max(1, Math.round(bitmap.height * escala))

  const canvas = document.createElement('canvas')
  canvas.width = ancho
  canvas.height = alto
  const contexto = canvas.getContext('2d')
  if (!contexto) throw new Error('No se pudo procesar la imagen.')
  contexto.drawImage(bitmap, 0, 0, ancho, alto)
  if (typeof bitmap.close === 'function') bitmap.close()

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, archivo.type)
  )
  if (!blob) throw new Error('No se pudo procesar la imagen.')
  return blob
}

async function subirLogo(archivo: File, proveedorId: string): Promise<string> {
  const blob = await redimensionarImagen(archivo)
  const supabase = createClient()
  const objectName = `${proveedorId}/${crypto.randomUUID()}.${EXTENSIONES[archivo.type]}`
  const { error } = await supabase.storage.from('logos').upload(objectName, blob, {
    contentType: archivo.type,
    upsert: false,
  })
  if (error) throw error
  const { data } = supabase.storage.from('logos').getPublicUrl(objectName)
  return data.publicUrl
}

export default function PerfilProveedorForm({ perfil }: PerfilProveedorFormProps) {
  const [logoUrl, setLogoUrl] = useState(perfil.logo_url ?? '')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [errorLogo, setErrorLogo] = useState<string | null>(null)
  const [procesando, setProcesando] = useState(false)
  const inputLogoRef = useRef<HTMLInputElement>(null)
  const objectUrlRef = useRef<string | null>(null)

  // Libera el objeto URL del logo elegido para no filtrar memoria.
  const revocarPreview = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current)
      objectUrlRef.current = null
    }
  }, [])

  // Limpia el objeto URL al desmontar el formulario.
  useEffect(() => revocarPreview, [revocarPreview])

  const ejecutarAccion = useCallback(
    async (
      prevState: PerfilProveedorActionResult | null,
      formData: FormData
    ): Promise<PerfilProveedorActionResult> => {
      const archivo = formData.get('logo')
      if (archivo instanceof File && archivo.size > 0) {
        const errorValidacion = validarImagen(archivo)
        if (errorValidacion) {
          setErrorLogo(errorValidacion)
          return { error: errorValidacion }
        }
        try {
          setProcesando(true)
          const url = await subirLogo(archivo, perfil.id)
          formData.set('logo_url', url)
          setLogoUrl(url)
        } catch {
          return { error: 'No se pudo subir el logo. Intenta de nuevo.' }
        } finally {
          setProcesando(false)
        }
      } else {
        formData.set('logo_url', logoUrl)
      }
      // No enviar el File crudo a la Server Action: supera el límite de cuerpo por
      // defecto de Next 16 (1 MB) y provoca 413 con imágenes válidas de 1–2 MB.
      formData.delete('logo')
      // La acción ignora el estado previo; se cubre el `null` inicial del hook.
      return guardarPerfilProveedor(prevState ?? { success: true }, formData)
    },
    [logoUrl, perfil.id]
  )

  const [state, formAction, pending] = useActionState(ejecutarAccion, null)

  function handleLogo(e: { target: HTMLInputElement }) {
    const archivo = e.target.files?.[0]
    if (!archivo) {
      // Sin archivo (selector cancelado) se vuelve al logo actual y a lo que se enviará.
      revocarPreview()
      setPreviewUrl(null)
      setErrorLogo(null)
      return
    }
    const errorValidacion = validarImagen(archivo)
    if (errorValidacion) {
      setErrorLogo(errorValidacion)
      e.target.value = ''
      revocarPreview()
      setPreviewUrl(null)
      return
    }
    setErrorLogo(null)
    // Sustituye la previsualización anterior liberando su objeto URL.
    revocarPreview()
    const url = URL.createObjectURL(archivo)
    objectUrlRef.current = url
    setPreviewUrl(url)
  }

  function quitarLogo() {
    revocarPreview()
    setPreviewUrl(null)
    setLogoUrl('')
    setErrorLogo(null)
    if (inputLogoRef.current) inputLogoRef.current.value = ''
  }

  function limpiarValidez(e: { currentTarget: HTMLInputElement }) {
    e.currentTarget.setCustomValidity('')
  }

  const inputClass =
    'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20'

  return (
    <form action={formAction} className="space-y-5 rounded-2xl bg-white border p-6 shadow-sm">
      <input type="hidden" name="logo_url" value={logoUrl} />

      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-gray-900">Información de la empresa</h2>
        <Link
          href={`/proveedores/${perfil.id}`}
          className="text-sm font-medium text-orange-500 hover:underline"
        >
          Ver mi perfil público
        </Link>
      </div>

      {state && 'error' in state && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {state && 'success' in state && state.success && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Perfil guardado correctamente.
        </div>
      )}

      <div>
        <label htmlFor="nombre_empresa" className="block text-sm font-medium text-gray-700 mb-1">
          Nombre de empresa <span className="text-red-500">*</span>
        </label>
        <input
          id="nombre_empresa"
          name="nombre_empresa"
          type="text"
          required
          defaultValue={perfil.nombre_empresa}
          placeholder="Ej: Promeria S.R.L."
          onInvalid={(e) => e.currentTarget.setCustomValidity('Escribe el nombre de la empresa.')}
          onChange={limpiarValidez}
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 mb-1">
          Descripción
        </label>
        <textarea
          id="descripcion"
          name="descripcion"
          rows={3}
          defaultValue={perfil.descripcion ?? ''}
          placeholder="Describe tu empresa y los productos o servicios que ofreces."
          className={`${inputClass} resize-none`}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="direccion" className="block text-sm font-medium text-gray-700 mb-1">
            Dirección
          </label>
          <input
            id="direccion"
            name="direccion"
            type="text"
            defaultValue={perfil.direccion ?? ''}
            placeholder="Calle, número, sector"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="ciudad" className="block text-sm font-medium text-gray-700 mb-1">
            Ciudad
          </label>
          <input
            id="ciudad"
            name="ciudad"
            type="text"
            defaultValue={perfil.ciudad ?? ''}
            placeholder="Ej: Santiago"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="rnc" className="block text-sm font-medium text-gray-700 mb-1">
            RNC
          </label>
          <input
            id="rnc"
            name="rnc"
            type="text"
            defaultValue={perfil.rnc ?? ''}
            placeholder="Ej: 130-12345-6"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="sitio_web" className="block text-sm font-medium text-gray-700 mb-1">
            Sitio web
          </label>
          <input
            id="sitio_web"
            name="sitio_web"
            type="text"
            defaultValue={perfil.sitio_web ?? ''}
            placeholder="https://miempresa.example"
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="telefono" className="block text-sm font-medium text-gray-700 mb-1">
            Teléfono
          </label>
          <input
            id="telefono"
            name="telefono"
            type="text"
            defaultValue={perfil.telefono ?? ''}
            placeholder="Ej: 809-555-0100"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="whatsapp" className="block text-sm font-medium text-gray-700 mb-1">
            WhatsApp
          </label>
          <input
            id="whatsapp"
            name="whatsapp"
            type="text"
            defaultValue={perfil.whatsapp ?? ''}
            placeholder="Ej: 809-555-0101"
            className={inputClass}
          />
        </div>
      </div>

      <div>
        <label htmlFor="horario" className="block text-sm font-medium text-gray-700 mb-1">
          Horario
        </label>
        <input
          id="horario"
          name="horario"
          type="text"
          defaultValue={perfil.horario ?? ''}
          placeholder="Ej: Lun a vie, 8:00 a.m. - 5:00 p.m."
          className={inputClass}
        />
      </div>

      <div>
        <label htmlFor="logo" className="block text-sm font-medium text-gray-700 mb-1">
          Logo
        </label>
        <input
          id="logo"
          name="logo"
          type="file"
          ref={inputLogoRef}
          accept="image/jpeg,image/png,image/webp"
          onChange={handleLogo}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 file:mr-3 file:rounded-md file:border-0 file:bg-orange-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-orange-600"
        />
        <p className="mt-1 text-xs text-gray-400">JPG, PNG o WebP de hasta 2 MB.</p>
        {(previewUrl || logoUrl) && (
          <div className="mt-3 flex items-start gap-3">
            {/* Vista previa: el logo elegido (objeto URL) o el logo actual al editar. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl ?? logoUrl}
              alt="Vista previa del logo"
              className="h-28 w-28 rounded-lg border object-cover"
            />
            <button
              type="button"
              onClick={quitarLogo}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-orange-400/40"
            >
              Quitar logo
            </button>
          </div>
        )}
        {errorLogo && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errorLogo}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="zonas" className="block text-sm font-medium text-gray-700 mb-1">
          Zonas de cobertura
        </label>
        <select
          id="zonas"
          name="zonas"
          multiple
          defaultValue={perfil.zonas_cobertura}
          className={`${inputClass} h-44`}
        >
          {PROVINCIAS.map((provincia) => (
            <option key={provincia} value={provincia}>
              {provincia}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-400">
          Mantén pulsada la tecla Ctrl (o Cmd) para elegir varias provincias.
        </p>
      </div>

      <Button
        type="submit"
        disabled={pending || procesando}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white"
      >
        {pending || procesando ? 'Guardando...' : 'Guardar cambios'}
      </Button>
    </form>
  )
}
