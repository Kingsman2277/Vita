import { useMemo } from 'react'

/**
 * Horizontal scrollable day strip for a given month.
 * Shows all days in the month, highlights the selected one,
 * and dots for days that have data.
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

  return (
    <div className="day-picker-wrapper" role="tablist" aria-label="Select day to view">
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
