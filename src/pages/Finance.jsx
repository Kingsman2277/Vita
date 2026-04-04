import { useState } from 'react'
import toast from 'react-hot-toast'
import Card from '../components/Card'
import Modal from '../components/Modal'
import MonthPicker from '../components/MonthPicker'
import DayPicker from '../components/DayPicker'
import SkeletonLoader from '../components/SkeletonLoader'
import { useExpenses } from '../hooks/useExpenses'
import { useMonthNavigation } from '../hooks/useMonthNavigation'
import { filterByMonth, filterByDay, getDaysWithData } from '../lib/dateFilters'
import { formatCurrency, formatDate, getToday, EXPENSE_CATEGORIES, getCategoryEmoji } from '../lib/helpers'

export default function Finance() {
  const { expenses, loading, addExpense, updateExpense, deleteExpense } = useExpenses()
  const { selectedMonth, goToPrev, goToNext, goToCurrentMonth, isCurrentMonth, label } = useMonthNavigation()
  const [modalOpen, setModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [summaryOpen, setSummaryOpen] = useState(false)
  const [drillCategory, setDrillCategory] = useState(null)
  const [editingExpense, setEditingExpense] = useState(null)
  const [filter, setFilter] = useState('all')
  const [selectedDay, setSelectedDay] = useState(new Date().getDate())
  const [form, setForm] = useState({ amount: '', category: 'food', note: '', date: getToday(), is_recurring: false })
  const [editForm, setEditForm] = useState({ amount: '', category: 'food', note: '', date: '', is_recurring: false })

  // Three-step filter: month → day → category
  const monthExpenses = filterByMonth(expenses, selectedMonth.year, selectedMonth.month, 'date')
  const dayExpenses = filterByDay(monthExpenses, selectedDay, 'date')
  const filtered = filter === 'all' ? dayExpenses : dayExpenses.filter(e => e.category === filter)
  const monthTotal = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const dayTotal = dayExpenses.reduce((sum, e) => sum + Number(e.amount), 0)
  const expDaysWithData = getDaysWithData(monthExpenses, 'date')

  // Reset day when month changes
  const monthKey = `${selectedMonth.year}-${selectedMonth.month}`
  const [prevMonthKey, setPrevMonthKey] = useState(monthKey)
  if (monthKey !== prevMonthKey) { setPrevMonthKey(monthKey); setSelectedDay(null) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.amount) return
    try {
      await addExpense({ amount: Number(form.amount), category: form.category, note: form.note || null, date: form.date, is_recurring: form.is_recurring })
      toast.success('Expense added!')
      setModalOpen(false)
      setForm({ amount: '', category: 'food', note: '', date: getToday(), is_recurring: false })
    } catch { toast.error('Failed to save') }
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
    try {
      await updateExpense(editingExpense.id, {
        amount: Number(editForm.amount),
        category: editForm.category,
        note: editForm.note || null,
        date: editForm.date,
        is_recurring: editForm.is_recurring,
      })
      toast.success('Updated!')
      setEditModalOpen(false)
      setEditingExpense(null)
    } catch { toast.error('Failed to save') }
  }

  const handleDeleteFromEdit = async () => {
    if (!editingExpense) return
    try {
      await deleteExpense(editingExpense.id)
      toast.success('Deleted!')
      setEditModalOpen(false)
      setEditingExpense(null)
    } catch { toast.error('Failed to delete') }
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Finance</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {selectedDay !== null
              ? <>{label}, Day {selectedDay}: <span className="text-foreground font-semibold">{formatCurrency(dayTotal)}</span></>
              : <>{label}: <span className="text-foreground font-semibold">{formatCurrency(monthTotal)}</span></>
            }
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setSummaryOpen(true)} className="btn-secondary" style={{ padding: '10px 20px', borderRadius: 20, minWidth: 'auto' }}>📊 Summary</button>
          <button onClick={() => setModalOpen(true)} className="btn-primary" style={{ padding: '10px 20px', borderRadius: 20, minWidth: 'auto' }}>+ Expense</button>
        </div>
      </div>

      <MonthPicker label={label} onPrev={() => { goToPrev(); setSelectedDay(null) }} onNext={() => { goToNext(); setSelectedDay(null) }} onToday={() => { goToCurrentMonth(); setSelectedDay(new Date().getDate()) }} isCurrentMonth={isCurrentMonth} />

      <DayPicker year={selectedMonth.year} month={selectedMonth.month} selectedDay={selectedDay} onSelectDay={setSelectedDay} daysWithData={expDaysWithData} />

      <div className="flex overflow-x-auto pb-1 scrollbar-none" style={{ gap: 8 }}>
        <button onClick={() => setFilter('all')} className={`btn-pill${filter === 'all' ? ' active' : ''}`}>All</button>
        {EXPENSE_CATEGORIES.map(c => (
          <button key={c.value} onClick={() => setFilter(c.value)} className={`btn-pill${filter === c.value ? ' active' : ''}`}>
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonLoader count={5} />
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">💰</div>
          <p className="empty-state-title">{isCurrentMonth ? 'No expenses yet' : `No expenses in ${label}`}</p>
          <p className="empty-state-desc">{isCurrentMonth ? 'Start tracking your spending to see where your money goes' : 'Try navigating to a different month'}</p>
          {isCurrentMonth && (
            <button onClick={() => setModalOpen(true)} className="btn-primary" style={{ padding: '10px 20px', borderRadius: 20, minWidth: 'auto' }}>
              Add your first expense
            </button>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(exp => (
            <Card key={exp.id} onClick={() => openEditExpense(exp)} className="flex items-center justify-between cursor-pointer" style={{ padding: '14px 16px' }}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-xl flex items-center justify-center rounded-lg bg-muted flex-shrink-0" style={{ width: 36, height: 36 }}>{getCategoryEmoji(exp.category)}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-sm truncate text-foreground">{exp.note || exp.category}</p>
                    {exp.is_recurring && <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-secondary text-secondary-foreground font-semibold uppercase tracking-wider flex-shrink-0">Reimbursable</span>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDate(exp.date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <p className="font-semibold text-foreground">{formatCurrency(exp.amount)}</p>
                <svg className="card-chevron w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Add Expense">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Amount</label>
            <input placeholder="0.00" type="number" step="0.01" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} className="form-input text-2xl font-bold text-center" required autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {EXPENSE_CATEGORIES.map(c => (
                <button key={c.value} type="button" onClick={() => setForm(f => ({ ...f, category: c.value }))}
                  className={`p-3 rounded-lg border text-center transition-all duration-200 ${form.category === c.value ? 'border-primary bg-secondary text-secondary-foreground' : 'border-border bg-muted text-muted-foreground hover:text-foreground hover:border-primary/30'}`}>
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
                checked={form.is_recurring}
                onChange={e => setForm(f => ({ ...f, is_recurring: e.target.checked }))}
                className="sr-only"
              />
              <div
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
                    background: '#fff',
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
            <input type="number" step="0.01" value={editForm.amount} onChange={e => setEditForm(f => ({ ...f, amount: e.target.value }))} className="form-input text-2xl font-bold text-center" required />
          </div>
          <div className="form-group">
            <label className="form-label">Category</label>
            <div className="grid grid-cols-3 gap-2 mt-1">
              {EXPENSE_CATEGORIES.map(c => (
                <button key={c.value} type="button" onClick={() => setEditForm(f => ({ ...f, category: c.value }))}
                  className={`p-3 rounded-lg border text-center transition-all duration-200 ${editForm.category === c.value ? 'border-primary bg-secondary text-secondary-foreground' : 'border-border bg-muted text-muted-foreground hover:text-foreground hover:border-primary/30'}`}>
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
              <input type="checkbox" checked={editForm.is_recurring} onChange={e => setEditForm(f => ({ ...f, is_recurring: e.target.checked }))} className="sr-only" />
              <div style={{ width: 40, height: 22, borderRadius: 11, background: editForm.is_recurring ? 'var(--primary)' : 'var(--muted)', position: 'relative', transition: 'background 0.2s ease', flexShrink: 0 }}>
                <div style={{ width: 18, height: 18, borderRadius: '50%', background: '#fff', position: 'absolute', top: 2, left: editForm.is_recurring ? 20 : 2, transition: 'left 0.2s ease', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
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
              <div className="bg-muted rounded-full overflow-hidden" style={{ height: 8, borderRadius: 4, marginBottom: data.recurring > 0 ? 10 : 0 }}>
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
                  <div key={e.id} className="flex justify-between items-center py-2 px-3 rounded-lg bg-muted">
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
