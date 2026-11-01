import SegmentShell from '../components/SegmentShell'
import { BODY_SEGMENTS } from '../lib/nav'
import Workout from './Workout'
import Food from './Food'
import Goals from './Goals'

// Progress maps to the existing Goals page for now: it carries both the
// body-goal card (which links on to /body-goals) and the financial goal
// card. Phase 5 splits those — financial moves to Money, the rest merges
// with BodyGoals — but routing it here keeps everything reachable today.
export default function Body() {
  return (
    <SegmentShell
      base="/body"
      segments={BODY_SEGMENTS}
      views={{ training: Workout, food: Food, progress: Goals }}
    />
  )
}
