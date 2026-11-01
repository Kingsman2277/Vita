import { lazy } from 'react'
import SegmentShell from '../components/SegmentShell'
import { MONEY_SEGMENTS } from '../lib/nav'
const Finance = lazy(() => import('./Finance'))
const Budget = lazy(() => import('./Budget'))
const Summary = lazy(() => import('./Summary'))

export default function Money() {
  return (
    <SegmentShell
      base="/money"
      segments={MONEY_SEGMENTS}
      views={{ expenses: Finance, budget: Budget, insights: Summary }}
    />
  )
}
