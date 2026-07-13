import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../lib/api'

function getWeekStart(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export default function MenuViewPage() {
  const { t, i18n } = useTranslation()
  const [days, setDays] = useState([])
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()))
  const [loading, setLoading] = useState(true)

  const fetchRange = useCallback(async () => {
    setLoading(true)
    const from = weekStart.toISOString().split('T')[0]
    const end = new Date(weekStart)
    end.setDate(end.getDate() + 6)
    const to = end.toISOString().split('T')[0]

    try {
      const data = await fetchApi(`/menu/effective-range?from=${from}&to=${to}`)
      setDays(data)
    } catch {
      setDays([])
    }
    setLoading(false)
  }, [weekStart])

  useEffect(() => { fetchRange() }, [fetchRange])

  const goPrev = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() - 7)
    setWeekStart(d)
  }

  const goNext = () => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + 7)
    setWeekStart(d)
  }

  const goToday = () => setWeekStart(getWeekStart(new Date()))

  const today = new Date().toISOString().split('T')[0]
  const isToday = (f) => f === today
  const isCurrentWeek = getWeekStart(new Date()).getTime() === weekStart.getTime()

  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const dateOpts = { day: 'numeric', month: 'long' }
  const weekLabel = `${weekStart.toLocaleDateString(i18n.language, dateOpts)} — ${weekEnd.toLocaleDateString(i18n.language, dateOpts)}`

  if (loading) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="page-title">{t('menu.title')}</h1>
        <div className="flex justify-center p-10">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="page-title mb-0">{t('menu.title')}</h1>
        <div className="flex items-center gap-2">
          <button className="btn btn-ghost btn-sm" onClick={goPrev}>
            ← {t('menu.prev_week')}
          </button>
          {!isCurrentWeek && (
            <button className="btn btn-outline btn-xs" onClick={goToday}>
              {t('menu.view_today')}
            </button>
          )}
          <span className="font-mono text-sm font-semibold tabular-nums whitespace-nowrap">
            {weekLabel}
          </span>
          <button className="btn btn-ghost btn-sm" onClick={goNext}>
            {t('menu.next_week')} →
          </button>
        </div>
      </div>

      {days.length === 0 ? (
        <div className="border border-base-300 rounded-xl p-8 text-center text-sm text-base-content/50">
          {t('menu.view_no_menu')}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-3">
          {days.map(({ fecha, template }) => {
            const dateObj = new Date(fecha + 'T12:00:00')
            const todayCard = isToday(fecha)
              ? 'ring-1 ring-accent/30 border-accent/40'
              : 'border-base-200'

            return (
              <div key={fecha} className={`border rounded-xl overflow-hidden bg-base-100 ${todayCard}`}>
                <div className={`p-3 border-b text-center ${isToday(fecha) ? 'bg-accent/5 border-b-accent/20' : 'bg-base-200 border-base-200'}`}>
                  <div className="text-xs text-base-content/50 uppercase tracking-wider font-mono tabular-nums">
                    {dateObj.toLocaleDateString(i18n.language, { weekday: 'short' })}
                  </div>
                  <div className="text-lg font-bold font-mono tabular-nums">
                    {dateObj.getDate()}
                  </div>
                  <div className="text-xs text-base-content/50 font-mono tabular-nums">
                    {dateObj.toLocaleDateString(i18n.language, { month: 'short' })}
                  </div>
                  {isToday(fecha) && (
                    <span className="badge badge-accent badge-xs mt-1">{t('menu.view_today')}</span>
                  )}
                </div>

                {!template ? (
                  <div className="p-3 text-xs text-base-content/40 text-center">
                    {t('menu.view_no_menu')}
                  </div>
                ) : (
                  <div className="p-2 space-y-2 max-h-72 overflow-y-auto">
                    {template.nombre && (
                      <div className="text-xs font-semibold text-center text-base-content/70">{template.nombre}</div>
                    )}
                    {template.sections?.map((sec) => (
                      <div key={sec.id}>
                        <h4 className="text-[11px] font-semibold uppercase tracking-wider text-base-content/60 mb-0.5">
                          {sec.nombre}
                        </h4>
                        <div className="space-y-0.5">
                          {sec.items?.length > 0 ? (
                            sec.items.map((item) => (
                              <div key={item.id} className="text-xs flex items-start gap-1">
                                <span className="text-base-content/30 mt-0.5 shrink-0">·</span>
                                <div className="min-w-0">
                                  <span className="font-medium text-xs">{item.nombre}</span>
                                  {item.allergens?.length > 0 && (
                                    <span className="ml-1 inline-flex gap-0.5">
                                      {item.allergens.map((a) => (
                                        <span key={a.id} className="badge badge-warning badge-soft badge-xs" title={t('allergens.' + a.nombre)}>
                                          {t('allergens.' + a.nombre)}
                                        </span>
                                      ))}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))
                          ) : (
                            <p className="text-[11px] text-base-content/30">{t('menu.items_empty')}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
