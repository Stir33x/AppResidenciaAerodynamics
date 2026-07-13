import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../lib/api'

const dias = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function TipoBadge({ tipo, tipo_color }) {
  return (
    <span className={`text-[11px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${tipo_color || 'badge-soft'} inline-block`}>
      {tipo}
    </span>
  )
}

export default function ScheduleViewPage() {
  const { t } = useTranslation()
  const [horarios, setHorarios] = useState([])
  const [tipos, setTipos] = useState([])
  const [filtroTipo, setFiltroTipo] = useState('')

  useEffect(() => { fetchApi('/horario-types').then(setTipos).catch(() => {}) }, [])

  useEffect(() => {
    const qs = filtroTipo ? `?tipo=${filtroTipo}` : ''
    fetchApi(`/horarios${qs}`).then(setHorarios).catch(() => {})
  }, [filtroTipo])

  const agruparPorDia = (arr) => {
    const grupos = {}
    dias.forEach((d) => { grupos[d] = {} })
    arr.forEach((h) => {
      const dia = h.dia_semana && grupos[h.dia_semana] ? h.dia_semana : null
      if (!dia) return
      if (!grupos[dia][h.tipo]) grupos[dia][h.tipo] = []
      grupos[dia][h.tipo].push(h)
    })
    return grupos
  }

  const grupos = agruparPorDia(horarios)
  const tiposConItems = tipos.filter((tp) => horarios.some((h) => h.tipo === tp.nombre))

  return (
    <div className="flex flex-col gap-4">
      <h1 className="page-title">{t('layout.schedules')}</h1>

      <div className="flex gap-2 items-center flex-wrap">
        <span className="text-sm opacity-70">{t('schedules.filter')}</span>
        <select className="select select-bordered select-sm" value={filtroTipo} onChange={(e) => setFiltroTipo(e.target.value)}>
          <option value="">{t('schedules.all')}</option>
          {tipos.map((tp) => <option key={tp.id} value={tp.nombre}>{tp.nombre}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {tiposConItems.map((tp) => (
          <TipoBadge key={tp.id} tipo={tp.nombre} tipo_color={tp.color} />
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {dias.map((dia) => {
          const cats = grupos[dia] || {}
          const hasItems = Object.values(cats).some((arr) => arr.length > 0)
          return (
            <div key={dia} className="bg-base-100 border border-base-300 rounded-box p-3">
              <h2 className="text-sm font-semibold mb-2">{t('days.' + dia)}</h2>
              {!hasItems ? (
                <p className="text-xs opacity-40">{t('schedules.no_schedules')}</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {tipos.filter((tp) => cats[tp.nombre]?.length > 0).map((tp) => (
                    <div key={tp.id}>
                      <h3 className="mb-1">
                        <TipoBadge tipo={tp.nombre} tipo_color={tp.color} />
                      </h3>
                      <div className="flex flex-col gap-1">
                        {cats[tp.nombre].map((h) => (
                          <div key={h.id} className="bg-base-200 rounded-box p-2">
                            <span className="font-medium text-sm">{h.titulo}</span>
                            <div className="text-xs font-mono opacity-70 mt-0.5">
                              {h.hora_fin
                                ? `${h.hora_inicio?.slice(0, 5)} — ${h.hora_fin?.slice(0, 5)}`
                                : h.hora_inicio?.slice(0, 5)}
                            </div>
                            {h.ubicacion && (
                              <p className="text-[11px] opacity-50 mt-0.5">{h.ubicacion}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}