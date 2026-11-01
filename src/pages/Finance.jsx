import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import Card from '../components/Card'
import DayPicker from '../components/DayPicker'
import SkeletonLoader from '../components/SkeletonLoader'
import JumpToTodayButton from '../components/JumpToTodayButton'
import {
  AppHeader, AreaChart, BottomSheet as Modal, Button, EmptyState, ListRow,
  MonthPill, ProgressBar, SectionHeader, Skeleton, TagPill,
} from '../components/ui'
import { useExpenses } from '../hooks/useExpenses'
import { useBudget } from '../hooks/useBudget'
import { useMonthNavigation } from '../hooks/useMonthNavigation'
import { filterByMonth, filterByDay, getDaysWithData } from '../lib/dateFilters'
import { isDiscretionary, reconcileTotals } from '../lib/financeReconciliation'
import {
  formatCurrency, formatDate, getToday,
  BUDGET_ALLOCATIONS, EXPENSE_CATEGORIES, getCategoryEmoji,
} from '../lib/helpers'

function categoryLabel(value) {
  return EXPENSE_CATEGORIES.find(c => c.value === value)?.label || value
}

function CategoryPill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`shrink-0 whitespace-nowrap h-11 px-4 rounded-[14px] text-sm font-semibold transition-colors ${
        active ? 'bg-white-btn text-bg' : 'bg-card text-fg-2'
      }`}
    >
      {children}
    </button>
  )
}

export default function Finance() {
  const navigate = useNavigate()
  const { expenses, loading, addExpense, updateExpense, deleteExpense } = useExpenses()
  const { discretionary } = useBudget()
  const { selectedMonth, goToPrev, goToNext, goToCurrentMonth, isCurrentMonth, label } = useMonthNavigation()
  const [showAll, setShowAll] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [drillCategory, setDrillCategory] = useState(null)
  const [editingExpense, setEditingExpense] = useState(null)
  const [filter, setFilter] = useState('all')
  const [selectedDay, setSelectedDay] = useState(new Date().getDate())
  const [form, setForm] = useState({ amount: '', category: 'groceries', note: '', date: getToday(), is_recurring: false })
  const [editForm, setEditForm] = useState({ amount: '', category: 'groceries', note: '', date: '', is_recurring: false })

  // Three-step filter: month → day → category (memoized)
  const monthExpenses = useMemo(
    () => filterByMonth(expenses, selectedMonth.year, selectedMonth.month, 'date'),
    [expenses, selectedMonth.year, selectedMonth.month]
  )
  const dayExpenses = useMemo(
    () => filterByDay(monthExpenses, selectedDay, 'date'),
    [monthExpenses, selectedDay]
  )
  const filtered = useMemo(
    () => filter === 'all' ? dayExpenses : dayExpenses.filter(e => e.category === filter),
    [dayExpenses, filter]
  )
  const monthTotal = useMemo(
    () => monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
    [monthExpenses]
  )
  const dayTotal = useMemo(
    () => dayExpenses.reduce((sum, e) => sum + Number(e.amount), 0),
    [dayExpenses]
  )
  const expDaysWithData = useMemo(
    () => getDaysWithData(monthExpenses, 'date'),
    [monthExpenses]
  )

  // Cumulative discretionary spend, one point per elapsed day. Reuses the
  // same isDiscretionary predicate as the Budget tiles so the curve and
  // the tiles can never tell different stories.
  // Discretionary-only month total. `monthTotal` above counts every row
  // (including work-reimbursable ones) and still drives the list header;
  // the budget maths has always been discretionary-only, and Home and the
  // Budget screen both report this figure.
  const monthDiscretionary = useMemo(
    () => monthExpenses.filter(isDiscretionary).reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [monthExpenses]
  )

  const spendSeries = useMemo(() => {
    const dayCount = new Date(selectedMonth.year, selectedMonth.month + 1, 0).getDate()
    const perDay = new Array(dayCount + 1).fill(0)
    for (const e of monthExpenses) {
      if (!isDiscretionary(e)) continue
      const day = Number(String(e.date).slice(8, 10))
      if (day >= 1 && day <= dayCount) perDay[day] += Number(e.amount || 0)
    }
    const monthShort = new Date(selectedMonth.year, selectedMonth.month, 1)
      .toLocaleDateString('en-CA', { month: 'short' })
    // Stop at today in the current month — a flat line to month end would
    // read as "spent nothing for a week".
    const lastDay = isCurrentMonth ? new Date().getDate() : dayCount
    const out = []
    let running = 0
    for (let day = 1; day <= lastDay; day++) {
      running += perDay[day]
      out.push({ d: `${monthShort} ${day}`, total: Math.round(running * 100) / 100 })
    }
    return out
  }, [monthExpenses, selectedMonth.year, selectedMonth.month, isCurrentMonth])

  // Per-category spend for the Budgets card, from the same reconciliation
  // helper the Budget screen uses — integer-cent math, legacy category
  // names folded in.
  const topBudgets = useMemo(() => {
    const byCategory = reconcileTotals(monthExpenses.filter(isDiscretionary), { source: 'Finance.Budgets' }).byCategory
    return BUDGET_ALLOCATIONS
      .map(({ category, label: name, percent }) => {
        const allocated = discretionary * (percent / 100)
        const spent = byCategory[category] || 0
        return { category, name, allocated, spent, used: allocated > 0 ? spent / allocated : 0 }
      })
      .sort((a, b) => b.used - a.used)
      .slice(0, 3)
  }, [monthExpenses, discretionary])

  // The default list is the month's latest few; "View all" reveals the
  // day picker and the full filtered list.
  const recent = useMemo(() => {
    const scoped = filter === 'all' ? monthExpenses : monthExpenses.filter(e => e.category === filter)
    return [...scoped].sort((a, b) => String(b.date).localeCompare(String(a.date))).slice(0, 5)
  }, [monthExpenses, filter])

  const visible = showAll ? filtered : recent

  // Reset day when month changes
  const monthKey = `${selectedMonth.year}-${selectedMonth.month}`
  const [prevMonthKey, setPrevMonthKey] = useState(monthKey)
  if (monthKey !== prevMonthKey) { setPrevMonthKey(monthKey); setSelectedDay(null) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const amt = Number(form.amount)
    if (!form.amount || Number.isNaN(amt) || amt <= 0) {
      toast.error('Enter an amount')
      return
    }
    try {
      await addExpense({ amount: amt, category: form.category, note: form.note || null, date: form.date, is_recurring: form.is_recurring })
      toast.success('Expense added!')
      setModalOpen(false)
      setForm({ amount: '', category: 'groceries', note: '', date: getToday(), is_recurring: false })
    } catch (err) {
      console.error('addExpense error:', err)
      toast.error(err?.message || 'Failed to save')
    }
  }

  const openEditExpense = (exp) => {
    setEditingExpense(exp)
    setEditForm({
      amount: String(exp.amount),
      category: exp.category || 'food',
      note: exp.note || '',
      date: exp.date,
      is_recurring: exp.is_recurring || false,
    })
    setEditModalOpen(true)
  }

  const handleEditExpense = async (e) => {
    e.preventDefault()
    if (!editingExpense) return
    const amt = Number(editForm.amount)
    if (!editForm.amount || Number.isNaN(amt) || amt <= 0) {
      toast.error('Enter an amount')
      return
    }
    try {
      await updateExpense(editingExpense.id, {
        amount: amt,
        category: editForm.category,
        note: editForm.note || null,
        date: editForm.date,
        is_recurring: editForm.is_recurring,
      })
      toast.success('Updated!')
      setEditModalOpen(false)
      setEditingExpense(null)
    } catch (err) {
      console.error('updateExpense error:', err)
      toast.error(err?.message || 'Failed to save')
    }
  }

  const handleDeleteFromEdit = async () => {
    if (!editingExpense) return
    try {
      await deleteExpense(editingExpense.id)
      toast.success('Deleted!')
      setEditModalOpen(false)
      setEditingExpense(null)
    } catch (err) {
      console.error('deleteExpense error:', err)
      toast.error(err?.message || 'Failed to delete')
    }
  }

  const openAdd = () => {
    setForm({ amount: '', category: 'groceries', note: '', date: getToday(), is_recurring: false })
    setModalOpen(true)
  }

  return (
    <div
      className="mx-auto w-full max-w-[640px] px-4 pb-6 flex flex-col gap-4"
      style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 12px)' }}
    >
      <AppHeader
        title="Money"
        right={
          <MonthPill
            label={label}
            isCurrentMonth={isCurrentMonth}
            onPrev={() => { goToPrev(); setSelectedDay(null) }}
            onNext={() => { goToNext(); setSelectedDay(null) }}
            onToday={() => { goToCurrentMonth(); setSelectedDay(new Date().getDate()) }}
          />
        }
      />

      {/* Spend card */}
      <Card>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[13px] text-muted">Spent this month</p>
            <p className="text-[30px] font-bold tracking-[-0.02em] text-fg tabular-nums leading-tight">
              {formatCurrency(monthDiscretionary)}
            </p>
          </div>
          {discretionary > 0 && (
            <div className="text-right shrink-0">
              <p className="text-[13px] text-muted">Discretionary left</p>
              <p className="text-[17px] font-bold text-fg tabular-nums">
                {formatCurrency(discretionary - monthDiscretionary)}
              </p>
            </div>
          )}
        </div>

        {spendSeries.length > 0 && (
          <AreaChart
            data={spendSeries}
            xKey="d"
            yKey="total"
            showYAxis={false}
            height={150}
            refLine={discretionary > 0 ? { y: discretionary, label: `Budget ${formatCurrency(discretionary)}` } : undefined}
            className="mt-3"
          />
        )}
      </Card>

      {/* Category filter — scrolls horizontally and bleeds off the right
          edge on purpose; pills must never wrap or shrink. */}
      <div className="flex overflow-x-auto scrollbar-none -mx-4 px-4" style={{ gap: 8 }}>
        <CategoryPill active={filter === 'all'} onClick={() => setFilter('all')}>All</CategoryPill>
        {EXPENSE_CATEGORIES.map(c => (
          <CategoryPill key={c.value} active={filter === c.value} onClick={() => setFilter(c.value)}>
            {c.emoji} {c.label}
          </CategoryPill>
        ))}
      </div>

      {/* Budgets */}
      {discretionary > 0 && (
        <Card>
          <SectionHeader title="Budgets" action={{ label: 'View all', onClick: () => navigate('/money/budget') }} />
          <div className="flex flex-col gap-3.5 mt-3">
            {topBudgets.map(b => {
              const over = b.spent > b.allocated
              return (
                <div key={b.category}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <p className="text-[15px] font-semibold text-fg truncate">{b.name}</p>
                      {over && <TagPill>Over {formatCurrency(b.spent - b.allocated)}</TagPill>}
                    </div>
                    <p className="text-[15px] shrink-0 tabular-nums">
                      <span className="font-bold text-fg">{formatCurrency(b.spent)}</span>
                      <span className="text-muted"> / {formatCurrency(b.allocated)}</span>
                    </p>
                  </div>
                  <ProgressBar
                    value={b.spent}
                    max={b.allocated || 1}
                    tone={over ? 'danger' : 'accent'}
                    className="mt-2"
                  />
                </div>
              )
            })}
          </div>
        </Card>
      )}

      {/* Recent */}
      <SectionHeader
        title="Recent"
        action={{ label: showAll ? 'Show less' : 'View all', onClick: () => setShowAll(v => !v) }}
      />

      {showAll && (
        <>
          <DayPicker
            year={selectedMonth.year}
            month={selectedMonth.month}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            daysWithData={expDaysWithData}
          />
          <JumpToTodayButton
            isCurrentMonth={isCurrentMonth}
            selectedDay={selectedDay}
            onJump={() => { goToCurrentMonth(); setSelectedDay(new Date().getDate()) }}
          />
        </>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3].map(i => <Skeleton key={i} height={56} radius={14} />)}
        </div>
      ) : visible.length === 0 ? (
        <EmptyState
          icon="💰"
          title={isCurrentMonth ? 'No expenses yet' : `No expenses in ${label}`}
          desc={isCurrentMonth
            ? 'Start tracking your spending to see where your money goes.'
            : 'Try navigating to a different month.'}
          action={isCurrentMonth ? <Button size="md" onClick={openAdd}>Add your first expense</Button> : null}
        />
      ) : (
        <Card padding="sm">
          {visible.map(exp => (
            <ListRow
              key={exp.id}
              icon={getCategoryEmoji(exp.category)}
              title={exp.note || categoryLabel(exp.category)}
              meta={
                <>
                  <TagPill>{categoryLabel(exp.category)}</TagPill>
                  {/* `is_recurring` is the column name; it means work
                      reimbursable, not a repeating expense. */}
                  {exp.is_recurring && <TagPill tone="neutral">Reimbursable</TagPill>}
                  <span>{formatDate(exp.date)}</span>
                </>
              }
              amount={`\u2212${formatCurrency(exp.amount)}`}
              onClick={() => openEditExpense(exp)}
            />
          ))}
        </Card>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Expense">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Amount</label>
            <input placeholder="0.00" type="number" inputMode="decimal" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="form-input text-2xl font-bold text-center" required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {EXPENSE_CATEGORIES.map(c => (
                <button key={c.value} type="button" onClick={() => setForm(f => ({ ...f, category: c.value }))}
                  className={`p-3 rounded-lg border text-center transition-all duration-200 ${form.category === c.value ? 'border-primary bg-secondary text-secondary-foreground' : 'border-border bg-card-2 text-muted-foreground hover:text-foreground hover:border-primary/30'}`}>
                  <span className="text-lg">{c.emoji}</span>
                  <p className="text-xs mt-1 font-medium">{c.label}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Note</label>
            <input placeholder="Note (optional)" value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} className="form-input" />
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} className="form-input" />
          </div>
          {/* Work reimbursable toggle */}
          <div className="form-group">
            <label
              className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border transition-all"
              style={{
                borderColor: form.is_recurring ? 'var(--primary)' : 'var(--border)',
                background: form.is_recurring ? 'var(--secondary)' : 'transparent',
              }}
            >
              <input
                type="checkbox"
                role="switch"
                aria-checked={form.is_recurring}
                checked={form.is_recurring}
                onChange={e => setForm(f => ({ ...f, is_recurring: e.target.checked }))}
                className="sr-only"
              />
              <div
                aria-hidden="true"
                style={{
                  width: 40,
                  height: 22,
                  borderRadius: 11,
                  background: form.is_recurring ? 'var(--primary)' : 'var(--muted)',
                  position: 'relative',
                  transition: 'background 0.2s ease',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: 'var(--background)',
                    position: 'absolute',
                    top: 2,
                    left: form.is_recurring ? 20 : 2,
                    transition: 'left 0.2s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                  }}
                />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: form.is_recurring ? 'var(--secondary-foreground)' : 'var(--foreground)' }}>
                  Work reimbursable
                </p>
                <p className="text-[11px]" style={{ color: form.is_recurring ? 'var(--secondary-foreground)' : 'var(--muted-foreground)', opacity: 0.7 }}>
                  Tracked but won't count against your budget
                </p>
              </div>
            </label>
          </div>
          <button type="submit" className="btn-primary w-full" style={{ padding: '12px 24px' }}>Save Expense</button>
        </form>
      </Modal>

      {/* Edit Expense Modal */}
      <Modal open={editModalOpen} onClose={() => { setEditModalOpen(false); setEditingExpense(null) }} title="Edit Expense">
        <form onSubmit={handleEditExpense}>
          <div className="form-group">
            <label className="form-label">Amount</label>
            <input type="number" inputMode="decimal" step="0.01" value={editForm.amount} onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} className="form-input text-2xl font-bold text-center" required />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {EXPENSE_CATEGORIES.map(c => (
                <button key={c.value} type="button" onClick={() => setEditForm(f => ({ ...f, category: c.value }))}
                  className={`p-3 rounded-lg border text-center transition-all duration-200 ${editForm.category === c.value ? 'border-primary bg-secondary text-secondary-foreground' : 'border-border bg-card-2 text-muted-foreground hover:text-foreground hover:border-primary/30'}`}>
                  <span className="text-lg">{c.emoji}</span>
                  <p className="text-xs mt-1 font-medium">{c.label}</p>
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Note</label>
            <input value={editForm.note} onChange={e => setEditForm(f => ({ ...f, note: e.target.value }))} className="form-input" placeholder="Note (optional)" />
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" value={editForm.date} onChange={e => setEditForm(f => ({ ...f, date: e.target.value }))} className="form-input" />
          </div>
          <div className="form-group">
            <label
              className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border transition-all"
              style={{
                borderColor: editForm.is_recurring ? 'var(--primary)' : 'var(--border)',
                background: editForm.is_recurring ? 'var(--secondary)' : 'transparent',
              }}
            >
              <input type="checkbox" role="switch" aria-checked={editForm.is_recurring} checked={editForm.is_recurring} onChange={e => setEditForm(f => ({ ...f, is_recurring: e.target.checked }))} className="sr-only" />
              <div aria-hidden="true" style={{ width: 40, height: 22, borderRadius: 11, background: editForm.is_recurring ? 'var(--primary)' : 'var(--muted)', position: 'relative', transition: 'background 0.2s ease', flexShrink: 0 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: 'var(--background)', position: 'absolute', top: 2, left: editForm.is_recurring ? 20 : 2, transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
              </div>
              <div>
                <p className="text-sm font-medium" style={{ color: editForm.is_recurring ? 'var(--secondary-foreground)' : 'var(--foreground)' }}>Work reimbursable</p>
                <p className="text-[11px]" style={{ color: editForm.is_recurring ? 'var(--secondary-foreground)' : 'var(--muted-foreground)', opacity: 0.7 }}>Tracked but won't count against your budget</p>
              </div>
            </label>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={handleDeleteFromEdit} className="btn-secondary flex-1" style={{ padding: '12px 24px', color: 'var(--destructive)', borderColor: 'var(--destructive)' }}>
              Delete
            </button>
            <button type="submit" className="btn-primary flex-1" style={{ padding: '12px 24px' }}>
              Save Changes
            </button>
          </div>
        </form>
      </Modal>

      {/* Monthly Summary Modal */}
      <Modal open={summaryOpen} onClose={() => setSummaryOpen(false)} title={`${label} Summary`}>
        <SummaryView
          monthExpenses={monthExpenses}
          monthTotal={monthTotal}
          onCategoryClick={(cat) => { setDrillCategory(cat); setSummaryOpen(false) }}
        />
      </Modal>

      {/* Category Drill-down Modal */}
      <Modal
        open={drillCategory !== null}
        onClose={() => setDrillCategory(null)}
        title={`${getCategoryEmoji(drillCategory)} ${drillCategory ? drillCategory.charAt(0).toUpperCase() + drillCategory.slice(1) : ''} — ${label}`}
      >
        <CategoryDrillDown
          expenses={monthExpenses.filter(e => e.category === drillCategory)}
          onBack={() => { setDrillCategory(null); setSummaryOpen(true) }}
        />
      </Modal>
    </div>
  )
}

/* ─── Summary View (inside modal) ─── */
function SummaryView({ monthExpenses, monthTotal, onCategoryClick }) {
  // Build category totals
  const catTotals = {}
  for (const e of monthExpenses) {
    const cat = e.category || 'other'
    if (!catTotals[cat]) catTotals[cat] = { total: 0, count: 0, recurring: 0 }
    catTotals[cat].total += Number(e.amount)
    catTotals[cat].count += 1
    if (e.is_recurring) catTotals[cat].recurring += Number(e.amount)
  }

  // Sort by total descending
  const sorted = Object.entries(catTotals).sort((a, b) => b[1].total - a[1].total)

  if (sorted.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground text-sm">No expenses this month</p>
      </div>
    )
  }

  return (
    <div>
      {/* Total */}
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <p className="stat-label">Total Spent</p>
        <p className="stat-value" style={{ marginTop: 4 }}>{formatCurrency(monthTotal)}</p>
        <p className="text-xs text-muted-foreground mt-1">{monthExpenses.length} transactions</p>
      </div>

      {/* Category bars */}
      <div className="flex flex-col" style={{ gap: 12 }}>
        {sorted.map(([cat, data]) => {
          const pct = monthTotal > 0 ? (data.total / monthTotal) * 100 : 0
          return (
            <button
              key={cat}
              onClick={() => onCategoryClick(cat)}
              className="w-full text-left rounded-[12px] border border-border hover:border-primary/30 transition-all bg-card"
              style={{ padding: '16px 20px', cursor: 'pointer' }}
            >
              <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                <div className="flex items-center" style={{ gap: 10 }}>
                  <span style={{ fontSize: 22 }}>{getCategoryEmoji(cat)}</span>
                  <div>
                    <span className="text-[14px] font-semibold text-foreground capitalize">{cat}</span>
                    <span className="text-[12px] text-muted-foreground ml-2">({data.count})</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-[16px] font-bold text-foreground">{formatCurrency(data.total)}</span>
                  <span className="text-[12px] text-muted-foreground">{pct.toFixed(0)}%</span>
                </div>
              </div>
              {/* Progress bar */}
              <div className="bg-card-2 rounded-full overflow-hidden" style={{ height: 8, borderRadius: 4, marginBottom: data.recurring > 0 ? 10 : 0 }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${pct}%`, background: 'var(--primary)', borderRadius: 4 }}
                />
              </div>
              {data.recurring > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {formatCurrency(data.recurring)} reimbursable · {formatCurrency(data.total - data.recurring)} out of pocket
                </p>
              )}
            </button>
          )
        })}
      </div>

      <p className="text-hint text-center mt-4">Tap a category to see the day-by-day breakdown</p>
    </div>
  )
}

/* ─── Category Drill-down (inside modal) ─── */
function CategoryDrillDown({ expenses, onBack }) {
  const total = expenses.reduce((s, e) => s + Number(e.amount), 0)

  // Group by date
  const byDate = {}
  for (const e of expenses) {
    const dateLabel = formatDate(e.date)
    if (!byDate[dateLabel]) byDate[dateLabel] = []
    byDate[dateLabel].push(e)
  }

  return (
    <div>
      {/* Back button */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-primary font-medium mb-4 hover:opacity-80 transition-opacity">
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        Back to Summary
      </button>

      {/* Total for this category */}
      <div style={{ textAlign: 'center', marginBottom: 20 }}>
        <p className="stat-value">{formatCurrency(total)}</p>
        <p className="text-xs text-muted-foreground mt-1">{expenses.length} transaction{expenses.length !== 1 ? 's' : ''}</p>
      </div>

      {/* Day-by-day entries */}
      <div className="flex flex-col gap-4">
        {Object.entries(byDate).map(([date, items]) => {
          const dayTotal = items.reduce((s, e) => s + Number(e.amount), 0)
          return (
            <div key={date}>
              <div className="flex justify-between items-center mb-2">
                <p className="stat-label">{date}</p>
                <p className="text-xs font-semibold text-foreground">{formatCurrency(dayTotal)}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                {items.map(e => (
                  <div key={e.id} className="flex justify-between items-center py-2 px-3 rounded-lg bg-card-2">
                    <div>
                      <p className="text-sm text-foreground">{e.note || e.category}</p>
                      {e.is_recurring && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground font-semibold uppercase tracking-wider">Reimbursable</span>}
                    </div>
                    <p className="text-sm font-semibold text-foreground">{formatCurrency(e.amount)}</p>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
