import { useState, useCallback, useMemo } from 'react'
import { formatMonthLabel } from '../lib/dateFilters'

export function useMonthNavigation() {
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth()

  const [selectedMonth, setSelectedMonth] = useState({
    year: currentYear,
    month: currentMonth,
  })

  const goToPrev = useCallback(() => {
    setSelectedMonth(prev => {
      if (prev.month === 0) return { year: prev.year - 1, month: 11 }
      return { year: prev.year, month: prev.month - 1 }
    })
  }, [])

  const goToNext = useCallback(() => {
    setSelectedMonth(prev => {
      // Don't go past current month
      if (prev.year === currentYear && prev.month === currentMonth) return prev
      if (prev.month === 11) return { year: prev.year + 1, month: 0 }
      return { year: prev.year, month: prev.month + 1 }
    })
  }, [currentYear, currentMonth])

  const goToCurrentMonth = useCallback(() => {
    setSelectedMonth({ year: currentYear, month: currentMonth })
  }, [currentYear, currentMonth])

  const isCurrentMonth = selectedMonth.year === currentYear && selectedMonth.month === currentMonth

  const label = useMemo(
    () => formatMonthLabel(selectedMonth.year, selectedMonth.month),
    [selectedMonth.year, selectedMonth.month]
  )

  return {
    selectedMonth,
    goToPrev,
    goToNext,
    goToCurrentMonth,
    isCurrentMonth,
    label,
  }
}
