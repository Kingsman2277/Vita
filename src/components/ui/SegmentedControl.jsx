export default function SegmentedControl({ options = [], value, onChange, className = '' }) {
  return (
    <div className={`flex bg-seg-track rounded-[12px] p-1 ${className}`} role="tablist">
      {options.map(opt => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange?.(opt.value)}
            className={`flex-1 h-10 rounded-[9px] grid place-items-center text-sm font-semibold transition-colors duration-150 ${
              active ? 'bg-white-btn text-bg' : 'text-fg-2'
            }`}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
