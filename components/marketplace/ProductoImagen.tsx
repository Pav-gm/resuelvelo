import { Package } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Categoria } from '@/types'

interface ProductoImagenProps {
  imagenUrl?: string | null
  nombre: string
  categoria?: Categoria
  className?: string
  tamanio?: 'miniatura' | 'ficha'
}

export default function ProductoImagen({
  imagenUrl,
  nombre,
  categoria,
  className,
  tamanio = 'miniatura',
}: ProductoImagenProps) {
  const esFicha = tamanio === 'ficha'
  const base = cn('aspect-square w-full bg-gray-100', esFicha ? 'rounded-2xl' : 'rounded-t-xl')

  if (imagenUrl) {
    return (
      // La URL pública del producto vive en un host de Storage que el proyecto no
      // configura en next.config: se usa <img> para no asumir dominios remotos.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imagenUrl} alt={nombre} className={cn(base, 'object-cover', className)} />
    )
  }

  return (
    <div
      role="img"
      aria-label={nombre}
      className={cn(base, 'flex items-center justify-center', className)}
    >
      {categoria?.icono ? (
        <span aria-hidden="true" className={esFicha ? 'text-7xl' : 'text-4xl'}>
          {categoria.icono}
        </span>
      ) : (
        <Package className={esFicha ? 'h-20 w-20 text-gray-300' : 'h-12 w-12 text-gray-300'} />
      )}
    </div>
  )
}
