import { lazy } from 'react'
import SegmentShell from '../components/SegmentShell'
import { BODY_SEGMENTS } from '../lib/nav'
const Workout = lazy(() => import('./Workout'))
const Food = lazy(() => import('./Food'))
const BodyGoals = lazy(() => import('./BodyGoals'))

// Progress is the merged body view (docs/redesign §5): pace, weight
// trend, logging streak, body metrics and the body-goal editor. The old
// Goals page is gone — its savings card moved to Budget, and its height
// fields moved into the body-goal sheet here.
export default function Body() {
  return (
    <SegmentShell
      base="/body"
      segments={BODY_SEGMENTS}
      views={{ training: Workout, food: Food, progress: BodyGoals }}
    />
  )
}
