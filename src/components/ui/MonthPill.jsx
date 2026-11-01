// Compact month control for a page header (docs/redesign §6.2 draws it as
// "October 2026 v"). It keeps useMonthNavigation's prev/next/today
// behaviour rather than introducing a month list, so nothing about month
// selection changes — only its chrome.
export default function MonthPill({ label, onPrev, onNext, onToday, isCurrentMonth }) {
  return (
    <div className="flex items-center gap-0.5 bg-card rounded-[14px] pl-1 pr-1">
      <button
        type="button"
        onClick={onPrev}
        aria-label="Previous month"
        className="w-10 h-11 grid place-items-center text-fg-2 active:opacity-60"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>

      <button
        type="button"
        onClick={onToday}
        disabled={isCurrentMonth}
        aria-label={isCurrentMonth ? label : `${label} — jump to this month`}
        className="h-11 px-1 text-[15px] font-semibold text-fg whitespace-nowrap disabled:opacity-100"
      >
        {label}
      </button>

      <button
        type="button"
        onClick={onNext}
        disabled={isCurrentMonth}
        aria-label="Next month"
        className="w-10 h-11 grid place-items-center text-fg-2 active:opacity-60 disabled:opacity-25"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>
    </div>
  )
}
