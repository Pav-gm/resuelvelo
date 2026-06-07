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
        const items = get().items
        const existente = items.find((i) => i.producto.id === producto.id)
        if (existente) {
          set({
            items: items.map((i) =>
              i.producto.id === producto.id
                ? { ...i, cantidad: i.cantidad + cantidad }
                : i
            ),
          })
        } else {
          set({ items: [...items, { producto, cantidad }] })
        }
      },

      quitar: (productoId) =>
        set({ items: get().items.filter((i) => i.producto.id !== productoId) }),

      actualizarCantidad: (productoId, cantidad) => {
        if (cantidad <= 0) {
          get().quitar(productoId)
          return
        }
        set({
          items: get().items.map((i) =>
            i.producto.id === productoId ? { ...i, cantidad } : i
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
