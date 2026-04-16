import { useMemo } from 'react'
import {
  ComposedChart,
  Line,
  Scatter,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  CartesianGrid,
} from 'recharts'

/**
 * Weight trend chart.
 *  - `smoothed`: [{ date, weight, avg }]  (raw weight + 7-day MA)
 *  - `milestones`: [{ weight, date }]
 *  - `targetWeight`: optional horizontal reference line as a dotted level
 *  - `showMood`: if true, plot mood (1-5) as a secondary dashed line
 */
export default function WeightChart({ smoothed, milestones = [], targetWeight, showMood = false, logs = [] }) {
  const data = useMemo(() => {
    if (!smoothed || smoothed.length === 0) return []
    // Merge mood/energy from raw logs keyed by date so the scale maps cleanly.
    const moodByDate = new Map()
    for (const l of logs) {
      if (l.mood != null) moodByDate.set(l.date, Number(l.mood))
    }
    return smoothed.map(p => ({
      date: p.date,
      weight: Number(p.weight),
      avg: p.avg != null ? Number(p.avg.toFixed(2)) : null,
      mood: moodByDate.has(p.date) ? moodByDate.get(p.date) : null,
    }))
  }, [smoothed, logs])

  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-muted-foreground text-sm"
        style={{ height: 220 }}
      >
        No entries yet — add your first weight to see the chart
      </div>
    )
  }

  const weights = data.map(d => d.weight)
  const minW = Math.min(...weights, targetWeight || Infinity)
  const maxW = Math.max(...weights, targetWeight || -Infinity)
  const pad = Math.max(1, (maxW - minW) * 0.1)
  const yDomain = [Math.floor(minW - pad), Math.ceil(maxW + pad)]

  return (
    <div style={{ width: '100%', height: 260 }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 10, right: 14, bottom: 0, left: -8 }}>
          <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            tickFormatter={d => {
              const [, m, day] = d.split('-')
              return `${Number(m)}/${Number(day)}`
            }}
            stroke="var(--border)"
          />
          <YAxis
            yAxisId="weight"
            domain={yDomain}
            tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
            stroke="var(--border)"
            width={36}
          />
          {showMood && (
            <YAxis
              yAxisId="mood"
              orientation="right"
              domain={[1, 5]}
              tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }}
              stroke="var(--border)"
              width={24}
            />
          )}
          <Tooltip
            contentStyle={{
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              color: 'var(--foreground)',
              fontSize: '0.75rem',
            }}
            formatter={(value, name) => {
              if (name === 'Weight') return [`${Number(value).toFixed(1)} lbs`, name]
              if (name === '7-day avg') return [value != null ? `${Number(value).toFixed(1)} lbs` : '—', name]
              if (name === 'Mood') return [value != null ? `${value}/5` : '—', name]
              return [value, name]
            }}
          />
          {/* Target weight reference */}
          {isFinite(targetWeight) && (
            <Line
              yAxisId="weight"
              type="monotone"
              dataKey={() => targetWeight}
              name="Target"
              stroke="var(--warning)"
              strokeDasharray="4 4"
              strokeWidth={1.5}
              dot={false}
              activeDot={false}
              isAnimationActive={false}
            />
          )}
          {/* Raw weight points */}
          <Scatter
            yAxisId="weight"
            dataKey="weight"
            name="Weight"
            fill="var(--goal-body)"
          />
          {/* 7-day moving avg line */}
          <Line
            yAxisId="weight"
            type="monotone"
            dataKey="avg"
            name="7-day avg"
            stroke="var(--goal-body)"
            strokeWidth={2.5}
            dot={false}
            connectNulls
            isAnimationActive={false}
          />
          {showMood && (
            <Line
              yAxisId="mood"
              type="monotone"
              dataKey="mood"
              name="Mood"
              stroke="var(--cat-shopping)"
              strokeDasharray="2 3"
              strokeWidth={1.5}
              dot={{ r: 2, fill: 'var(--cat-shopping)' }}
              connectNulls
              isAnimationActive={false}
            />
          )}
          {/* Milestone dots */}
          {milestones.map(m => {
            const point = data.find(d => d.date === m.date)
            if (!point) return null
            return (
              <ReferenceDot
                key={`${m.date}-${m.weight}`}
                yAxisId="weight"
                x={m.date}
                y={point.weight}
                r={6}
                fill="var(--success)"
                stroke="var(--background)"
                strokeWidth={2}
                label={{
                  value: `${m.weight}`,
                  position: 'top',
                  fill: 'var(--success)',
                  fontSize: 10,
                  fontWeight: 600,
                }}
                isFront
              />
            )
          })}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
