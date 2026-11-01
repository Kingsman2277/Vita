import { useId } from 'react'
import {
  AreaChart as RcAreaChart,
  Area,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from 'recharts'

const ACCENT = '#FF5A1F'

// Dot drawn only on the final point: filled orange with a white ring, as in
// the mockups. recharts calls this for every point, so we filter by index.
function LastDot({ cx, cy, index, dataLength }) {
  if (index !== dataLength - 1 || cx == null || cy == null) return null
  return <circle cx={cx} cy={cy} r={4} fill={ACCENT} stroke="#FFFFFF" strokeWidth={1.5} />
}

export default function AreaChart({
  data = [],
  xKey,
  yKey,
  refLine,
  height = 160,
  showAxis = true,
  className = '',
}) {
  // ResponsiveContainer measures its parent, so the parent needs a resolved
  // size — an explicit height here avoids recharts' "width(-1) height(-1)"
  // warning when it mounts inside an auto-height flex child.
  const gradientId = `area-fill-${useId().replace(/:/g, '')}`

  if (!data.length) return <div style={{ height }} className={className} />

  return (
    <div style={{ height, width: '100%' }} className={className}>
      <ResponsiveContainer width="100%" height="100%">
        <RcAreaChart data={data} margin={{ top: 6, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity={0.55} />
              <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
            </linearGradient>
          </defs>

          <CartesianGrid vertical={false} stroke="#26262A" strokeDasharray="2 4" />

          <XAxis
            dataKey={xKey}
            hide={!showAxis}
            tickLine={false}
            axisLine={false}
            tick={{ fill: 'var(--color-muted-2)', fontSize: 11 }}
            minTickGap={24}
          />
          <YAxis
            hide={!showAxis}
            tickLine={false}
            axisLine={false}
            width={34}
            tick={{ fill: 'var(--color-muted-2)', fontSize: 11 }}
            /* These series are trends (weight, cumulative spend), not counts:
               anchoring the axis at 0 flattens them into a solid block. */
            domain={['auto', 'auto']}
          />

          {refLine && (
            <ReferenceLine
              y={refLine.y}
              stroke="#8E8E93"
              strokeDasharray="4 4"
              /* A goal or budget line sits outside the data range by
                 definition — widen the axis so it stays visible. */
              ifOverflow="extendDomain"
              label={
                refLine.label
                  ? { value: refLine.label, position: 'insideTopRight', dy: -6, fill: '#8E8E93', fontSize: 11 }
                  : undefined
              }
            />
          )}

          <Area
            type="monotone"
            dataKey={yKey}
            stroke={ACCENT}
            strokeWidth={2.2}
            fill={`url(#${gradientId})`}
            dot={<LastDot dataLength={data.length} />}
            activeDot={{ r: 4, fill: ACCENT, stroke: '#FFFFFF', strokeWidth: 1.5 }}
            isAnimationActive={false}
          />
        </RcAreaChart>
      </ResponsiveContainer>
    </div>
  )
}
