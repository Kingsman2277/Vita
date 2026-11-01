const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', '⌫']

// Controlled decimal keypad. `value` is the raw string the caller renders —
// this never formats, so an in-progress "12." survives a re-render.
export default function AmountKeypad({ value = '', onChange, decimals = 2, className = '' }) {
  const press = (key) => {
    if (key === '⌫') return onChange?.(value.slice(0, -1))
    if (key === '.') {
      if (decimals === 0 || value.includes('.')) return
      return onChange?.((value || '0') + '.')
    }
    const [, frac] = value.split('.')
    if (frac != null && frac.length >= decimals) return
    if (value === '0') return onChange?.(key)
    onChange?.(value + key)
  }

  return (
    <div className={`grid grid-cols-3 gap-2 ${className}`}>
      {KEYS.map(key => (
        <button
          key={key}
          type="button"
          onClick={() => press(key)}
          aria-label={key === '⌫' ? 'Delete' : key}
          className="h-[46px] rounded-[12px] bg-keypad text-fg text-lg font-semibold grid place-items-center transition-opacity duration-100 active:opacity-70"
        >
          {key}
        </button>
      ))}
    </div>
  )
}
