import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ItemCarrito, Producto } from '@/types'

interface CarritoStore {
  items: ItemCarrito[]
  agregar: (producto: Producto, cantidad?: number) => void
  quitar: (productoId: string) => void
  actualizarCantidad: (productoId: string, cantidad: number) => void
  vaciar: () => void
  total: () => number
  cantidadTotal: () => number
}

export const useCarritoStore = create<CarritoStore>()(
  persist(
    (set, get) => ({
      items: [],

      agregar: (producto, cantidad = 1) => {
        // Cantidades no enteras positivas y productos sin disponible se ignoran.
        if (!Number.isInteger(cantidad) || cantidad <= 0) return
        // El tope es el stock disponible: total menos unidades reservadas.
        const disponible = Math.max(0, producto.stock - (producto.stock_reservado ?? 0))
        if (disponible <= 0) return
        const items = get().items
        const existente = items.find((i) => i.producto.id === producto.id)
        if (existente) {
          set({
            items: items.map((i) =>
              i.producto.id === producto.id
                ? { ...i, producto, cantidad: Math.min(i.cantidad + cantidad, disponible) }
                : i
            ),
          })
        } else {
          set({
            items: [...items, { producto, cantidad: Math.min(cantidad, disponible) }],
          })
        }
      },

      quitar: (productoId) =>
        set({ items: get().items.filter((i) => i.producto.id !== productoId) }),

      actualizarCantidad: (productoId, cantidad) => {
        // Cero o negativo sigue quitando la línea; positivo se limita al disponible.
        if (cantidad <= 0) {
          get().quitar(productoId)
          return
        }
        set({
          items: get().items.map((i) =>
            i.producto.id === productoId
              ? {
                  ...i,
                  cantidad: Math.min(
                    cantidad,
                    Math.max(0, i.producto.stock - (i.producto.stock_reservado ?? 0))
                  ),
                }
              : i
          ),
        })
      },

      vaciar: () => set({ items: [] }),

      total: () =>
        get().items.reduce((acc, i) => acc + i.producto.precio * i.cantidad, 0),

      cantidadTotal: () =>
        get().items.reduce((acc, i) => acc + i.cantidad, 0),
    }),
    { name: 'resuelvelo-carrito' }
  )
)
