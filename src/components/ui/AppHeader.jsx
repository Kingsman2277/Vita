// Two shapes: a plain page title, or the Home greeting with an avatar and a
// caption above it. `right` takes an IconButton or similar.
export default function AppHeader({ title, caption, avatarInitial, right, className = '' }) {
  return (
    <header className={`flex items-start justify-between gap-3 ${className}`}>
      <div className="flex items-center gap-3 min-w-0">
        {avatarInitial && (
          <span
            className="w-[50px] h-[50px] shrink-0 rounded-full grid place-items-center text-xl font-bold text-white"
            style={{ background: 'radial-gradient(circle at 30% 25%, #FF8A55, #B8380F)' }}
            aria-hidden="true"
          >
            {avatarInitial.toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          {caption && (
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{caption}</p>
          )}
          <h1 className="text-[26px] font-bold tracking-[-0.02em] text-fg truncate">{title}</h1>
        </div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  )
}
