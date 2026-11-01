import Card from './Card'

export default function StatTile({ icon, label, value, sub, onClick, className = '' }) {
  return (
    <Card padding="sm" onClick={onClick} className={className}>
      {icon && (
        <div className="w-[34px] h-[34px] rounded-full bg-card-2 grid place-items-center mb-2.5 text-base">
          {icon}
        </div>
      )}
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="text-[22px] font-bold text-fg tabular-nums leading-tight mt-0.5">{value}</p>
      {sub && <p className="text-xs text-muted mt-0.5">{sub}</p>}
    </Card>
  )
}
