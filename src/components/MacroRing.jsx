import { memo, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

const COLORS = {
  protein: 'var(--chart-1)',
  carbs: 'var(--chart-2)',
  fat: 'var(--destructive)',
}

function MacroRing({ label, value, max, color = 'protein' }) {
  const data = useMemo(() => {
    const pct = max > 0 ? Math.min(value / max, 1) : 0
    return [{ value: pct }, { value: 1 - pct }]
  }, [value, max])

  return (
    <div className="flex flex-col items-center" style={{ gap: 8 }}>
      <div className="relative w-16 h-16" role="img" aria-label={`${label}: ${Math.round(value)} grams`}>
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
              isAnimationActive={false}
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
      <span className="text-[11px] text-muted-foreground font-medium">{label}</span>
    </div>
  )
}

export default memo(MacroRing)
