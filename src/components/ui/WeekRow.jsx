// One column per day: date number above, state circle, weekday letter
// below, and a dot under today (docs/redesign mockups/d1-home.png).
//
// States are decided by the caller from workout logs, not here:
//   done   white circle + dark check
//   missed card circle + cross + grey ring
//   rest   card circle + en dash
//   today  card circle + white progress arc
//   future empty card circle
const CIRCLE = 42
const STROKE = 3

function Arc({ progress }) {
  const r = (CIRCLE - STROKE) / 2
  const c = 2 * Math.PI * r
  return (
    <svg width={CIRCLE} height={CIRCLE} className="absolute inset-0 -rotate-90" aria-hidden="true">
      <circle
        cx={CIRCLE / 2} cy={CIRCLE / 2} r={r}
        fill="none" stroke="#FFFFFF" strokeWidth={STROKE} strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(1, Math.max(0, progress || 0)))}
      />
    </svg>
  )
}

const GLYPH = { done: '✓', missed: '✕', rest: '–' }

export default function WeekRow({ days = [], onSelect, className = '' }) {
  return (
    <div className={`flex justify-between ${className}`}>
      {days.map(day => {
        const { date, label, state, progress, isToday } = day
        const done = state === 'done'
        // A rest day can still be today — the arc follows state, the
        // emphasis follows isToday.
        const today = isToday ?? state === 'today'
        const dayNumber = Number(date.slice(8, 10))

        return (
          <button
            key={date}
            type="button"
            onClick={onSelect ? () => onSelect(day) : undefined}
            className="flex flex-col items-center gap-1.5"
            aria-label={`${label} ${dayNumber} — ${state}`}
          >
            <span className={`text-[13px] font-semibold tabular-nums ${today ? 'text-fg' : 'text-muted'}`}>
              {dayNumber}
            </span>

            <span
              className={`relative grid place-items-center rounded-full text-base font-bold ${
                done ? 'bg-white-btn text-bg' : 'bg-card text-muted'
              } ${state === 'missed' || state === 'rest' ? 'ring-[1.5px] ring-[#3A3A3F]' : ''}`}
              style={{ width: CIRCLE, height: CIRCLE }}
            >
              {state === 'today' && <Arc progress={progress} />}
              {GLYPH[state] || ''}
            </span>

            <span className={`text-[13px] font-semibold ${today ? 'text-fg' : 'text-muted'}`}>{label}</span>
            {/* Reserve the dot's row on every column so the circles stay
                on one baseline whether or not today is in view. */}
            <span className={`w-1 h-1 rounded-full ${today ? 'bg-accent' : 'bg-transparent'}`} aria-hidden="true" />
          </button>
        )
      })}
    </div>
  )
}
