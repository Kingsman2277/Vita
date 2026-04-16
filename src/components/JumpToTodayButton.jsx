/**
 * Small pill that appears when the user is viewing any day other than
 * today. One tap snaps the month + day selection back to the current
 * date so they can add a new entry without manually navigating.
 *
 * Rendered as a no-op (null) when the user is already on today, so
 * it's safe to drop in unconditionally.
 */
export default function JumpToTodayButton({ isCurrentMonth, selectedDay, onJump, label = 'Jump to today' }) {
  const todayDay = new Date().getDate()
  const onToday = isCurrentMonth && selectedDay === todayDay
  if (onToday) return null

  return (
    <div className="flex" style={{ marginTop: -4, marginBottom: 4 }}>
      <button
        type="button"
        onClick={onJump}
        className="flex items-center transition-colors"
        aria-label={label}
        style={{
          gap: 6,
          padding: '6px 12px',
          borderRadius: 999,
          border: '1px solid var(--border)',
          background: 'var(--card)',
          color: 'var(--foreground)',
          cursor: 'pointer',
          fontFamily: 'inherit',
          fontSize: 12,
          fontWeight: 500,
          lineHeight: 1,
        }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 5v14" />
          <path d="M19 12l-7 7-7-7" />
        </svg>
        Today
      </button>
    </div>
  )
}
