'use client'

import { useActionState, useCallback, useState } from 'react'
import { Button } from '@/components/ui/button'
import { crearProducto, actualizarProducto, type ProductoError } from '@/app/(marketplace)/proveedor/actions'
import { createClient } from '@/lib/supabase/client'
import type { Categoria, Producto, Subcategoria } from '@/types'

interface ProductoFormProps {
  categorias: Categoria[]
  subcategorias: Subcategoria[]
  producto?: Producto
  proveedorId?: string
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

async function subirImagen(archivo: File, proveedorId: string): Promise<string> {
  const blob = await redimensionarImagen(archivo)
  const supabase = createClient()
  const objectName = `${proveedorId}/${crypto.randomUUID()}.${EXTENSIONES[archivo.type]}`
  const { error } = await supabase.storage.from('productos').upload(objectName, blob, {
    contentType: archivo.type,
    upsert: false,
  })
  if (error) throw error
  const { data } = supabase.storage.from('productos').getPublicUrl(objectName)
  return data.publicUrl
}

export default function ProductoForm({ categorias, subcategorias, producto, proveedorId }: ProductoFormProps) {
  const action = producto ? actualizarProducto : crearProducto
  const [categoriaId, setCategoriaId] = useState(producto?.categoria_id ?? '')
  const [subcategoriaId, setSubcategoriaId] = useState(producto?.subcategoria_id ?? '')
  const [imagenUrl, setImagenUrl] = useState(producto?.imagen_url ?? '')
  const [errorImagen, setErrorImagen] = useState<string | null>(null)
  const [procesando, setProcesando] = useState(false)

  const ejecutarAccion = useCallback(
    async (prevState: ProductoError, formData: FormData): Promise<ProductoError> => {
      const archivo = formData.get('imagen')
      if (archivo instanceof File && archivo.size > 0) {
        const errorValidacion = validarImagen(archivo)
        if (errorValidacion) {
          setErrorImagen(errorValidacion)
          return { error: errorValidacion }
        }
        if (!proveedorId) {
          return { error: 'No se pudo identificar el proveedor para subir la imagen.' }
        }
        try {
          setProcesando(true)
          const url = await subirImagen(archivo, proveedorId)
          formData.set('imagen_url', url)
        } catch {
          return { error: 'No se pudo subir la imagen. Intenta de nuevo.' }
        } finally {
          setProcesando(false)
        }
      } else {
        formData.set('imagen_url', imagenUrl)
      }
      return action(prevState, formData)
    },
    [action, imagenUrl, proveedorId]
  )

  const [state, formAction, pending] = useActionState(ejecutarAccion, null)

  const subcategoriasDeCategoria = subcategorias.filter(
    (sub) => sub.categoria_id === categoriaId
  )

  function handleImagen(e: { target: HTMLInputElement }) {
    const archivo = e.target.files?.[0]
    if (!archivo) {
      setErrorImagen(null)
      return
    }
    const errorValidacion = validarImagen(archivo)
    if (errorValidacion) {
      setErrorImagen(errorValidacion)
      e.target.value = ''
      return
    }
    setErrorImagen(null)
  }

  function limpiarValidez(e: { currentTarget: HTMLInputElement | HTMLSelectElement }) {
    e.currentTarget.setCustomValidity('')
  }

  function marcarInvalido(
    e: { currentTarget: HTMLInputElement | HTMLSelectElement },
    mensajeVacio: string,
    mensajeNegativo?: string
  ) {
    const control = e.currentTarget
    if (mensajeNegativo && control.validity.rangeUnderflow) {
      control.setCustomValidity(mensajeNegativo)
    } else {
      control.setCustomValidity(mensajeVacio)
    }
  }

  return (
    <form action={formAction} className="space-y-5 rounded-2xl bg-white border p-6 shadow-sm">
      {producto && <input type="hidden" name="id" value={producto.id} />}
      <input type="hidden" name="imagen_url" value={imagenUrl} />

      {state?.error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      <div>
        <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
          Nombre del producto <span className="text-red-500">*</span>
        </label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          required
          defaultValue={producto?.nombre}
          placeholder="Ej: Tubo PVC 4'' sanitario"
          onInvalid={(e) => marcarInvalido(e, 'Escribe el nombre del producto.')}
          onChange={limpiarValidez}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
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
          defaultValue={producto?.descripcion ?? ''}
          placeholder="Detalles del producto..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 resize-none"
        />
      </div>

      <div>
        <label htmlFor="imagen" className="block text-sm font-medium text-gray-700 mb-1">
          Imagen del producto
        </label>
        <input
          id="imagen"
          name="imagen"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleImagen}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 file:mr-3 file:rounded-md file:border-0 file:bg-orange-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-orange-600"
        />
        <p className="mt-1 text-xs text-gray-400">JPG, PNG o WebP de hasta 2 MB.</p>
        {errorImagen && (
          <p className="mt-1 text-sm text-red-600" role="alert">
            {errorImagen}
          </p>
        )}
      </div>

      <div>
        <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1">
          SKU
        </label>
        <input
          id="sku"
          name="sku"
          type="text"
          defaultValue={producto?.sku ?? ''}
          placeholder="Ej: PVC-04"
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
        />
      </div>

      <div>
        <label htmlFor="especificaciones" className="block text-sm font-medium text-gray-700 mb-1">
          Especificaciones
        </label>
        <textarea
          id="especificaciones"
          name="especificaciones"
          rows={3}
          defaultValue={producto?.especificaciones ?? ''}
          placeholder="Diámetro, material, medidas..."
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 resize-none"
        />
      </div>

      <div>
        <label htmlFor="categoria_id" className="block text-sm font-medium text-gray-700 mb-1">
          Categoría <span className="text-red-500">*</span>
        </label>
        <select
          id="categoria_id"
          name="categoria_id"
          required
          value={categoriaId}
          onInvalid={(e) => marcarInvalido(e, 'Selecciona una categoría.')}
          onChange={(e) => {
            e.currentTarget.setCustomValidity('')
            setCategoriaId(e.target.value)
            setSubcategoriaId('')
          }}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 bg-white"
        >
          <option value="">Seleccionar categoría</option>
          {categorias.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.nombre}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="subcategoria_id" className="block text-sm font-medium text-gray-700 mb-1">
          Subcategoría <span className="text-red-500">*</span>
        </label>
        <select
          id="subcategoria_id"
          name="subcategoria_id"
          required
          value={subcategoriaId}
          disabled={!categoriaId}
          onInvalid={(e) => marcarInvalido(e, 'Selecciona una subcategoría.')}
          onChange={(e) => {
            e.currentTarget.setCustomValidity('')
            setSubcategoriaId(e.target.value)
          }}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20 bg-white disabled:bg-gray-50 disabled:text-gray-400"
        >
          <option value="">Seleccionar subcategoría</option>
          {subcategoriasDeCategoria.map((sub) => (
            <option key={sub.id} value={sub.id}>
              {sub.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="precio" className="block text-sm font-medium text-gray-700 mb-1">
            Precio (RD$) <span className="text-red-500">*</span>
          </label>
          <input
            id="precio"
            name="precio"
            type="number"
            required
            min={0}
            step="0.01"
            defaultValue={producto?.precio}
            placeholder="0.00"
            onInvalid={(e) =>
              marcarInvalido(e, 'Ingresa un precio válido.', 'El precio no puede ser negativo.')
            }
            onChange={limpiarValidez}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
          />
        </div>

        <div>
          <label htmlFor="unidad" className="block text-sm font-medium text-gray-700 mb-1">
            Unidad <span className="text-red-500">*</span>
          </label>
          <input
            id="unidad"
            name="unidad"
            type="text"
            required
            defaultValue={producto?.unidad ?? 'unidad'}
            placeholder="unidad, saco, rollo..."
            onInvalid={(e) => marcarInvalido(e, 'Ingresa la unidad del producto.')}
            onChange={limpiarValidez}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
          />
        </div>
      </div>

      <div>
        <label htmlFor="stock" className="block text-sm font-medium text-gray-700 mb-1">
          Stock disponible <span className="text-red-500">*</span>
        </label>
        <input
          id="stock"
          name="stock"
          type="number"
          required
          min={0}
          defaultValue={producto?.stock ?? 0}
          onInvalid={(e) =>
            marcarInvalido(e, 'Ingresa el stock disponible.', 'El stock no puede ser negativo.')
          }
          onChange={limpiarValidez}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
        />
      </div>

      <div className="flex items-center gap-2">
        <input
          id="itbis_incluido"
          name="itbis_incluido"
          type="checkbox"
          defaultChecked={producto?.itbis_incluido !== false}
          className="h-4 w-4 rounded border-gray-300 text-orange-500 focus:ring-orange-400"
        />
        <label htmlFor="itbis_incluido" className="text-sm font-medium text-gray-700">
          Precio incluye ITBIS
        </label>
      </div>

      <Button
        type="submit"
        disabled={pending || procesando}
        className="w-full bg-orange-500 hover:bg-orange-600 text-white"
      >
        {pending || procesando
          ? 'Guardando...'
          : producto
          ? 'Actualizar producto'
          : 'Publicar producto'}
      </Button>
    </form>
  )
}
