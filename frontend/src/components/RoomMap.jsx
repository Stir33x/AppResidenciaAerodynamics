import { useState } from 'react'
import { Sparkles, Sun, Circle } from 'lucide-react'

// ---------------------------------------------------------------------------
// PLANO DEL HOTEL (componente compartido: RoomsPage y CleanerView)
// ---------------------------------------------------------------------------
export const FLOOR_PLAN = [
  {
    building: 'T1',
    vertical: true,
    floors: [
      {
        gates: [
          { gate: 'A', orientation: 'horizontal', rows: [[2, 1]] },
          { gate: 'B', orientation: 'vertical', rows: [[14, 13], [12, 11], [10, 9], [8, 7], [6, 5], [4, 3]] },
        ],
      },
      {
        gates: [
          { gate: 'C', orientation: 'horizontal', rows: [[16, 15]] },
          { gate: 'D', orientation: 'vertical', rows: [[18, 17], [20, 19], [22, 21], [24, 23], [26, 25], [28, 27]] },
        ],
      },
    ],
  },
  {
    building: 'T2',
    floors: [
      {
        label: 'Planta Baja',
        gates: [
          {
            gate: 'E',
            orientation: 'horizontal',
            terraceZone: '29, 31, 33 y 35',
            terraceRooms: [29, 31, 33, 35],
            rows: [
              [46, 44, 42, 40, 38, 36, 34, 32, 30, { marker: 'stairs' }],
              [45, 43, 41, 39, 37, 35, 33, 31, 29, { marker: 'reception' }],
            ],
          },
        ],
      },
      {
        label: 'Planta Primera',
        gates: [
          {
            gate: 'F',
            orientation: 'horizontal',
            rows: [
              [64, 62, 60, 58, 56, 54, 52, 50, 48, { marker: 'stairs' }],
              [65, 63, 61, 59, 57, 55, 53, 51, 49, 47],
            ],
          },
        ],
      },
    ],
  },
  {
    building: 'T3',
    floors: [
      {
        label: 'Planta Baja',
        gates: [
          {
            gate: 'G',
            orientation: 'horizontal',
            terraceZone: 'frente a las habs. 66, 68, 70 y 72',
            terraceRooms: [66, 68, 70, 72],
            rows: [
              [67, 69, 71, 73, { marker: 'stairs' }, 74],
              [66, 68, 70, 72, { marker: 'stairs' }],
            ],
          },
        ],
      },
      {
        label: 'Planta Primera',
        gates: [
          {
            gate: 'H',
            orientation: 'horizontal',
            rows: [
              [83, 81, 79, 77, { marker: 'stairs' }, 75],
              [82, 80, 78, 76, { marker: 'stairs' }],
            ],
          },
        ],
      },
    ],
  },
]

// ---------------------------------------------------------------------------
// TIPOS DE HABITACIÓN Y TERRAZAS (verificado contra el plano físico)
// ○ visual -> chispa ámbar (Superior) · sin icono -> Estándar · sol verde -> con terraza
// ---------------------------------------------------------------------------
const SUPERIOR_ROOMS = new Set([
  1, 2, 3, 4, 6, 8, 10, 12, 14, 15, 16, 18, 20, 22, 24, 26, 27, 28,
  30, 32, 34, 36, 38, 40, 42, 44, 46, 48, 50, 52, 54, 56, 58, 60, 62, 64,
  66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83,
])

// Habitaciones con terraza propia (marcada individualmente en el plano).
// Las "zonas" de terraza compartidas (T2-E, T3-G) se muestran aparte via terraceZone.
export const ROOMS_WITH_TERRAZA = new Set([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 29, 31, 33, 35, 74])

export const getRoomType = (n) => (SUPERIOR_ROOMS.has(Number(n)) ? 'superior' : 'estandar')
export const roomHasTerraza = (n) => ROOMS_WITH_TERRAZA.has(Number(n))

export const ROOM_CATEGORY = (n) => {
  const tipo = getRoomType(n)
  const terraza = roomHasTerraza(n)
  if (tipo === 'superior' && terraza) return 'superior_terraza'
  if (tipo === 'superior') return 'superior'
  if (terraza) return 'estandar_terraza'
  return 'estandar'
}

export const ROOM_CATEGORY_LABEL = {
  estandar: 'Estándar',
  estandar_terraza: 'Estándar con terraza',
  superior: 'Superior',
  superior_terraza: 'Superior con terraza',
}

export function WarningIcon({ className = 'w-3.5 h-3.5' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className={className}>
      <path d="M12 2.5c.5 0 .95.27 1.2.7l8.5 15A1.4 1.4 0 0 1 20.5 20.5h-17A1.4 1.4 0 0 1 2.3 18.2l8.5-15c.25-.43.7-.7 1.2-.7Zm0 6.25a.9.9 0 0 0-.9.9v4.2a.9.9 0 1 0 1.8 0v-4.2a.9.9 0 0 0-.9-.9Zm0 8.15a1.05 1.05 0 1 0 0 2.1 1.05 1.05 0 0 0 0-2.1Z" />
    </svg>
  )
}

function StairsIcon({ className = 'w-4 h-4' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 20h4v-4h4v-4h4V8h4V4M4 20V4" />
    </svg>
  )
}

function ReceptionIcon({ className = 'w-4 h-4' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M4 21V9l8-5 8 5v12M9 21v-6h6v6" />
    </svg>
  )
}

const TILE_SIZE = 'w-16 h-16 sm:w-[4.5rem] sm:h-[4.5rem]'

// ---------------------------------------------------------------------------
// CUADRITO DE HABITACIÓN
// El icono de terraza va SIEMPRE en la propia ficha (no solo en la franja
// lateral), así ninguna habitación de esquina se queda sin mostrarla.
// ---------------------------------------------------------------------------
function RoomTile({ number, room, onClick, getTileClass, getBadge, getTitle, filter }) {
  const label = String(number).padStart(2, '0')
  const tileClass = getTileClass ? getTileClass(room, number) : ''
  const badge = getBadge ? getBadge(room, number) : null
  const title = getTitle ? getTitle(room, number) : `Habitación ${label}`

  const superior = getRoomType(number) === 'superior'
  const terraza = roomHasTerraza(number)

  // Filtros combinables: sin selección = todo; Superior/Estándar se eligen entre sí
  // y "Con terraza" se combina con el tipo (p. ej. Superior + Con terraza = superior con terraza).
  const sup = filter?.superior ?? false
  const std = filter?.estandar ?? false
  const ter = filter?.terraza ?? false
  const typeMatch = (!sup && !std) || (sup && superior) || (std && !superior)
  const matches = typeMatch && (!ter || terraza)
  const dimmed = filter ? !matches : false

  return (
    <button
      type="button"
      onClick={() => room && onClick && onClick(room, number)}
      disabled={!room}
      title={`${title} · ${superior ? 'Superior' : 'Estándar'}${terraza ? ' · con terraza' : ''}`}
      className={`group relative ${TILE_SIZE} rounded-2xl border flex flex-col items-center justify-center
        font-semibold text-sm sm:text-base tabular-nums transition-all duration-200 shrink-0
        ${
          tileClass ||
          (superior
            ? 'bg-gradient-to-br from-amber-50 to-white border-amber-200/80 text-stone-800'
            : 'bg-white border-stone-200 text-stone-700')
        }
        ${room ? 'hover:-translate-y-0.5 hover:shadow-md hover:border-stone-300 cursor-pointer' : 'cursor-default opacity-50'}
        ${dimmed ? 'opacity-25 saturate-50' : ''}`}
    >
      {superior && (
        <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-white shadow-sm border border-amber-200 flex items-center justify-center">
          <Sparkles className="w-2.5 h-2.5 text-amber-500" strokeWidth={2.5} />
        </span>
      )}
      {terraza && (
        <span className="absolute -bottom-1.5 -left-1.5 w-5 h-5 rounded-full bg-white shadow-sm border border-orange-200 flex items-center justify-center">
          <Sun className="w-2.5 h-2.5 text-orange-500" strokeWidth={2.5} />
        </span>
      )}
      {label}
      <span className="text-[9px] font-normal uppercase tracking-wide opacity-40 leading-none mt-0.5">
        {superior ? 'Superior' : 'Estándar'}
      </span>
      {badge}
    </button>
  )
}

// Franja acompañante para habitaciones con terraza en gates verticales
// (se añade al lado exacto de la ficha, además del icono en la propia ficha).
function TerraceFlap({ side = 'left' }) {
  return (
    <div
      title="Con terraza"
      className={`w-5 sm:w-6 self-stretch shrink-0 flex items-center justify-center
        bg-gradient-to-b from-orange-50 to-orange-100/70 border border-orange-200/80
        ${side === 'left' ? 'rounded-l-xl' : 'rounded-r-xl'}`}
    >
      <Sun className="w-3.5 h-3.5 text-orange-500/70" strokeWidth={2} />
    </div>
  )
}

function MarkerTile({ type }) {
  const isReception = type === 'reception'
  return (
    <div
      title={isReception ? 'Recepción' : 'Escaleras'}
      className={`${TILE_SIZE} shrink-0 rounded-2xl border border-dashed border-stone-200 bg-stone-50/60
        flex flex-col items-center justify-center gap-1 text-[9px] font-medium uppercase tracking-wide text-stone-400`}
    >
      {isReception ? <ReceptionIcon /> : <StairsIcon />}
      {isReception ? 'Recep.' : 'Esc.'}
    </div>
  )
}

function Cell({ item, roomsByNumber, onClick, getTileClass, getBadge, getTitle, filter }) {
  if (item && typeof item === 'object' && item.marker) {
    return <MarkerTile type={item.marker} />
  }
  return (
    <RoomTile
      number={item}
      room={roomsByNumber[item]}
      onClick={onClick}
      getTileClass={getTileClass}
      getBadge={getBadge}
      getTitle={getTitle}
      filter={filter}
    />
  )
}

// Devuelve el primer/último número de habitación de una fila, ignorando
// marcadores (escaleras/recepción), para saber a qué lado va la franja.
function edgeRoomNumbers(row) {
  const nums = row.filter((it) => typeof it === 'number')
  return { first: nums[0], last: nums[nums.length - 1] }
}

function GateBlock({ gate, orientation, rows, terraceZone, terraceRooms, roomsByNumber, onClick, getTileClass, getBadge, getTitle, filter }) {
  return (
    <div className="flex flex-col items-center gap-2 bg-white/60 border border-stone-200 rounded-2xl p-4 shadow-sm">
      <span className="text-[11px] font-bold tracking-[0.15em] text-stone-400 uppercase">Gate {gate}</span>

      {orientation === 'horizontal' ? (
        <>
          {rows.map((row, i) => {
            const { first, last } = edgeRoomNumbers(row)
            const flapLeft = roomHasTerraza(first)
            const flapRight = roomHasTerraza(last)
            const terrIdx = row
              .map((item, j) => (typeof item === 'number' && terraceRooms?.includes(item) ? j : -1))
              .filter((j) => j >= 0)
            const hasTerr = terrIdx.length > 0
            const firstTerr = hasTerr ? terrIdx[0] : -1
            const lastTerr = hasTerr ? terrIdx[terrIdx.length - 1] : -1
            return (
              <div key={i} className="flex flex-col items-center w-full">
                {i > 0 && (
                  <div className="w-full my-2 flex items-center gap-2 text-[9px] font-semibold tracking-widest text-emerald-700/50 uppercase">
                    <span className="h-px flex-1 bg-emerald-700/15" />
                    Pasillo
                    <span className="h-px flex-1 bg-emerald-700/15" />
                  </div>
                )}
                <div className="flex items-stretch gap-1.5">
                  {flapLeft && <TerraceFlap side="left" />}
                  {row.map((item, j) => (
                    <Cell
                      key={j}
                      item={item}
                      roomsByNumber={roomsByNumber}
                      onClick={onClick}
                      getTileClass={getTileClass}
                      getBadge={getBadge}
                      getTitle={getTitle}
                      filter={filter}
                    />
                  ))}
                  {flapRight && <TerraceFlap side="right" />}
                </div>
                {hasTerr && (
                  <div className="w-full flex items-center gap-1.5 mt-2">
                    {row.slice(0, firstTerr).map((item, j) => (
                      <div key={`pre${j}`} className={TILE_SIZE} />
                    ))}
                    <div
                      title={`Zona con terraza${terraceZone ? ` · ${terraceZone}` : ''}`}
                      className="flex-1 h-11 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-50 to-orange-100/70 border border-orange-200/70 px-3"
                    >
                      <Sun className="w-3.5 h-3.5 text-orange-500 shrink-0" strokeWidth={2} />
                      <span className="text-[10px] font-medium text-orange-800/70 text-center leading-snug">
                        Zona con terraza{terraceZone ? ` · ${terraceZone}` : ''}
                      </span>
                    </div>
                    {row.slice(lastTerr + 1).map((item, j) => (
                      <div key={`post${j}`} className={TILE_SIZE} />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
          {terraceZone && !rows.some((row) => row.some((item) => typeof item === 'number' && terraceRooms?.includes(item))) && (
            <div className="w-full mt-2 rounded-xl bg-gradient-to-r from-orange-50 to-orange-100/60 border border-orange-200/70 flex items-center justify-center gap-2 py-2 px-3">
              <Sun className="w-3.5 h-3.5 text-orange-500 shrink-0" strokeWidth={2} />
              <span className="text-[10px] font-medium text-orange-800/70 text-center leading-snug">
                Zona con terraza · {terraceZone}
              </span>
            </div>
          )}
        </>
      ) : (
        <div className="flex items-stretch gap-1.5">
          <div className="flex flex-col gap-1.5">
            {rows.map((pair, i) => (
              <div key={i} className="flex items-stretch gap-1.5">
                {roomHasTerraza(pair[0]) && <TerraceFlap side="left" />}
                <Cell key={`l${i}`} item={pair[0]} roomsByNumber={roomsByNumber} onClick={onClick} getTileClass={getTileClass} getBadge={getBadge} getTitle={getTitle} filter={filter} />
              </div>
            ))}
          </div>
          <div className="w-2 rounded-full bg-gradient-to-b from-emerald-600/25 to-emerald-700/15 flex items-center justify-center">
            <span
              className="text-[8px] font-semibold tracking-widest text-emerald-800/40 whitespace-nowrap uppercase"
              style={{ writingMode: 'vertical-rl' }}
            >
              Pasillo
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {rows.map((pair, i) => (
              <div key={i} className="flex items-stretch gap-1.5">
                <Cell key={`r${i}`} item={pair[1]} roomsByNumber={roomsByNumber} onClick={onClick} getTileClass={getTileClass} getBadge={getBadge} getTitle={getTitle} filter={filter} />
                {roomHasTerraza(pair[1]) && <TerraceFlap side="right" />}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// MAPA COMPLETO
// ---------------------------------------------------------------------------
function BuildingCard({ building, roomsByNumber, onClick, getTileClass, getBadge, getTitle, filter }) {
  const vertical = building.vertical
  return (
    <div className="rounded-3xl border border-stone-200 bg-stone-50/50 shadow-sm overflow-hidden">
      <div className="p-5 flex flex-col gap-5">
        <h2 className="text-lg font-bold text-stone-800 tracking-tight">Edificio {building.building}</h2>
        <div className="flex flex-row flex-wrap items-start gap-6">
          {building.floors.map((floor) => (
            <div key={floor.label || floor.gates[0]?.gate || building.building} className="flex flex-col gap-2.5">
              {floor.label && (
                <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-stone-400">{floor.label}</span>
              )}
              <div className={vertical ? 'flex flex-col items-center gap-4' : 'flex flex-wrap items-start gap-4'}>
                {floor.gates.map((g) => (
                  <GateBlock
                    key={g.gate}
                    gate={g.gate}
                    orientation={g.orientation}
                    rows={g.rows}
                    terraceZone={g.terraceZone}
                    terraceRooms={g.terraceRooms}
                    roomsByNumber={roomsByNumber}
                    onClick={onClick}
                    getTileClass={getTileClass}
                    getBadge={getBadge}
                    getTitle={getTitle}
                    filter={filter}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

const FILTER_OPTIONS = [
  { key: 'superior', label: 'Superior', tone: 'amber', icon: <Sparkles className="w-3.5 h-3.5" strokeWidth={2.5} /> },
  { key: 'estandar', label: 'Estándar', tone: 'stone', icon: <Circle className="w-3.5 h-3.5" strokeWidth={2.5} /> },
  { key: 'terraza', label: 'Con terraza', tone: 'orange', icon: <Sun className="w-3.5 h-3.5" strokeWidth={2.5} /> },
]

function FilterChip({ active, icon, label, onClick, tone }) {
  const toneClass =
    tone === 'amber'
      ? 'border-amber-300 bg-amber-50 text-amber-500'
      : tone === 'orange'
      ? 'border-orange-300 bg-orange-50 text-orange-500'
      : 'border-stone-300 bg-stone-100 text-stone-500'
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all
        ${active ? toneClass : 'border-stone-200 bg-white'}`}
    >
      <span className={active ? 'text-inherit' : 'text-stone-400'}>{icon}</span>
      <span className="text-stone-700">{label}</span>
      {active && <span className="font-bold leading-none">✓</span>}
    </button>
  )
}

export default function RoomMap({ roomsByNumber = {}, ...props }) {
  // Sin selección = mostrar todo. Los chips se combinan: p. ej. Superior + Con terraza.
  const [filter, setFilter] = useState({ superior: false, estandar: false, terraza: false })
  const toggleFilter = (key) => setFilter((f) => ({ ...f, [key]: !f[key] }))

  const verticalBuildings = FLOOR_PLAN.filter((b) => b.vertical)
  const horizontalBuildings = FLOOR_PLAN.filter((b) => !b.vertical)

  return (
    <div className="flex flex-col gap-6 bg-gradient-to-b from-stone-50 to-white p-4 sm:p-6 rounded-3xl">
      {/* Filtro por tipo de habitación: sin selección = todas; combina Superior/Estándar con Con terraza */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-stone-400 mr-1">Filtrar</span>
        {FILTER_OPTIONS.map((opt) => (
          <FilterChip
            key={opt.key}
            active={filter[opt.key]}
            tone={opt.tone}
            icon={opt.icon}
            label={opt.label}
            onClick={() => toggleFilter(opt.key)}
          />
        ))}
      </div>

      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex flex-col gap-6 shrink-0">
          {verticalBuildings.map((b) => (
            <BuildingCard key={b.building} building={b} filter={filter} roomsByNumber={roomsByNumber} {...props} />
          ))}
        </div>
        <div className="flex flex-col gap-6 flex-1 min-w-0">
          {horizontalBuildings.map((b) => (
            <BuildingCard key={b.building} building={b} filter={filter} roomsByNumber={roomsByNumber} {...props} />
          ))}
        </div>
      </div>
    </div>
  )
}
