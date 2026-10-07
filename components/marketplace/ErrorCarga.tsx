'use client'

import { useRouter } from 'next/navigation'

export default function ErrorCarga() {
  const router = useRouter()

  return (
    <div className="py-16 text-center">
      <p className="text-lg font-medium text-gray-700">
        No pudimos cargar los datos. Intenta de nuevo.
      </p>
      <button
        onClick={() => router.refresh()}
        className="mt-4 rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white hover:bg-orange-600"
      >
        Reintentar
      </button>
    </div>
  )
}
