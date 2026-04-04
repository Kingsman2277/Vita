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
      }
    })
  }, [year, month])

  const today = new Date()
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month
  const todayDay = today.getDate()

  return (
    <div className="day-picker-wrapper">
      {/* "All" button to show all days */}
      <button
        onClick={() => onSelectDay(null)}
        className={`day-picker-item ${selectedDay === null ? 'active' : ''}`}
      >
        <span className="day-picker-weekday">All</span>
        <span className="day-picker-num" style={{ fontSize: 11 }}>days</span>
      </button>

      <div className="day-picker-divider" />

      {days.map(({ day, label }) => {
        const isSelected = selectedDay === day
        const isToday = isCurrentMonth && day === todayDay
        const hasData = daysWithData.has(day)

        return (
          <button
            key={day}
            onClick={() => onSelectDay(day)}
            className={`day-picker-item ${isSelected ? 'active' : ''} ${isToday && !isSelected ? 'today' : ''}`}
          >
            <span className="day-picker-weekday">{label}</span>
            <span className="day-picker-num">{day}</span>
            {hasData && !isSelected && <span className="day-picker-dot" />}
          </button>
        )
      })}
    </div>
  )
}
