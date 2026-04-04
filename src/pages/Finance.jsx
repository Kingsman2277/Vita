import { useState } from 'react'
import toast from 'react-hot-toast'
import Card from '../components/Card'
import Modal from '../components/Modal'
import MonthPicker from '../components/MonthPicker'
import SkeletonLoader from '../components/SkeletonLoader'
import { useExpenses } from '../hooks/useExpenses'
import { useMonthNavigation } from '../hooks/useMonthNavigation'
import { filterByMonth } from '../lib/dateFilters'
import { formatCurrency, formatDate, getToday, EXPENSE_CATEGORIES, getCategoryEmoji } from '../lib/helpers'

export default function Finance() {
  const { expenses, loading, addExpense, deleteExpense } = useExpenses()
  const { selectedMonth, goToPrev, goToNext, goToCurrentMonth, isCurrentMonth, label } = useMonthNavigation()
  const [modalOpen, setModalOpen] = useState(false)
  const [filter, setFilter] = useState('all')
  const [form, setForm] = useState({ amount: '', category: 'food', note: '', date: getToday() })

  // Two-step filter: month first, then category
  const monthExpenses = filterByMonth(expenses, selectedMonth.year, selectedMonth.month, 'date')
  const filtered = filter === 'all' ? monthExpenses : monthExpenses.filter(e => e.category === filter)
  const monthTotal = monthExpenses.reduce((sum, e) => sum + Number(e.amount), 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.amount) return
    try {
      await addExpense({ amount: Number(form.amount), category: form.category, note: form.note || null, date: form.date })
      toast.success('Expense added!')
      setModalOpen(false)
      setForm({ amount: '', category: 'food', note: '', date: getToday() })
    } catch { toast.error('Failed to save') }
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="page-title">Finance</h1>
          <p className="text-muted-foreground text-sm mt-1">{label}: <span className="text-foreground font-semibold">{formatCurrency(monthTotal)}</span></p>
        </div>
        <button onClick={() => setModalOpen(true)} className="btn-primary" style={{ padding: '10px 20px', borderRadius: 20, minWidth: 'auto' }}>+ Expense</button>
      </div>

      <MonthPicker label={label} onPrev={goToPrev} onNext={goToNext} onToday={goToCurrentMonth} isCurrentMonth={isCurrentMonth} />

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
            <Card key={exp.id} className="flex items-center justify-between" style={{ padding: '14px 16px' }}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <span className="text-xl flex items-center justify-center rounded-lg bg-muted flex-shrink-0" style={{ width: 36, height: 36 }}>{getCategoryEmoji(exp.category)}</span>
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate text-foreground">{exp.note || exp.category}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDate(exp.date)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <p className="font-semibold text-foreground">{formatCurrency(exp.amount)}</p>
                <button onClick={() => deleteExpense(exp.id)} className="text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-muted transition-colors">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
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
          <button type="submit" className="btn-primary w-full" style={{ padding: '12px 24px' }}>Save Expense</button>
        </form>
      </Modal>
    </div>
  )
}
