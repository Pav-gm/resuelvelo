'use client'

import { useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { resolverVerificacionProveedor } from '@/app/(marketplace)/admin/actions'

interface AdminVerificacionAccionesProps {
  proveedorId: string
}

export default function AdminVerificacionAcciones({
  proveedorId,
}: AdminVerificacionAccionesProps) {
  const [nota, setNota] = useState('')
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [exito, setExito] = useState<string | null>(null)

  const idNota = `nota-verificacion-${proveedorId}`

  function resolver(estado: 'verificado' | 'rechazado') {
    setError(null)
    setExito(null)
    if (!nota.trim()) {
      setError('La nota es obligatoria.')
      return
    }
    startTransition(async () => {
      const resultado = await resolverVerificacionProveedor(proveedorId, estado, nota)
      if ('error' in resultado && resultado.error) {
        setError(resultado.error)
      } else {
        setExito(estado === 'verificado' ? 'Proveedor verificado.' : 'Solicitud rechazada.')
        setNota('')
      }
    })
  }

  return (
    <div className="flex w-full flex-col items-stretch gap-2 sm:w-72">
      <label htmlFor={idNota} className="text-xs font-medium text-gray-600">
        Nota
      </label>
      <input
        id={idNota}
        type="text"
        value={nota}
        disabled={pending}
        onChange={(e) => setNota(e.target.value)}
        placeholder="Detalle de la revisión"
        className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-400/20"
      />
      <div className="flex items-center gap-2">
        <Button
          type="button"
          disabled={pending}
          onClick={() => resolver('verificado')}
          className="bg-green-600 text-white hover:bg-green-700"
        >
          Verificar
        </Button>
        <Button
          type="button"
          variant="destructive"
          disabled={pending}
          onClick={() => resolver('rechazado')}
        >
          Rechazar
        </Button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
      {exito && !error && <p className="text-xs text-green-600">{exito}</p>}
    </div>
  )
}
