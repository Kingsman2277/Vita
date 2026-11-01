import { useState } from 'react'
import {
  AmountKeypad, AppHeader, AreaChart, BottomSheet, Button, Card, EmptyState,
  IconButton, ListRow, ProgressBar, ProgressRing, SectionHeader,
  SegmentedControl, Skeleton, StatTile, TagPill, WeekRow,
} from '../components/ui'
import WorkoutComplete from '../components/WorkoutComplete'
import { formatCurrency, formatDate } from '../lib/helpers'

// Dev-only gallery for the design "D" component set (docs/redesign §4.4).
// Registered in App.jsx behind `import.meta.env.DEV`, so it never ships.
// Delete this file once every screen has been rebuilt on these components.

const WEIGHT_SERIES = Array.from({ length: 30 }, (_, i) => ({
  day: `Oct ${i + 1}`,
  lb: 186 - i * 0.18 + Math.sin(i / 3) * 0.6,
}))

const WEEK = [
  { date: '2026-10-26', label: 'M', state: 'done' },
  { date: '2026-10-27', label: 'T', state: 'done' },
  { date: '2026-10-28', label: 'W', state: 'missed' },
  { date: '2026-10-29', label: 'T', state: 'rest' },
  { date: '2026-10-30', label: 'F', state: 'done' },
  { date: '2026-10-31', label: 'S', state: 'today', progress: 0.6 },
  { date: '2026-11-01', label: 'S', state: 'future' },
]

function Section({ title, children }) {
  return (
    <section className="flex flex-col gap-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{title}</p>
      {children}
    </section>
  )
}

export default function DevUI() {
  const [segment, setSegment] = useState('today')
  const [sheetOpen, setSheetOpen] = useState(false)
  const [amount, setAmount] = useState('24.50')
  const [completeOpen, setCompleteOpen] = useState(false)

  return (
    <div className="bg-bg min-h-dvh">
      <div className="mx-auto max-w-[480px] px-4 pt-6 pb-32 flex flex-col gap-7">
        <AppHeader
          avatarInitial="M"
          caption="Saturday, 31 October"
          title="Hi, Matteo"
          right={<IconButton label="Settings" icon={<span className="text-lg">⚙</span>} />}
        />

        <Section title="Buttons">
          <div className="flex flex-col gap-2">
            <Button full>Save expense · {formatCurrency(24.5)}</Button>
            <Button variant="secondary" full>Edit program</Button>
            <div className="flex gap-2">
              <Button variant="ghost" size="md">Ghost</Button>
              <Button size="sm">Small</Button>
              <Button size="md" disabled>Disabled</Button>
              <IconButton label="Close" icon={<span>✕</span>} />
            </div>
          </div>
        </Section>

        <Section title="Segmented control">
          <SegmentedControl
            value={segment}
            onChange={setSegment}
            options={[{ value: 'today', label: 'Today' }, { value: 'weekly', label: 'Weekly' }]}
          />
        </Section>

        <Section title="Tag pills">
          <div className="flex gap-2">
            <TagPill>On track</TagPill>
            <TagPill tone="neutral">Reimbursable</TagPill>
            <TagPill icon={<span>🏋</span>}>Upper</TagPill>
          </div>
        </Section>

        <Section title="Week row">
          <Card><WeekRow days={WEEK} /></Card>
        </Section>

        <Section title="Progress ring + bar">
          <Card>
            <div className="flex items-center gap-4">
              <ProgressRing value={0.47} label="47%" sub="left" />
              <div className="flex-1 flex flex-col gap-3">
                <ProgressBar value={62} max={100} />
                <ProgressBar value={110} max={100} tone="danger" />
              </div>
            </div>
          </Card>
        </Section>

        <Section title="Stat tiles">
          <div className="grid grid-cols-3 gap-2.5">
            <StatTile icon="💸" label="Spent" value={formatCurrency(42.18)} sub="3 expenses" />
            <StatTile icon="🍽" label="Calories" value="1,840" sub="P120·C180·F52" />
            <StatTile icon="🔥" label="Streak" value="7" sub="Rest day" />
          </div>
        </Section>

        <Section title="Section header + list rows">
          <Card>
            <SectionHeader title="Recent" action={{ label: 'View all' }} />
            <div className="mt-1">
              <ListRow
                icon="🛒" title="Metro run"
                meta={<><TagPill>Groceries</TagPill><span>{formatDate('2026-10-30')}</span></>}
                amount={`−${formatCurrency(42.18)}`}
                onClick={() => {}}
              />
              <ListRow
                icon="🍽" title="Lunch with Sam"
                meta={<><TagPill tone="neutral">Reimbursable</TagPill><span>{formatDate(new Date())}</span></>}
                amount={`−${formatCurrency(18)}`}
                onClick={() => {}}
              />
            </div>
          </Card>
        </Section>

        <Section title="Area chart">
          <Card>
            <SectionHeader title="Weight trend" action={{ label: 'View all' }} />
            <p className="text-xs text-muted mt-1">181.2 lb · −0.6 lb/wk · on pace for 172</p>
            <AreaChart
              data={WEIGHT_SERIES} xKey="day" yKey="lb"
              refLine={{ y: 172, label: 'Goal 172' }}
              className="mt-3"
            />
          </Card>
        </Section>

        <Section title="Empty state + skeleton">
          <Card>
            <EmptyState
              icon="🥗" title="No food logged yet"
              desc="Start tracking your meals to see calories and macros."
              action={<Button size="md">Log food</Button>}
            />
          </Card>
          <Card>
            <div className="flex flex-col gap-2">
              <Skeleton width="60%" height={20} />
              <Skeleton height={14} />
              <Skeleton width="40%" height={14} />
            </div>
          </Card>
        </Section>

        <Section title="Workout completion">
          <Button variant="secondary" full onClick={() => setCompleteOpen(true)}>Open completion screen</Button>
          <WorkoutComplete
            open={completeOpen}
            onClose={() => setCompleteOpen(false)}
            dayLabel="Upper"
            dateLabel="Friday's"
            streak={7}
            weekStats={{ completedCount: 5, days: [1, 2, 3, 4, 5] }}
            exercises={[
              { id: 1, exercise_name: 'Chest press', sets_reps: '3 x 10', weight_used: 60 },
              { id: 2, exercise_name: 'Cable fly', sets_reps: '3 x 10', weight_used: 80 },
              { id: 3, exercise_name: 'Lat pull-down', sets_reps: '3 x 10', weight_used: 70 },
              { id: 4, exercise_name: 'Shoulder press', sets_reps: '3 x 10', weight_used: 40 },
              { id: 5, exercise_name: 'Face pull', sets_reps: '3 x 10', weight_used: 30 },
            ]}
          />
        </Section>

        <Section title="Bottom sheet + keypad">
          <Button variant="secondary" full onClick={() => setSheetOpen(true)}>Open quick add</Button>
          <BottomSheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="Quick add">
            <p className="text-[46px] font-bold text-fg tabular-nums leading-none mb-5">
              <span className="text-[30px] text-muted">$</span>{amount || '0'}
            </p>
            <AmountKeypad value={amount} onChange={setAmount} />
            <Button full className="mt-4">
              Save expense · {formatCurrency(Number(amount) || 0)}
            </Button>
          </BottomSheet>
        </Section>
      </div>
    </div>
  )
}
