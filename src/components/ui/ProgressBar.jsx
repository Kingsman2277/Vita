export default function ProgressBar({ value = 0, max = 100, tone = 'accent', className = '' }) {
  const pct = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div
      className={`h-1.5 rounded bg-line overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className={`h-full rounded transition-[width] duration-300 ${tone === 'danger' ? 'bg-danger' : 'bg-accent'}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  )
}
