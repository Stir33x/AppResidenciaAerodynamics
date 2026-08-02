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

const TILE_SIZE = 'w-14 h-14 sm:w-16 sm:h-16'

// ---------------------------------------------------------------------------
// CUADRITO DE HABITACIÓN (render flexible: cada vista decide clases/badge)
// ---------------------------------------------------------------------------
function RoomTile({ number, room, onClick, getTileClass, getBadge, getTitle }) {
  const label = String(number).padStart(2, '0')
  const tileClass = getTileClass ? getTileClass(room, number) : ''
  const badge = getBadge ? getBadge(room, number) : null
  const title = getTitle ? getTitle(room, number) : `Habitación ${label}`

  return (
    <button
      type="button"
      onClick={() => room && onClick && onClick(room, number)}
      disabled={!room}
      title={title}
      className={`relative ${TILE_SIZE} rounded-lg border-2 flex flex-col items-center justify-center
        font-bold text-sm sm:text-base transition-transform shrink-0
        ${tileClass || 'bg-base-200 border-base-300'}
        ${room ? 'hover:scale-105 hover:shadow-md cursor-pointer' : 'cursor-default opacity-60'}`}
    >
      {label}
      {badge}
    </button>
  )
}

function MarkerTile({ type }) {
  const isReception = type === 'reception'
  return (
    <div
      title={isReception ? 'Recepción' : 'Escaleras'}
      className={`${TILE_SIZE} shrink-0 rounded-lg border-2 border-base-300 bg-base-200/70
        flex flex-col items-center justify-center gap-1 text-[9px] font-semibold uppercase opacity-70`}
    >
      {isReception ? <ReceptionIcon /> : <StairsIcon />}
      {isReception ? 'Recep.' : 'Esc.'}
    </div>
  )
}

function Cell({ item, roomsByNumber, onClick, getTileClass, getBadge, getTitle }) {
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
    />
  )
}

function GateBlock({ gate, orientation, rows, roomsByNumber, onClick, getTileClass, getBadge, getTitle }) {
  return (
    <div className="flex flex-col items-center gap-1.5 bg-base-100 border rounded-xl p-3">
      <span className="text-xs font-bold tracking-wide opacity-60 mb-1">GATE {gate}</span>

      {orientation === 'horizontal' ? (
        rows.map((row, i) => (
          <div key={i} className="flex flex-col items-center">
            {i > 0 && (
              <div className="w-full my-1.5 flex items-center gap-2 text-[10px] font-semibold opacity-40">
                <span className="h-px flex-1 bg-current" />
                PASILLO
                <span className="h-px flex-1 bg-current" />
              </div>
            )}
            <div className="flex gap-1.5">
              {row.map((item, j) => (
                <Cell
                  key={j}
                  item={item}
                  roomsByNumber={roomsByNumber}
                  onClick={onClick}
                  getTileClass={getTileClass}
                  getBadge={getBadge}
                  getTitle={getTitle}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="flex items-stretch gap-1.5">
          <div className="flex flex-col gap-1.5">
            {rows.map((pair, i) => (
              <Cell key={i} item={pair[0]} roomsByNumber={roomsByNumber} onClick={onClick} getTileClass={getTileClass} getBadge={getBadge} getTitle={getTitle} />
            ))}
          </div>
          <div className="w-2 rounded bg-success/30 flex items-center justify-center">
            <span
              className="text-[9px] font-semibold opacity-40 whitespace-nowrap"
              style={{ writingMode: 'vertical-rl' }}
            >
              PASILLO
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {rows.map((pair, i) => (
              <Cell key={i} item={pair[1]} roomsByNumber={roomsByNumber} onClick={onClick} getTileClass={getTileClass} getBadge={getBadge} getTitle={getTitle} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// MAPA COMPLETO (recorre el plano y delega el aspecto de cada tile)
// ---------------------------------------------------------------------------
function BuildingCard({ building, roomsByNumber, onClick, getTileClass, getBadge, getTitle }) {
  const vertical = building.vertical
  return (
    <div className="card bg-base-100 border shadow-sm">
      <div className="card-body p-4 gap-4">
        <h2 className="text-lg font-bold">Edificio {building.building}</h2>
        <div className="flex flex-row flex-wrap items-start gap-6">
          {building.floors.map((floor) => (
            <div key={floor.label || floor.gates[0]?.gate || building.building} className="flex flex-col gap-2">
              {floor.label && (
                <span className="text-xs font-semibold uppercase tracking-wide opacity-50">{floor.label}</span>
              )}
              <div className={vertical ? 'flex flex-col items-center gap-4' : 'flex flex-wrap items-start gap-4'}>
                {floor.gates.map((g) => (
                  <GateBlock
                    key={g.gate}
                    gate={g.gate}
                    orientation={g.orientation}
                    rows={g.rows}
                    roomsByNumber={roomsByNumber}
                    onClick={onClick}
                    getTileClass={getTileClass}
                    getBadge={getBadge}
                    getTitle={getTitle}
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

export default function RoomMap(props) {
  const verticalBuildings = FLOOR_PLAN.filter((b) => b.vertical)
  const horizontalBuildings = FLOOR_PLAN.filter((b) => !b.vertical)
  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start">
      <div className="flex flex-col gap-8 shrink-0">
        {verticalBuildings.map((b) => (
          <BuildingCard key={b.building} building={b} {...props} />
        ))}
      </div>
      <div className="flex flex-col gap-8 flex-1 min-w-0">
        {horizontalBuildings.map((b) => (
          <BuildingCard key={b.building} building={b} {...props} />
        ))}
      </div>
    </div>
  )
}
