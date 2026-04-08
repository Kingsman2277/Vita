import { useState, useRef, useMemo } from 'react'
import toast from 'react-hot-toast'
import Card from '../components/Card'
import Modal from '../components/Modal'
import MonthPicker from '../components/MonthPicker'
import CameraModal from '../components/CameraModal'
import MacroRing from '../components/MacroRing'
import SkeletonLoader from '../components/SkeletonLoader'
import { useFoodLogs } from '../hooks/useFoodLogs'
import { useMonthNavigation } from '../hooks/useMonthNavigation'
import DayPicker from '../components/DayPicker'
import { filterByMonth, filterByDay, getDaysWithData } from '../lib/dateFilters'
import { analyzeFood, analyzeFoodText } from '../lib/gemini'
import { getMealType } from '../lib/helpers'

export default function Food() {
  const { logs, todayCalories, todayProtein, todayCarbs, todayFat, loading, addFoodLog, updateFoodLog, deleteFoodLog } = useFoodLogs()
  const { selectedMonth, goToPrev, goToNext, goToCurrentMonth, isCurrentMonth, label } = useMonthNavigation()
  const [modalOpen, setModalOpen] = useState(false)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [photoMenuOpen, setPhotoMenuOpen] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [smartText, setSmartText] = useState('')
  const [servings, setServings] = useState(1)
  const [form, setForm] = useState({ food_name: '', description: '', calories: '', protein: '', carbs: '', fat: '', meal_type: getMealType() })
  const [editForm, setEditForm] = useState({ food_name: '', description: '', calories: '', protein: '', carbs: '', fat: '', meal_type: '', logged_at: '' })
  const [selectedDay, setSelectedDay] = useState(new Date().getDate())
  const galleryRef = useRef()

  const handleSmartAnalyze = async () => {
    if (!smartText.trim()) return
    setAnalyzing(true)
    try {
      const result = await analyzeFoodText(smartText.trim())
      setForm({
        food_name: result.food_name || 'Meal',
        description: result.description || smartText.trim(),
        calories: String(result.calories || ''),
        protein: String(result.protein_g || ''),
        carbs: String(result.carbs_g || ''),
        fat: String(result.fat_g || ''),
        meal_type: result.meal_type_guess || getMealType(),
      })
      setSmartText('')
    } catch (err) {
      console.error('AI analyze error:', err)
      toast.error(err.message || 'Could not analyze. Fill in manually below.')
    }
    setAnalyzing(false)
  }

  // Filter logs: month → day (memoized)
  const monthLogs = useMemo(
    () => filterByMonth(logs, selectedMonth.year, selectedMonth.month, 'logged_at'),
    [logs, selectedMonth.year, selectedMonth.month]
  )
  const dayLogs = useMemo(
    () => filterByDay(monthLogs, selectedDay, 'logged_at'),
    [monthLogs, selectedDay]
  )
  const foodDaysWithData = useMemo(
    () => getDaysWithData(monthLogs, 'logged_at'),
    [monthLogs]
  )

  // Reset day selection when month changes
  const monthKey = `${selectedMonth.year}-${selectedMonth.month}`
  const [prevMonthKey, setPrevMonthKey] = useState(monthKey)
  if (monthKey !== prevMonthKey) { setPrevMonthKey(monthKey); setSelectedDay(null) }

  // Stats for the hero card (scoped to day if selected, else month)
  const stats = useMemo(() => {
    const statsLogs = selectedDay !== null ? dayLogs : monthLogs
    const statCalories = statsLogs.reduce((s, l) => s + Number(l.calories || 0), 0)
    const statProtein = statsLogs.reduce((s, l) => s + Number(l.protein || 0), 0)
    const statCarbs = statsLogs.reduce((s, l) => s + Number(l.carbs || 0), 0)
    const statFat = statsLogs.reduce((s, l) => s + Number(l.fat || 0), 0)
    const daysWithLogs = new Set(monthLogs.map(l => new Date(l.logged_at).toDateString())).size
    const avgDailyCalories = daysWithLogs > 0 ? Math.round(statCalories / daysWithLogs) : 0
    return { statCalories, statProtein, statCarbs, statFat, daysWithLogs, avgDailyCalories }
  }, [selectedDay, dayLogs, monthLogs])
  const { statCalories, statProtein, statCarbs, statFat, daysWithLogs, avgDailyCalories } = stats

  const handleCameraCapture = async (base64) => {
    setCameraOpen(false)
    setAnalyzing(true)
    setModalOpen(true)
    try {
      const result = await analyzeFood(base64)
      setForm({ food_name: result.food_name || 'Meal', description: result.description || '', calories: String(result.calories || ''), protein: String(result.protein_g || ''), carbs: String(result.carbs_g || ''), fat: String(result.fat_g || ''), meal_type: result.meal_type_guess || getMealType() })
    } catch (err) { console.error('Photo analyze error:', err); toast.error(err.message || 'Could not analyze photo.') }
    setAnalyzing(false)
  }

  const handleGalleryUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setAnalyzing(true)
    setModalOpen(true)
    try {
      const base64 = await fileToBase64(file)
      const result = await analyzeFood(base64)
      setForm({ food_name: result.food_name || 'Meal', description: result.description || '', calories: String(result.calories || ''), protein: String(result.protein_g || ''), carbs: String(result.carbs_g || ''), fat: String(result.fat_g || ''), meal_type: result.meal_type_guess || getMealType() })
    } catch (err) { console.error('Photo analyze error:', err); toast.error(err.message || 'Could not analyze photo.') }
    setAnalyzing(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.food_name || !form.calories) return
    const s = servings || 1
    try {
      await addFoodLog({
        food_name: s > 1 ? `${form.food_name} (x${s})` : form.food_name,
        description: form.description || null,
        calories: Math.round(Number(form.calories) * s),
        protein: Math.round((Number(form.protein) || 0) * s),
        carbs: Math.round((Number(form.carbs) || 0) * s),
        fat: Math.round((Number(form.fat) || 0) * s),
        meal_type: form.meal_type,
      })
      toast.success('Food logged!')
      setModalOpen(false)
      resetForm()
      setServings(1)
    } catch (err) { console.error('Save food error:', err); toast.error(err?.message || 'Failed to save') }
  }

  const openEditEntry = (entry) => {
    setEditingEntry(entry)
    setEditForm({
      food_name: entry.food_name || '',
      description: entry.description || '',
      calories: String(entry.calories || ''),
      protein: String(entry.protein || ''),
      carbs: String(entry.carbs || ''),
      fat: String(entry.fat || ''),
      meal_type: entry.meal_type || 'snack',
      logged_at: entry.logged_at ? entry.logged_at.split('T')[0] : '',
    })
    setEditModalOpen(true)
  }

  const handleEditSubmit = async (e) => {
    e.preventDefault()
    if (!editingEntry) return
    try {
      await updateFoodLog(editingEntry.id, {
        food_name: editForm.food_name,
        description: editForm.description || null,
        calories: Number(editForm.calories),
        protein: Number(editForm.protein) || 0,
        carbs: Number(editForm.carbs) || 0,
        fat: Number(editForm.fat) || 0,
        meal_type: editForm.meal_type,
        logged_at: editForm.logged_at ? new Date(editForm.logged_at + 'T12:00:00').toISOString() : editingEntry.logged_at,
      })
      toast.success('Updated!')
      setEditModalOpen(false)
      setEditingEntry(null)
    } catch (err) { console.error('Update food error:', err); toast.error(err?.message || 'Failed to save') }
  }

  const handleDeleteFromEdit = async () => {
    if (!editingEntry) return
    try {
      await deleteFoodLog(editingEntry.id)
      toast.success('Deleted!')
      setEditModalOpen(false)
      setEditingEntry(null)
    } catch { toast.error('Failed to delete') }
  }

  const resetForm = () => setForm({ food_name: '', description: '', calories: '', protein: '', carbs: '', fat: '', meal_type: getMealType() })

  // Reset form date/values to today when add modal opens
  const openAddModal = () => {
    resetForm()
    setServings(1)
    setSmartText('')
    setModalOpen(true)
  }

  // Group month-filtered logs by date (memoized)
  const groupedByDate = useMemo(
    () => dayLogs.reduce((acc, log) => {
      const date = new Date(log.logged_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      if (!acc[date]) acc[date] = []
      acc[date].push(log)
      return acc
    }, {}),
    [dayLogs]
  )

  return (
    <div className="page-container">
      <header>
        <h1 className="page-title">Food Log</h1>
        <div className="flex" style={{ gap: 10, marginTop: 16 }}>
          <div className="relative">
            <button
              type="button"
              onClick={() => setPhotoMenuOpen(p => !p)}
              className="btn-secondary"
              aria-haspopup="menu"
              aria-expanded={photoMenuOpen}
              style={{ padding: '11px 20px', borderRadius: 24, minWidth: 'auto', fontSize: 13 }}
            >
              📷 Photo
            </button>
            {photoMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setPhotoMenuOpen(false)} aria-hidden="true" />
                <div role="menu" className="absolute left-0 top-full mt-2 z-50 bg-card border border-border rounded-lg shadow-lg overflow-hidden min-w-[200px]" style={{ padding: '4px 0' }}>
                  <button type="button" role="menuitem" onClick={() => { setPhotoMenuOpen(false); setCameraOpen(true) }} className="w-full text-left text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-3" style={{ padding: '12px 16px' }}>
                    <span aria-hidden="true">📸</span> Take Photo
                  </button>
                  <div className="border-t border-border" aria-hidden="true" />
                  <button type="button" role="menuitem" onClick={() => { setPhotoMenuOpen(false); galleryRef.current.value = ''; galleryRef.current?.click() }} className="w-full text-left text-sm text-foreground hover:bg-muted transition-colors flex items-center gap-3" style={{ padding: '12px 16px' }}>
                    <span aria-hidden="true">🖼️</span> Upload from Gallery
                  </button>
                </div>
              </>
            )}
          </div>
          <button onClick={openAddModal} className="btn-primary" style={{ padding: '11px 20px', borderRadius: 24, minWidth: 'auto', fontSize: 13 }}>
            + Log Food
          </button>
        </div>
        <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleGalleryUpload} />
      </header>

      <MonthPicker label={label} onPrev={() => { goToPrev(); setSelectedDay(null) }} onNext={() => { goToNext(); setSelectedDay(null) }} onToday={() => { goToCurrentMonth(); setSelectedDay(new Date().getDate()) }} isCurrentMonth={isCurrentMonth} />

      <DayPicker year={selectedMonth.year} month={selectedMonth.month} selectedDay={selectedDay} onSelectDay={setSelectedDay} daysWithData={foodDaysWithData} />

      {/* Hero card — shows stats for selected scope */}
      <div className="hero-card">
        <p className="label stat-label">
          {selectedDay !== null
            ? new Date(selectedMonth.year, selectedMonth.month, selectedDay).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
            : isCurrentMonth ? 'Today' : label}
        </p>
        <div className="hero-row" style={{ marginTop: 14 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 44, fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1 }}>
              {selectedDay !== null || !isCurrentMonth ? statCalories.toLocaleString() : todayCalories}
            </p>
            <p className="label" style={{ fontSize: 12, marginTop: 8 }}>
              {selectedDay !== null ? 'calories' : isCurrentMonth ? 'calories' : `total calories · ~${avgDailyCalories}/day avg`}
            </p>
          </div>
          <div className="hero-macros">
            <MacroRing label="Protein" value={selectedDay !== null || !isCurrentMonth ? statProtein : todayProtein} max={150} color="protein" />
            <MacroRing label="Carbs" value={selectedDay !== null || !isCurrentMonth ? statCarbs : todayCarbs} max={250} color="carbs" />
            <MacroRing label="Fat" value={selectedDay !== null || !isCurrentMonth ? statFat : todayFat} max={65} color="fat" />
          </div>
        </div>
        {selectedDay === null && !isCurrentMonth && (
          <p className="label" style={{ fontSize: 11, marginTop: 14 }}>{daysWithLogs} day{daysWithLogs !== 1 ? 's' : ''} logged · {monthLogs.length} entries</p>
        )}
      </div>

      {loading ? (
        <SkeletonLoader count={4} />
      ) : Object.keys(groupedByDate).length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🥗</div>
          <p className="empty-state-title">{isCurrentMonth ? 'No food logged yet' : `No food logged in ${label}`}</p>
          <p className="empty-state-desc">{isCurrentMonth ? 'Start tracking your meals to see calories and macros' : 'Try navigating to a different month'}</p>
          {isCurrentMonth && (
            <div className="flex gap-2">
              <button onClick={() => setCameraOpen(true)} className="btn-secondary" style={{ padding: '10px 20px', borderRadius: 20, minWidth: 'auto' }}>
                📸 Take Photo
              </button>
              <button onClick={openAddModal} className="btn-primary" style={{ padding: '10px 20px', borderRadius: 20, minWidth: 'auto' }}>
                + Log Manually
              </button>
            </div>
          )}
        </div>
      ) : (
        Object.entries(groupedByDate).map(([date, items]) => (
          <div key={date} className="flex flex-col" style={{ gap: 12 }}>
            <p className="stat-label">{date}</p>
            {items.map(item => (
              <Card key={item.id} onClick={() => openEditEntry(item)} className="flex items-center justify-between cursor-pointer" style={{ padding: '14px 16px' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-semibold uppercase tracking-wider">{item.meal_type}</span>
                    <p className="font-medium text-sm truncate text-foreground">{item.food_name}</p>
                  </div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-1 truncate" style={{ opacity: 0.8 }}>{item.description}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-1.5">{item.calories} cal &middot; {item.protein}p &middot; {item.carbs}c &middot; {item.fat}f</p>
                </div>
                <svg className="card-chevron w-4 h-4 ml-2" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Card>
            ))}
          </div>
        ))
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Log Food">
        {analyzing ? (
          <div className="flex flex-col items-center py-10 gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-muted-foreground">Analyzing your meal...</p>
          </div>
        ) : (
          <>
            {/* Smart AI input */}
            <div style={{ marginBottom: 28 }}>
              <label className="form-label">Describe what you ate</label>
              <textarea
                value={smartText}
                onChange={e => setSmartText(e.target.value)}
                placeholder="e.g. two eggs, two parathas, an apple, orange juice and a coffee"
                className="form-input"
                rows={3}
                style={{ resize: 'none', marginBottom: 12 }}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSmartAnalyze() } }}
              />
              <button
                type="button"
                onClick={handleSmartAnalyze}
                disabled={!smartText.trim()}
                className="btn-primary w-full"
                style={{ padding: '12px 24px', opacity: smartText.trim() ? 1 : 0.4 }}
              >
                ✨ Analyze with AI
              </button>
              <p className="text-hint">AI calculates calories & macros for you. Press Enter or click Analyze.</p>
            </div>

            {/* Divider */}
            <div className="flex items-center gap-4" style={{ marginBottom: 24 }}>
              <div className="flex-1 border-t border-border" />
              <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-wider">or enter manually</span>
              <div className="flex-1 border-t border-border" />
            </div>

            {/* Manual form */}
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Meal Type</label>
                <select value={form.meal_type} onChange={e => setForm(f => ({ ...f, meal_type: e.target.value }))} className="form-input">
                  <option value="breakfast">🌅 Breakfast</option><option value="lunch">☀️ Lunch</option><option value="dinner">🌙 Dinner</option><option value="snack">🍿 Snack</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Name</label>
                <input placeholder="e.g. Breakfast Plate" value={form.food_name} onChange={e => setForm(f => ({ ...f, food_name: e.target.value }))} className="form-input" required />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea placeholder="What's in it? (optional)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="form-input" rows={2} style={{ resize: 'none' }} />
              </div>
              <div className="form-group">
                <label className="form-label">Nutrition</label>
                <div className="form-row grid-cols-2">
                  <div>
                    <label className="form-label" style={{ fontSize: 9, marginBottom: 4 }}>Calories</label>
                    <input placeholder="0" type="number" value={form.calories} onChange={e => setForm(f => ({ ...f, calories: e.target.value }))} className="form-input" required />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: 9, marginBottom: 4 }}>Protein (g)</label>
                    <input placeholder="0" type="number" value={form.protein} onChange={e => setForm(f => ({ ...f, protein: e.target.value }))} className="form-input" />
                  </div>
                </div>
              </div>
              <div className="form-group">
                <div className="form-row grid-cols-2">
                  <div>
                    <label className="form-label" style={{ fontSize: 9, marginBottom: 4 }}>Carbs (g)</label>
                    <input placeholder="0" type="number" value={form.carbs} onChange={e => setForm(f => ({ ...f, carbs: e.target.value }))} className="form-input" />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: 9, marginBottom: 4 }}>Fat (g)</label>
                    <input placeholder="0" type="number" value={form.fat} onChange={e => setForm(f => ({ ...f, fat: e.target.value }))} className="form-input" />
                  </div>
                </div>
              </div>
              {/* Servings multiplier */}
              <div className="form-group">
                <label className="form-label">Servings</label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setServings(s => Math.max(1, s - 1))} className="btn-secondary" style={{ padding: '8px 14px', minWidth: 'auto', fontSize: 16, fontWeight: 700 }}>−</button>
                  <input type="number" min="1" max="20" value={servings} onChange={e => setServings(Math.max(1, Number(e.target.value) || 1))} className="form-input text-center font-bold" style={{ width: 60 }} />
                  <button type="button" onClick={() => setServings(s => Math.min(20, s + 1))} className="btn-secondary" style={{ padding: '8px 14px', minWidth: 'auto', fontSize: 16, fontWeight: 700 }}>+</button>
                  {servings > 1 && <span className="text-xs text-muted-foreground">= {Math.round(Number(form.calories || 0) * servings)} cal total</span>}
                </div>
              </div>
              <button type="submit" className="btn-primary w-full" style={{ padding: '12px 24px' }}>
                {servings > 1 ? `Save (${servings} servings)` : 'Save'}
              </button>
            </form>
          </>
        )}
      </Modal>

      {/* Edit Food Entry Modal */}
      <Modal open={editModalOpen} onClose={() => { setEditModalOpen(false); setEditingEntry(null) }} title="Edit Food Entry">
        <form onSubmit={handleEditSubmit}>
          <div className="form-group">
            <label className="form-label">Meal Type</label>
            <select value={editForm.meal_type} onChange={e => setEditForm(f => ({ ...f, meal_type: e.target.value }))} className="form-input">
              <option value="breakfast">🌅 Breakfast</option><option value="lunch">☀️ Lunch</option><option value="dinner">🌙 Dinner</option><option value="snack">🍿 Snack</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Name</label>
            <input value={editForm.food_name} onChange={e => setEditForm(f => ({ ...f, food_name: e.target.value }))} className="form-input" required />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))} className="form-input" rows={2} style={{ resize: 'none' }} placeholder="What's in it? (optional)" />
          </div>
          <div className="form-group">
            <label className="form-label">Nutrition</label>
            <div className="form-row grid-cols-2">
              <div>
                <label className="form-label" style={{ fontSize: 9, marginBottom: 4 }}>Calories</label>
                <input type="number" value={editForm.calories} onChange={e => setEditForm(f => ({ ...f, calories: e.target.value }))} className="form-input" required />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: 9, marginBottom: 4 }}>Protein (g)</label>
                <input type="number" value={editForm.protein} onChange={e => setEditForm(f => ({ ...f, protein: e.target.value }))} className="form-input" />
              </div>
            </div>
          </div>
          <div className="form-group">
            <div className="form-row grid-cols-2">
              <div>
                <label className="form-label" style={{ fontSize: 9, marginBottom: 4 }}>Carbs (g)</label>
                <input type="number" value={editForm.carbs} onChange={e => setEditForm(f => ({ ...f, carbs: e.target.value }))} className="form-input" />
              </div>
              <div>
                <label className="form-label" style={{ fontSize: 9, marginBottom: 4 }}>Fat (g)</label>
                <input type="number" value={editForm.fat} onChange={e => setEditForm(f => ({ ...f, fat: e.target.value }))} className="form-input" />
              </div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Date</label>
            <input type="date" value={editForm.logged_at} onChange={e => setEditForm(f => ({ ...f, logged_at: e.target.value }))} className="form-input" />
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

      <CameraModal open={cameraOpen} onClose={() => setCameraOpen(false)} onCapture={handleCameraCapture} />
    </div>
  )
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result.split(',')[1])
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
