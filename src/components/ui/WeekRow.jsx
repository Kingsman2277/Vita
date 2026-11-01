// One 42px circle per day. States come from the caller (workout logs), not
// from this component — it only knows how to draw them.
//   done   white circle + dark check
//   missed card + cross + grey ring
//   rest   card + en dash
//   today  card + white progress arc, dot under the label
//   future card
const CIRCLE = 42

function Arc({ progress }) {
  const r = (CIRCLE - 3) / 2
  const c = 2 * Math.PI * r
  return (
    <svg width={CIRCLE} height={CIRCLE} className="absolute inset-0 -rotate-90" aria-hidden="true">
      <circle
        cx={CIRCLE / 2} cy={CIRCLE / 2} r={r}
        fill="none" stroke="#FFFFFF" strokeWidth={3} strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(1, Math.max(0, progress || 0)))}
      />
    </svg>
  )
}

export default function WeekRow({ days = [], onSelect, className = '' }) {
  return (
    <div className={`flex justify-between ${className}`}>
      {days.map(day => {
        const { date, label, state, progress } = day
        const done = state === 'done'
        return (
          <button
            key={date}
            type="button"
            onClick={() => onSelect?.(day)}
            className="flex flex-col items-center gap-1.5"
            aria-label={`${label} ${date} — ${state}`}
          >
            <span
              className={`relative grid place-items-center rounded-full text-sm font-semibold ${
                done ? 'bg-white-btn text-bg' : 'bg-card text-fg-2'
              } ${state === 'missed' ? 'ring-[1.5px] ring-[#3A3A3F]' : ''}`}
              style={{ width: CIRCLE, height: CIRCLE }}
            >
              {state === 'today' && <Arc progress={progress} />}
              {done ? '✓' : state === 'missed' ? '✕' : state === 'rest' ? '–' : new Date(`${date}T00:00:00`).getDate()}
            </span>
            <span className="text-[11px] text-muted">{label}</span>
            {state === 'today' && <span className="w-1 h-1 rounded-full bg-accent" />}
          </button>
        )
      })}
    </div>
  )
}
