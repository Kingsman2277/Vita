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
      <div
        className="flex items-center justify-center text-muted-foreground text-sm"
        style={{ height: 200 }}
      >
        No spending data yet
      </div>
    )
  }

  return (
    <div>
      {/* Donut chart — fixed height so the ResponsiveContainer has room */}
      <div style={{ width: '100%', height: 220 }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              innerRadius="58%"
              outerRadius="82%"
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
      </div>

      {/* Legend — separate block, wraps cleanly on narrow widths */}
      <div
        className="flex flex-wrap items-center justify-center"
        style={{ gap: '10px 14px', marginTop: 18 }}
      >
        {data.map(({ name, value }) => (
          <div key={name} className="flex items-center" style={{ gap: 7, fontSize: 12, lineHeight: 1 }}>
            <span
              aria-hidden="true"
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: COLORS[name] || 'var(--chart-3)',
                flexShrink: 0,
              }}
            />
            <span style={{ whiteSpace: 'nowrap' }}>
              {getCategoryEmoji(name)} ${value.toFixed(0)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
