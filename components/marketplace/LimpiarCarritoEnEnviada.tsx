'use client'

import { useEffect } from 'react'
import { useCarritoStore } from '@/lib/store/carrito'

export default function LimpiarCarritoEnEnviada() {
  const vaciar = useCarritoStore((s) => s.vaciar)

  useEffect(() => {
    vaciar()
  }, [vaciar])

  return null
}
