'use client'

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { crearSolicitudAProveedores } from '@/app/(marketplace)/cotizaciones/actions'
import { useCarritoStore } from '@/lib/store/carrito'
import type { ProveedorConConteo } from '@/lib/data'
import type { Categoria, LineaSolicitudInput, Producto } from '@/types'

const MAX_PROVEEDORES = 5

const noop = () => () => {}

interface Props {
  categorias: Categoria[]
  proveedores: ProveedorConConteo[]
  productos: Producto[]
  desdeCarrito: boolean
}

interface LineaForm {
  key: string
  productoId: string | null
  descripcion: string
  cantidad: string
  unidad: string
}

export default function NuevaSolicitudForm({
  categorias,
  proveedores,
  productos,
  desdeCarrito,
}: Props) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  // Contador de claves de línea; solo se lee/escribe en manejadores y efectos.
  const contadorLineas = useRef(1)

  // Genera una línea nueva con clave estable única; solo desde eventos o efectos.
  function nuevaLinea(): LineaForm {
    contadorLineas.current += 1
    return {
      key: `linea-${contadorLineas.current}`,
      productoId: null,
      descripcion: '',
      cantidad: '1',
      unidad: '',
    }
  }
  // El carrito se hidrata desde localStorage solo en el cliente.
  const montado = useSyncExternalStore(noop, () => true, () => false)
  const vaciar = useCarritoStore((state) => state.vaciar)
  const importado = useRef(false)

  const [titulo, setTitulo] = useState('')
  const [notas, setNotas] = useState('')
  const [fechaRequerida, setFechaRequerida] = useState('')
  const [lineas, setLineas] = useState<LineaForm[]>(() => [
    { key: 'linea-1', productoId: null, descripcion: '', cantidad: '1', unidad: '' },
  ])
  const [categoriaId, setCategoriaId] = useState('')
  const [provincia, setProvincia] = useState('')
  const [seleccion, setSeleccion] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  // Categorías de los productos activos de cada proveedor, para filtrarlos.
  const categoriasPorProveedor = useMemo(() => {
    const mapa = new Map<string, Set<string>>()
    for (const producto of productos) {
      if (!producto.activo) continue
      const conjunto = mapa.get(producto.proveedor_id) ?? new Set<string>()
      conjunto.add(producto.categoria_id)
      mapa.set(producto.proveedor_id, conjunto)
    }
    return mapa
  }, [productos])

  const provincias = useMemo(() => {
    const conjunto = new Set<string>()
    for (const proveedor of proveedores) {
      for (const zona of proveedor.zonas_cobertura ?? []) conjunto.add(zona)
    }
    return [...conjunto].sort((a, b) => a.localeCompare(b, 'es'))
  }, [proveedores])

  const proveedoresFiltrados = useMemo(() => {
    return proveedores.filter((proveedor) => {
      if (categoriaId && !categoriasPorProveedor.get(proveedor.id)?.has(categoriaId)) return false
      if (provincia && !(proveedor.zonas_cobertura ?? []).includes(provincia)) return false
      return true
    })
  }, [proveedores, categoriasPorProveedor, categoriaId, provincia])

  // Con la intención `desde=carrito`, importa una sola vez —tras el montaje y
  // la hidratación— las líneas guardadas en el navegador; el carrito no se
  // vacía hasta que la solicitud se cree.
  useEffect(() => {
    if (!montado || !desdeCarrito || importado.current) return
    importado.current = true
    const items = useCarritoStore.getState().items
    if (!items.length) return
    setLineas(
      items.map((item) => {
        contadorLineas.current += 1
        return {
          key: `linea-${contadorLineas.current}`,
          productoId: item.producto.id,
          descripcion: item.producto.nombre,
          cantidad: String(item.cantidad),
          unidad: item.producto.unidad,
        }
      })
    )
  }, [montado, desdeCarrito])

  function actualizarLinea(key: string, cambios: Partial<LineaForm>) {
    setLineas((previas) =>
      previas.map((linea) => (linea.key === key ? { ...linea, ...cambios } : linea))
    )
  }

  function alternarProveedor(proveedorId: string) {
    setError(null)
    if (seleccion.includes(proveedorId)) {
      setSeleccion(seleccion.filter((id) => id !== proveedorId))
      return
    }
    if (seleccion.length >= MAX_PROVEEDORES) {
      setError('Puedes seleccionar hasta 5 proveedores.')
      return
    }
    setSeleccion([...seleccion, proveedorId])
  }

  function enviar() {
    setError(null)
    if (!titulo.trim()) {
      setError('Indica el título de la solicitud.')
      return
    }

    const lineasValidas: LineaSolicitudInput[] = []
    for (const linea of lineas) {
      const descripcion = linea.descripcion.trim()
      const cantidad = Number(linea.cantidad)
      if (!descripcion || !Number.isSafeInteger(cantidad) || cantidad <= 0) {
        setError('Cada línea necesita una descripción y una cantidad positiva.')
        return
      }
      lineasValidas.push({
        productoId: linea.productoId,
        descripcion,
        cantidad,
        unidad: linea.unidad.trim() || null,
      })
    }
    if (!lineasValidas.length) {
      setError('Agrega al menos una línea a la solicitud.')
      return
    }
    if (seleccion.length < 1 || seleccion.length > MAX_PROVEEDORES) {
      setError('Selecciona entre 1 y 5 proveedores.')
      return
    }

    startTransition(async () => {
      const resultado = await crearSolicitudAProveedores({
        titulo: titulo.trim(),
        notas: notas.trim() || null,
        fechaRequerida: fechaRequerida || null,
        proveedorIds: seleccion,
        lineas: lineasValidas,
      })
      if ('error' in resultado) {
        setError(resultado.error)
        return
      }
      vaciar()
      router.push(`/solicitudes/${resultado.solicitudId}`)
    })
  }

  return (
    <div className="mt-6 space-y-6">
      <div className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-1">
          <label htmlFor="titulo" className="text-sm font-medium text-gray-700">
            Título de la solicitud
          </label>
          <input
            id="titulo"
            type="text"
            value={titulo}
            disabled={pending}
            onChange={(evento) => setTitulo(evento.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="notas" className="text-sm font-medium text-gray-700">
              Notas (opcional)
            </label>
            <textarea
              id="notas"
              value={notas}
              disabled={pending}
              onChange={(evento) => setNotas(evento.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="fechaRequerida" className="text-sm font-medium text-gray-700">
              Fecha requerida (opcional)
            </label>
            <input
              id="fechaRequerida"
              type="date"
              value={fechaRequerida}
              disabled={pending}
              onChange={(evento) => setFechaRequerida(evento.target.value)}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold text-gray-900">Líneas de la solicitud</h2>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => {
            const linea = nuevaLinea()
            setLineas((previas) => [...previas, linea])
          }}>
            Agregar línea
          </Button>
        </div>

        {lineas.map((linea) => (
          <div key={linea.key} className="grid gap-2 sm:grid-cols-[1fr_6rem_6rem_auto]">
            <input
              aria-label="Descripción"
              type="text"
              placeholder="Descripción"
              value={linea.descripcion}
              disabled={pending}
              onChange={(evento) => actualizarLinea(linea.key, { descripcion: evento.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
            />
            <input
              aria-label="Cantidad"
              type="number"
              min={1}
              value={linea.cantidad}
              disabled={pending}
              onChange={(evento) => actualizarLinea(linea.key, { cantidad: evento.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
            />
            <input
              aria-label="Unidad"
              type="text"
              placeholder="Unidad"
              value={linea.unidad}
              disabled={pending}
              onChange={(evento) => actualizarLinea(linea.key, { unidad: evento.target.value })}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
            />
            <Button
              size="sm"
              variant="outline"
              className="text-red-500 border-red-200 hover:bg-red-50"
              disabled={pending || lineas.length === 1}
              onClick={() => setLineas((previas) => previas.filter((l) => l.key !== linea.key))}
            >
              Quitar
            </Button>
          </div>
        ))}
      </div>

      <div className="space-y-4 rounded-2xl border bg-white p-6 shadow-sm">
        <h2 className="font-semibold text-gray-900">Proveedores</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label htmlFor="categoria" className="text-sm font-medium text-gray-700">
              Categoría
            </label>
            <select
              id="categoria"
              value={categoriaId}
              disabled={pending}
              onChange={(evento) => setCategoriaId(evento.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={categoria.id}>
                  {categoria.nombre}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor="provincia" className="text-sm font-medium text-gray-700">
              Provincia de cobertura
            </label>
            <select
              id="provincia"
              value={provincia}
              disabled={pending}
              onChange={(evento) => setProvincia(evento.target.value)}
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900"
            >
              <option value="">Todas las provincias</option>
              {provincias.map((zona) => (
                <option key={zona} value={zona}>
                  {zona}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p className="text-xs text-gray-500">{`Proveedores seleccionados: ${seleccion.length} de ${MAX_PROVEEDORES}`}</p>

        {proveedoresFiltrados.length === 0 ? (
          <p className="text-sm text-gray-400">No hay proveedores que coincidan con el filtro.</p>
        ) : (
          <ul className="space-y-2">
            {proveedoresFiltrados.map((proveedor) => {
              const seleccionado = seleccion.includes(proveedor.id)
              return (
                <li key={proveedor.id}>
                  <label className="flex cursor-pointer items-start gap-3 rounded-lg border p-3 hover:bg-gray-50">
                    <input
                      type="checkbox"
                      checked={seleccionado}
                      disabled={pending}
                      onChange={() => alternarProveedor(proveedor.id)}
                      className="mt-1"
                    />
                    <span className="min-w-0">
                      <span className="block font-medium text-gray-900">
                        {proveedor.nombre_empresa}
                      </span>
                      {proveedor.verificado && (
                        <span className="block text-xs font-medium text-teal-600">
                          Proveedor verificado
                        </span>
                      )}
                      <span className="block text-xs text-gray-500">
                        {`Calificación: ${
                          proveedor.conteo_feedback
                            ? `${proveedor.promedio_feedback} (${proveedor.conteo_feedback})`
                            : 'sin reseñas'
                        }`}
                      </span>
                      <span className="block text-xs text-gray-500">
                        {`Cobertura: ${
                          (proveedor.zonas_cobertura ?? []).join(', ') || 'no especificada'
                        }`}
                      </span>
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <Button
        className="w-full bg-orange-500 text-white hover:bg-orange-600"
        disabled={pending}
        onClick={enviar}
      >
        {pending ? 'Enviando…' : 'Enviar solicitud'}
      </Button>
    </div>
  )
}
