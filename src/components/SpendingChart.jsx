import { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { getCategoryEmoji } from '../lib/helpers'

const COLORS = {
  // New categories (in budget allocation order)
  groceries: 'var(--cat-groceries)',
  eating_out: 'var(--cat-eating-out)',
  transport: 'var(--cat-transport)',
  shopping: 'var(--cat-shopping)',
  pet: 'var(--cat-pet)',
  savings: 'var(--cat-savings)',
  // Legacy fallbacks
  food: 'var(--cat-eating-out)',
  girlfriend: 'var(--cat-pet)',
  fun: 'var(--cat-shopping)',
  necessities: 'var(--cat-transport)',
  other: 'var(--chart-3)',
}

export default function SpendingChart({ expenses }) {
  const data = useMemo(() => {
    const byCategory = (expenses || []).reduce((acc, e) => {
      const cat = e.category || 'other'
      acc[cat] = (acc[cat] || 0) + Number(e.amount)
      return acc
    }, {})
    return Object.entries(byCategory).map(([name, value]) => ({ name, value }))
  }, [expenses])

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        No spending data yet
      </div>
    )
  }

  return (
    <div className="h-48">
      <ResponsiveContainer>
        <PieChart>
          <Pie
            data={data}
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={3}
            dataKey="value"
            stroke="none"
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={COLORS[entry.name] || 'var(--chart-3)'} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--foreground)',
              fontSize: '0.75rem',
            }}
            formatter={(value, name) => [`$${value.toFixed(2)}`, `${getCategoryEmoji(name)} ${name}`]}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-3 justify-center mt-2">
        {data.map(({ name, value }) => (
          <div key={name} className="flex items-center gap-1.5 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ background: COLORS[name] || 'var(--chart-3)' }} />
            <span className="text-muted-foreground">{getCategoryEmoji(name)} ${value.toFixed(0)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
