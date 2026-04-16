import { useMemo, useRef, useEffect } from 'react'

/**
 * Horizontal scrollable day strip for a given month.
 * Shows all days in the month, highlights the selected one,
 * and dots for days that have data. Auto-scrolls so the selected
 * day (or today, when viewing the whole month) is always in view.
 */
export default function DayPicker({ year, month, selectedDay, onSelectDay, daysWithData = new Set() }) {
  const days = useMemo(() => {
    const count = new Date(year, month + 1, 0).getDate()
    return Array.from({ length: count }, (_, i) => {
      const d = new Date(year, month, i + 1)
      return {
        day: i + 1,
        label: d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0),
        weekday: d.toLocaleDateString('en-US', { weekday: 'short' }),
        fullLabel: d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
      }
    })
  }, [year, month])

  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month
  const todayDay = today.getDate()

  // Keep the relevant day in view. Prefers the explicitly selected day;
  // otherwise (whole-month view) centers on today when we're in the
  // current month, or on day 1 when viewing a historical month.
  const wrapperRef = useRef(null)
  const itemRefs = useRef({})
  useEffect(() => {
    const targetDay = selectedDay ?? (isCurrentMonth ? todayDay : 1)
    const el = itemRefs.current[targetDay]
    const wrapper = wrapperRef.current
    if (!el || !wrapper) return
    // scrollIntoView({inline:'center'}) scrolls the PAGE too on iOS —
    // do a manual horizontal scroll on the wrapper only.
    const elCenter = el.offsetLeft + el.offsetWidth / 2
    const targetScroll = elCenter - wrapper.clientWidth / 2
    wrapper.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' })
  }, [selectedDay, year, month, isCurrentMonth, todayDay])

  return (
    <div ref={wrapperRef} className="day-picker-wrapper" role="tablist" aria-label="Select day to view">
      {/* "All" button to show all days */}
      <button
        type="button"
        onClick={() => onSelectDay(null)}
        className={`day-picker-item ${selectedDay === null ? 'active' : ''}`}
        role="tab"
        aria-selected={selectedDay === null}
        aria-label="Show all days in this month"
      >
        <span className="day-picker-weekday">All</span>
        <span className="day-picker-num" style={{ fontSize: 11 }}>days</span>
      </button>

      <div className="day-picker-divider" aria-hidden="true" />

      {days.map(({ day, label, fullLabel }) => {
        const isSelected = selectedDay === day
        const isToday = isCurrentMonth && day === todayDay
        const hasData = daysWithData.has(day)
        const ariaLabel = `${fullLabel}${isToday ? ', today' : ''}${hasData ? ', has entries' : ''}`

        return (
          <button
            key={day}
            ref={el => {
              if (el) itemRefs.current[day] = el
              else delete itemRefs.current[day]
            }}
            type="button"
            onClick={() => onSelectDay(day)}
            className={`day-picker-item ${isSelected ? 'active' : ''} ${isToday && !isSelected ? 'today' : ''}`}
            role="tab"
            aria-selected={isSelected}
            aria-label={ariaLabel}
          >
            <span className="day-picker-weekday" aria-hidden="true">{label}</span>
            <span className="day-picker-num" aria-hidden="true">{day}</span>
            {hasData && !isSelected && <span className="day-picker-dot" aria-hidden="true" />}
          </button>
        )
      })}
    </div>
  )
}
