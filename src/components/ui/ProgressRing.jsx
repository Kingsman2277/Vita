// Arc starts at 12 o'clock and sweeps clockwise. `value` is 0–1.
export default function ProgressRing({
  value = 0,
  size = 86,
  stroke = 8,
  label,
  sub,
  className = '',
}) {
  const clamped = Math.min(1, Math.max(0, value || 0))
  const r = (size - stroke) / 2
  const circumference = 2 * Math.PI * r

  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="var(--color-line)" strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="var(--color-accent)" strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          className="transition-[stroke-dashoffset] duration-500 motion-reduce:transition-none"
        />
      </svg>
      {(label || sub) && (
        <div className="absolute inset-0 grid place-items-center text-center leading-tight">
          <div>
            {label && <p className="text-[17px] font-bold text-fg tabular-nums">{label}</p>}
            {sub && <p className="text-[11px] text-muted">{sub}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
