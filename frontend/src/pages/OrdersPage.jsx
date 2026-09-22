import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { fetchApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'

export default function OrdersPage() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const { addToast } = useToast()
  const puedeVerTodo = ['cocina', 'direccion'].includes(user?.rol)
  const puedeReservar = ['estudiante', 'invitado'].includes(user?.rol)
  const puedeGestionar = user?.rol === 'cocina'

  const today = new Date().toISOString().split('T')[0]
  const [fecha, setFecha] = useState(today)
  const [menu, setMenu] = useState(null)
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [cantidad, setCantidad] = useState({})
  const [nota, setNota] = useState({})
  const [saving, setSaving] = useState(null)

  const ordersSrc = puedeVerTodo ? `/menu-orders?fecha=${fecha}` : `/menu-orders/mine?fecha=${fecha}`

  const loadOrders = useCallback(async () => {
    try {
      const data = await fetchApi(ordersSrc)
      setOrders(data)
    } catch {}
  }, [ordersSrc])

  const loadMenu = useCallback(async () => {
    try {
      const data = await fetchApi(`/menu/effective?fecha=${fecha}`)
      setMenu(data)
    } catch {
      setMenu(null)
    }
  }, [fecha])

  useEffect(() => {
    let active = true
    setLoading(true)
    Promise.all([loadMenu(), loadOrders()]).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [loadMenu, loadOrders])

  useEffect(() => {
    const id = setInterval(loadOrders, 10000)
    return () => clearInterval(id)
  }, [loadOrders])

  const placeOrder = async (item) => {
    const cant = cantidad[item.id] || 1
    const n = (nota[item.id] || '').trim()
    setSaving(item.id)
    try {
      await fetchApi('/menu-orders', {
        method: 'POST',
        body: JSON.stringify({ item_id: item.id, fecha, cantidad: cant, nota: n }),
      })
      addToast(t('orders.added'), 'success')
      setCantidad((prev) => ({ ...prev, [item.id]: 1 }))
      setNota((prev) => ({ ...prev, [item.id]: '' }))
      loadOrders()
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSaving(null)
    }
  }

  const cancelOrder = async (o) => {
    try {
      await fetchApi(`/menu-orders/${o.id}`, { method: 'DELETE' })
      addToast(t('orders.cancelled'), 'success')
      loadOrders()
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  const setEstado = async (o, estado) => {
    try {
      await fetchApi(`/menu-orders/${o.id}`, { method: 'PUT', body: JSON.stringify({ estado }) })
      loadOrders()
    } catch (err) {
      addToast(err.message, 'error')
    }
  }

  const isMyOrder = (o) => o.profile_id === user?.id

  const grouped = {}
  for (const o of orders) {
    if (!grouped[o.item_nombre]) grouped[o.item_nombre] = { seccion: o.seccion, orders: [] }
    grouped[o.item_nombre].orders.push(o)
  }

  const inputCls = 'input input-bordered input-sm w-full'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title mb-0">{t('orders.title')}</h1>
          <p className="text-sm text-base-content/50 mt-1">{t('orders.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="date"
            className={inputCls}
            value={fecha}
            max={today}
            onChange={(e) => setFecha(e.target.value)}
          />
          <button className="btn btn-outline btn-sm" onClick={() => setFecha(today)}>
            {t('orders.today')}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center p-10">
          <span className="loading loading-spinner loading-lg text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Menú del día + reservas */}
          <div className="border border-base-300 rounded-xl bg-base-100 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-base-300 font-semibold text-sm flex items-center justify-between">
              <span>{t('orders.menu_title')}</span>
              {orders.length > 0 && (
                <span className="badge badge-accent badge-sm">
                  {t(puedeVerTodo ? 'orders.total_orders' : 'orders.my_orders', { count: orders.length })}
                </span>
              )}
            </div>
            <div className="p-4 space-y-4 overflow-y-auto max-h-[70svh]">
              {!menu ? (
                <div className="text-sm text-base-content/40 text-center py-8">{t('orders.no_menu')}</div>
              ) : (
                menu.sections?.map((sec) => (
                  <div key={sec.id}>
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-base-content/60 mb-2">
                      {sec.nombre}
                    </h3>
                    <div className="space-y-2">
                      {sec.items?.length === 0 && (
                        <p className="text-xs text-base-content/30">{t('menu.items_empty')}</p>
                      )}
                      {sec.items?.map((item) => (
                        <div key={item.id} className="border border-base-200 rounded-lg p-3 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="font-medium text-sm truncate">{item.nombre}</div>
                              {item.descripcion && (
                                <div className="text-xs text-base-content/50 line-clamp-2">{item.descripcion}</div>
                              )}
                            </div>
                            {item.precio > 0 && (
                              <span className="badge badge-ghost badge-sm font-mono shrink-0">
                                {item.precio} €
                              </span>
                            )}
                          </div>
                          {puedeReservar && (
                            <div className="flex flex-wrap items-center gap-2">
                              <label className="text-xs text-base-content/50 shrink-0">{t('orders.quantity')}</label>
                              <input
                                type="number"
                                min={1}
                                max={99}
                                value={cantidad[item.id] || 1}
                                onChange={(e) => setCantidad((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                className="input input-bordered input-xs w-16 text-center"
                              />
                              <input
                                type="text"
                                placeholder={t('orders.note_placeholder')}
                                value={nota[item.id] || ''}
                                onChange={(e) => setNota((prev) => ({ ...prev, [item.id]: e.target.value }))}
                                className={inputCls + ' flex-1 min-w-32'}
                              />
                              <button
                                className="btn btn-primary btn-sm"
                                disabled={saving === item.id}
                                onClick={() => placeOrder(item)}
                              >
                                {saving === item.id && <span className="loading loading-spinner loading-xs" />}
                                {t('orders.place')}
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Feed de reservas */}
          <div className="border border-base-300 rounded-xl bg-base-100 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-base-300 font-semibold text-sm flex items-center justify-between">
              <span>{puedeVerTodo ? t('orders.live_title') : t('orders.my_reservations')}</span>
              <span className="badge badge-ghost badge-sm">
                {t('orders.live_poll')}
              </span>
            </div>
            <div className="p-4 space-y-4 overflow-y-auto max-h-[70svh]">
              {orders.length === 0 ? (
                <div className="text-sm text-base-content/40 text-center py-8">{t('orders.orders_empty')}</div>
              ) : (
                Object.entries(grouped).map(([nombre, { seccion, orders: grupo }]) => {
                  const total = grupo.reduce((acc, o) => acc + o.cantidad, 0)
                  return (
                    <div key={nombre}>
                      <div className="flex items-baseline justify-between gap-2 mb-1.5">
                        <h4 className="font-medium text-sm truncate">{nombre}</h4>
                        <span className="font-mono text-xs tabular-nums text-base-content/50 shrink-0">×{total}</span>
                      </div>
                      <div className="space-y-1.5">
                        {grupo.map((o) => (
                          <div key={o.id} className="flex items-center gap-2 bg-base-200/60 rounded-lg px-3 py-2">
                            <div className="min-w-0 flex-1">
                              <div className="text-sm truncate">
                                <span className="font-medium">{o.nombre} {o.apellidos}</span>
                              </div>
                              <div className="text-[11px] text-base-content/50 flex items-center gap-1.5">
                                {o.habitacion && (
                                  <span className="badge badge-ghost badge-xs font-mono">
                                    {t('orders.habitacion')} {o.habitacion}
                                  </span>
                                )}
                                {o.cantidad > 1 && (
                                  <span className="font-mono tabular-nums">×{o.cantidad}</span>
                                )}
                                {o.nota && (
                                  <span className="truncate max-w-40 italic">“{o.nota}”</span>
                                )}
                              </div>
                            </div>
                            <span className="text-[10px] text-base-content/30 font-mono shrink-0">
                              {new Date(o.created_at).toLocaleTimeString(i18n.language, { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className={`badge badge-xs shrink-0 ${o.estado === 'servido' ? 'badge-success' : 'badge-warning'}`}>
                              {t('orders.' + o.estado)}
                            </span>
                            <div className="flex shrink-0 gap-1">
                              {puedeGestionar && o.estado !== 'servido' && (
                                <button className="btn btn-xs btn-success btn-soft" onClick={() => setEstado(o, 'servido')}>
                                  {t('orders.serve')}
                                </button>
                              )}
                              {(puedeGestionar || isMyOrder(o)) && o.estado === 'pendiente' && (
                                <button className="btn btn-xs btn-ghost text-red-500" onClick={() => cancelOrder(o)}>
                                  {t('orders.cancel')}
                                </button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}