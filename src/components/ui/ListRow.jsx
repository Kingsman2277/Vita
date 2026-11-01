export default function ListRow({ icon, title, meta, amount, onClick, divider = true, className = '' }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`w-full flex items-center gap-3 py-3 text-left ${divider ? 'border-b border-divider last:border-b-0' : ''} ${className}`}
    >
      {icon && (
        <span className="w-10 h-10 shrink-0 rounded-[12px] bg-card-2 grid place-items-center text-lg">
          {icon}
        </span>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-semibold text-fg truncate">{title}</span>
        {meta && <span className="flex items-center gap-1.5 mt-1 text-xs text-muted">{meta}</span>}
      </span>
      {amount != null && (
        <span className="shrink-0 text-[15px] font-bold text-fg tabular-nums">{amount}</span>
      )}
    </Tag>
  )
}
