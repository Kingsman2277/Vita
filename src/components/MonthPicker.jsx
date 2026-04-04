export default function MonthPicker({ label, onPrev, onNext, onToday, isCurrentMonth }) {
  return (
    <div className="month-picker">
      <button onClick={onPrev} className="month-picker-btn" aria-label="Previous month">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <span className="month-picker-label">{label}</span>

      <button
        onClick={onNext}
        className="month-picker-btn"
        disabled={isCurrentMonth}
        aria-label="Next month"
        style={{ opacity: isCurrentMonth ? 0.25 : 1 }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      {!isCurrentMonth && (
        <button onClick={onToday} className="month-picker-today">
          Today
        </button>
      )}
    </div>
  )
}
