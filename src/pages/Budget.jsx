import { useState, useMemo } from 'react'
import toast from 'react-hot-toast'
import Card from '../components/Card'
import Modal from '../components/Modal'
import SkeletonLoader from '../components/SkeletonLoader'
import { useBudget } from '../hooks/useBudget'
import { useExpenses } from '../hooks/useExpenses'
import { formatCurrency, BUDGET_ALLOCATIONS, getCategoryEmoji } from '../lib/helpers'
import { filterByMonth } from '../lib/dateFilters'

export default function Budget() {
  const { budget, recurring, loading, saveBudget, addRecurring, updateRecurring, deleteRecurring, totalRecurring, monthlyIncome, savingsTarget, discretionary } = useBudget()
  const { expenses, monthlyTotal } = useExpenses()
  const [editBudget, setEditBudget] = useState(false)
  const [addRecModal, setAddRecModal] = useState(false)
  const [editRecModal, setEditRecModal] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [incomeForm, setIncomeForm] = useState('')
  const [savingsForm, setSavingsForm] = useState('')
  const [recForm, setRecForm] = useState({ name: '', amount: '', day_of_month: '1', category: '' })
  const [expandedCats, setExpandedCats] = useState({})
  const [cashFlowOpen, setCashFlowOpen] = useState(false)

  const spentSoFar = monthlyTotal
  const canSpend = discretionary - spentSoFar

  const openEditBudget = () => {
    setIncomeForm(String(budget?.monthly_income || ''))
    setSavingsForm(String(budget?.savings_target || ''))
    setEditBudget(true)
  }

  const openEditRecurring = (item) => {
    setEditingItem(item)
    setRecForm({
      name: item.name,
      amount: String(item.amount),
      day_of_month: String(item.day_of_month || 1),
      category: item.category || '',
    })
    setEditRecModal(true)
  }

  const handleSaveBudget = async (e) => {
    e.preventDefault()
    try { await saveBudget({ monthly_income: Number(incomeForm), savings_target: Number(savingsForm) }); toast.success('Budget updated!'); setEditBudget(false) }
    catch { toast.error('Failed to save') }
  }

  const handleAddRecurring = async (e) => {
    e.preventDefault()
    try { await addRecurring({ name: recForm.name, amount: Number(recForm.amount), day_of_month: Number(recForm.day_of_month), category: recForm.category || null }); toast.success('Added!'); setAddRecModal(false); setRecForm({ name: '', amount: '', day_of_month: '1', category: '' }) }
    catch { toast.error('Failed to save') }
  }

  const handleEditRecurring = async (e) => {
    e.preventDefault()
    if (!editingItem) return
    try {
      await updateRecurring(editingItem.id, { name: recForm.name, amount: Number(recForm.amount), day_of_month: Number(recForm.day_of_month), category: recForm.category || null })
      toast.success('Updated!')
      setEditRecModal(false)
      setEditingItem(null)
    } catch { toast.error('Failed to save') }
  }

  const handleDeleteFromEdit = async () => {
    if (!editingItem) return
    try {
      await deleteRecurring(editingItem.id)
      toast.success('Deleted!')
      setEditRecModal(false)
      setEditingItem(null)
    } catch { toast.error('Failed to delete') }
  }

  // Group recurring by category (memoized — must run before any early return)
  const grouped = useMemo(
    () => (recurring || []).reduce((acc, r) => {
      const cat = r.category || 'other'
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(r)
      return acc
    }, {}),
    [recurring]
  )

  if (loading) return <div className="page-container"><SkeletonLoader count={5} height="h-28" /></div>

  const categoryLabels = {
    subscription: '📱 Subscriptions',
    housing: '🏠 Housing',
    car: '🚗 Car',
    family: '👨‍👩‍👦 Family',
    other: '📦 Other',
  }

  return (
    <div className="page-container">
      <div className="flex items-center justify-between">
        <h1 className="page-title">Budget</h1>
        <button onClick={openEditBudget} className="btn-secondary" style={{ padding: '8px 18px', minWidth: 'auto' }}>Edit</button>
      </div>

      {/* Cash Flow — compact with expandable detail */}
      <div className="hero-card" style={{ padding: '16px 20px' }}>
        <button
          onClick={() => setCashFlowOpen(o => !o)}
          style={{ width: '100%', background: 'none', border: 'none', fontFamily: 'inherit', cursor: 'pointer', padding: 0 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center" style={{ gap: 10 }}>
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                style={{ transition: 'transform 0.2s ease', transform: cashFlowOpen ? 'rotate(90deg)' : 'rotate(0deg)', opacity: 0.5 }}
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
              <span className="label text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ margin: 0 }}>You Can Spend</span>
            </div>
            <span className="text-[22px] font-bold" style={{ letterSpacing: '-0.02em', color: canSpend >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {formatCurrency(canSpend)}
            </span>
          </div>
          {!cashFlowOpen && (
            <div className="flex justify-between" style={{ marginTop: 4 }}>
              <span className="text-[11px] opacity-50">of {formatCurrency(discretionary)} discretionary</span>
              <span className="text-[11px] opacity-50">{formatCurrency(spentSoFar)} spent</span>
            </div>
          )}
        </button>

        {cashFlowOpen && (
          <div className="flex flex-col" style={{ gap: 8, marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <FlowRow label="Monthly Income" value={formatCurrency(monthlyIncome)} colorVar="var(--success)" />
            <FlowRow label="Recurring Expenses" value={`-${formatCurrency(totalRecurring)}`} colorVar="var(--danger)" />
            <FlowRow label="Savings Target" value={`-${formatCurrency(savingsTarget)}`} colorVar="var(--info)" />
            <div className="border-t border-white/10 pt-2">
              <FlowRow label="Discretionary Budget" value={formatCurrency(discretionary)} bold />
            </div>
            <FlowRow label="Spent So Far" value={`-${formatCurrency(spentSoFar)}`} colorVar="var(--warning)" />
          </div>
        )}
      </div>

      {/* Budget Allocation by Category */}
      <BudgetCategories discretionary={discretionary} expenses={expenses} />

      {/* Recurring */}
      <div className="flex items-center justify-between">
        <h2 className="section-title">Recurring Expenses</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">{formatCurrency(totalRecurring)}/mo</span>
          <button onClick={() => { setRecForm({ name: '', amount: '', day_of_month: '1', category: '' }); setAddRecModal(true) }} className="btn-secondary" style={{ padding: '8px 18px', minWidth: 'auto' }}>+ Add</button>
        </div>
      </div>

      {recurring.length === 0 ? (
        <div className="empty-state" style={{ padding: '48px 16px' }}>
          <div className="empty-state-icon">📅</div>
          <p className="empty-state-title">No recurring expenses</p>
          <p className="empty-state-desc">Add rent, subscriptions, and bills to track your fixed costs</p>
          <button onClick={() => setAddRecModal(true)} className="btn-primary" style={{ padding: '10px 20px', borderRadius: 20, minWidth: 'auto' }}>
            Add recurring expense
          </button>
        </div>
      ) : (
        Object.entries(grouped).map(([cat, items]) => {
          const isOpen = expandedCats[cat] ?? false
          const catTotal = items.reduce((s, r) => s + Number(r.amount), 0)
          const toggleCat = () => setExpandedCats(prev => ({ ...prev, [cat]: !prev[cat] }))

          return (
            <div key={cat}>
              {/* Collapsible header */}
              <button
                onClick={toggleCat}
                className="w-full flex items-center justify-between"
                style={{ padding: '10px 4px', cursor: 'pointer', background: 'none', border: 'none', fontFamily: 'inherit' }}
              >
                <div className="flex items-center gap-2">
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round"
                    style={{ transition: 'transform 0.2s ease', transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)', color: 'var(--muted-foreground)' }}
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                  <span className="stat-label" style={{ margin: 0 }}>{categoryLabels[cat] || cat}</span>
                  <span className="text-[11px] text-muted-foreground">({items.length})</span>
                </div>
                <span className="text-[13px] font-semibold text-foreground">{formatCurrency(catTotal)}</span>
              </button>

              {/* Collapsible content */}
              {isOpen && (
                <div className="flex flex-col gap-2" style={{ marginBottom: 8 }}>
                  {items.map(r => (
                    <Card key={r.id} onClick={() => openEditRecurring(r)} className="flex items-center justify-between cursor-pointer" style={{ padding: '14px 16px' }}>
                      <div>
                        <p className="font-medium text-sm text-foreground">{r.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Day {r.day_of_month}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-semibold text-sm text-foreground">{formatCurrency(r.amount)}</p>
                        <svg className="card-chevron w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                        </svg>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )
        })
      )}

      {/* Edit Budget Modal */}
      <Modal open={editBudget} onClose={() => setEditBudget(false)} title="Edit Budget">
        <form onSubmit={handleSaveBudget}>
          <div className="form-group">
            <label className="form-label">Monthly Income</label>
            <input type="number" step="0.01" value={incomeForm} onChange={e => setIncomeForm(e.target.value)} className="form-input" required />
          </div>
          <div className="form-group">
            <label className="form-label">Savings Target</label>
            <input type="number" step="0.01" value={savingsForm} onChange={e => setSavingsForm(e.target.value)} className="form-input" required />
          </div>
          <button type="submit" className="btn-primary w-full" style={{ padding: '12px 24px' }}>Save</button>
        </form>
      </Modal>

      {/* Add Recurring Modal */}
      <Modal open={addRecModal} onClose={() => setAddRecModal(false)} title="Add Recurring Expense">
        <form onSubmit={handleAddRecurring}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input placeholder="e.g. Netflix" value={recForm.name} onChange={e => setRecForm(f => ({ ...f, name: e.target.value }))} className="form-input" required />
          </div>
          <div className="form-group">
            <label className="form-label">Amount ($/month)</label>
            <input placeholder="0.00" type="number" step="0.01" value={recForm.amount} onChange={e => setRecForm(f => ({ ...f, amount: e.target.value }))} className="form-input" required />
          </div>
          <div className="form-group">
            <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label className="form-label">Day of Month</label>
                <input type="number" min="1" max="31" value={recForm.day_of_month} onChange={e => setRecForm(f => ({ ...f, day_of_month: e.target.value }))} className="form-input" />
              </div>
              <div>
                <label className="form-label">Category</label>
                <select value={recForm.category} onChange={e => setRecForm(f => ({ ...f, category: e.target.value }))} className="form-input">
                  <option value="">None</option>
                  <option value="subscription">📱 Subscription</option>
                  <option value="housing">🏠 Housing</option>
                  <option value="car">🚗 Car</option>
                  <option value="family">👨‍👩‍👦 Family</option>
                  <option value="other">📦 Other</option>
                </select>
              </div>
            </div>
          </div>
          <button type="submit" className="btn-primary w-full" style={{ padding: '12px 24px' }}>Add</button>
        </form>
      </Modal>

      {/* Edit Recurring Modal */}
      <Modal open={editRecModal} onClose={() => { setEditRecModal(false); setEditingItem(null) }} title="Edit Recurring Expense">
        <form onSubmit={handleEditRecurring}>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input value={recForm.name} onChange={e => setRecForm(f => ({ ...f, name: e.target.value }))} className="form-input" required />
          </div>
          <div className="form-group">
            <label className="form-label">Amount ($/month)</label>
            <input type="number" step="0.01" value={recForm.amount} onChange={e => setRecForm(f => ({ ...f, amount: e.target.value }))} className="form-input" required />
          </div>
          <div className="form-group">
            <div className="form-row" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <div>
                <label className="form-label">Day of Month</label>
                <input type="number" min="1" max="31" value={recForm.day_of_month} onChange={e => setRecForm(f => ({ ...f, day_of_month: e.target.value }))} className="form-input" />
              </div>
              <div>
                <label className="form-label">Category</label>
                <select value={recForm.category} onChange={e => setRecForm(f => ({ ...f, category: e.target.value }))} className="form-input">
                  <option value="">None</option>
                  <option value="subscription">📱 Subscription</option>
                  <option value="housing">🏠 Housing</option>
                  <option value="car">🚗 Car</option>
                  <option value="family">👨‍👩‍👦 Family</option>
                  <option value="other">📦 Other</option>
                </select>
              </div>
            </div>
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
    </div>
  )
}

function FlowRow({ label, value, color, colorVar, bold, large }) {
  const valueStyle = { fontSize: large ? 20 : bold ? 16 : 14 }
  if (colorVar) valueStyle.color = colorVar
  return (
    <div className="flex justify-between items-center" style={{ height: 40, fontSize: 14 }}>
      <span className={bold ? 'font-bold' : 'opacity-70'} style={{ fontSize: bold ? 16 : 14 }}>{label}</span>
      <span className={`font-medium ${bold ? 'font-bold' : ''} ${color || ''}`} style={valueStyle}>{value}</span>
    </div>
  )
}

/* ─── Budget Categories Allocation ─── */
function BudgetCategories({ discretionary, expenses }) {
  // Calculate spent per category for current month, non-reimbursable only (memoized)
  const spentByCategory = useMemo(() => {
    const now = new Date()
    const monthExpenses = filterByMonth(expenses, now.getFullYear(), now.getMonth(), 'date')
      .filter(e => !e.is_recurring)
    const out = {}
    for (const e of monthExpenses) {
      const cat = e.category || 'other'
      out[cat] = (out[cat] || 0) + Number(e.amount)
    }
    return out
  }, [expenses])

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
        <h2 className="section-title">Budget Allocation</h2>
        <span className="text-sm text-muted-foreground">of {formatCurrency(discretionary)}</span>
      </div>

      <div className="flex flex-col" style={{ gap: 10 }}>
        {BUDGET_ALLOCATIONS.map(({ category, label, emoji, percent }) => {
          const allocated = discretionary * (percent / 100)
          const spent = spentByCategory[category] || 0
          const remaining = allocated - spent
          const spentPct = allocated > 0 ? Math.min(100, (spent / allocated) * 100) : 0
          const isOver = remaining < 0

          return (
            <div
              key={category}
              style={{ padding: '14px 18px', borderRadius: 12, border: '1px solid var(--border)', background: 'var(--card)' }}
            >
              {/* Header row */}
              <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <div className="flex items-center" style={{ gap: 8 }}>
                  <span style={{ fontSize: 18 }}>{emoji}</span>
                  <span className="text-[13px] font-semibold text-foreground">{label}</span>
                  <span className="text-[11px] text-muted-foreground">{percent}%</span>
                </div>
                <span className={`text-[13px] font-bold ${isOver ? 'text-destructive' : 'text-foreground'}`}>
                  {formatCurrency(remaining)} left
                </span>
              </div>

              {/* Progress bar */}
              <div className="bg-muted rounded-full overflow-hidden" style={{ height: 6, borderRadius: 3 }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${spentPct}%`,
                    background: isOver ? 'var(--destructive)' : spentPct > 80 ? '#e8a83e' : 'var(--primary)',
                    borderRadius: 3,
                  }}
                />
              </div>

              {/* Footer stats */}
              <div className="flex justify-between" style={{ marginTop: 6 }}>
                <span className="text-[11px] text-muted-foreground">{formatCurrency(spent)} spent</span>
                <span className="text-[11px] text-muted-foreground">{formatCurrency(allocated)} budget</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
