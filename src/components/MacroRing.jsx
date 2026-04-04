import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

const COLORS = {
  protein: 'var(--chart-1)',
  carbs: 'var(--chart-2)',
  fat: 'var(--destructive)',
}

export default function MacroRing({ label, value, max, color = 'protein' }) {
  const pct = max > 0 ? Math.min(value / max, 1) : 0
  const data = [
    { value: pct },
    { value: 1 - pct },
  ]

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative w-16 h-16">
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              innerRadius="70%"
              outerRadius="100%"
              startAngle={90}
              endAngle={-270}
              dataKey="value"
              stroke="none"
            >
              <Cell fill={COLORS[color] || COLORS.protein} />
              <Cell fill="var(--border)" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-xs font-semibold text-foreground">{Math.round(value)}</span>
        </div>
      </div>
      <span className="text-xs text-muted-foreground">{label}</span>
    </div>
  )
}
