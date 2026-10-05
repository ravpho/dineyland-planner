import type { Catalog } from './catalog'
import { groupAttractions } from './grouping'
import { dayModel, dayRank, isBetter, rankOf, simulate, type DayModel, type Rank } from './route'
import { scheduleDay } from './schedule'
import type { Day, PlanItem } from './trip'

/** Candidates each starting order may evaluate (optimize-day-route design Decision 4). Counted, not timed. */
export const BUDGET_PER_SEED = 20_000
/** Moves take a run of up to this many consecutive attractions. */
const MAX_RUN = 3

export interface RouteSearch {
  /** The day's entries in the new order, or the day's own items when nothing ranks better. */
  items: PlanItem[]
  changed: boolean
  /** Candidates evaluated from each starting order. */
  evaluations: number[]
}

interface Candidate {
  order: PlanItem[]
  showTimes: Map<string, string>
  rank: Rank
}

/**
 * Reorders a day's attractions, and picks the start time of each show that is not locked, so the day
 * ends as early as the search can find (optimize-day-route design Decisions 1 and 4). Deterministic:
 * no randomness and no clock.
 */
export function searchRoute(day: Day, catalog: Catalog): RouteSearch {
  const model = dayModel(day, catalog)
  const current = dayRank(day, catalog)
  const parks = scheduleDay(day, catalog).parks
  const seeds = [
    model.attractions,
    groupAttractions(day, catalog, model.attractions),
    ...(parks.length > 1 ? [groupAttractions(day, catalog, model.attractions, { firstPark: parks[1] })] : []),
  ]

  let best: Candidate | undefined
  const evaluations: number[] = []
  for (const seed of seeds) {
    const { candidate, evaluated } = improve(model, seed)
    evaluations.push(evaluated)
    // Ties keep the earlier seed.
    if (!best || isBetter(candidate.rank, best.rank)) best = candidate
  }
  if (!best || !isBetter(best.rank, current)) return { items: day.items, changed: false, evaluations }
  return { items: simulate(model, best.order, best.showTimes).items, changed: true, evaluations }
}

export function optimizeRoute(day: Day, catalog: Catalog): PlanItem[] {
  return searchRoute(day, catalog).items
}

/** Local search from one starting order: keep any move that ranks strictly better, until none does. */
function improve(model: DayModel, seed: PlanItem[]): { candidate: Candidate; evaluated: number } {
  const movableShows = model.anchors.flatMap((entry) => {
    const item = model.items[model.index.get(entry.key)!]!
    return item.type === 'show' && !entry.timeLocked ? [{ entry, times: item.times }] : []
  })
  let evaluated = 0
  const evaluate = (order: PlanItem[], showTimes: Map<string, string>) => {
    evaluated++
    return rankOf(simulate(model, order, showTimes))
  }
  const current: Candidate = { order: seed, showTimes: new Map(), rank: evaluate(seed, new Map()) }
  const consider = (order: PlanItem[], showTimes: Map<string, string>) => {
    const rank = evaluate(order, showTimes)
    if (!isBetter(rank, current.rank)) return false
    Object.assign(current, { order, showTimes, rank })
    return true
  }

  let improved = true
  while (improved && evaluated < BUDGET_PER_SEED) {
    improved = false
    const n = current.order.length
    for (let run = 1; run <= MAX_RUN; run++) {
      for (let from = 0; from + run <= n; from++) {
        for (let to = 0; to <= n - run; to++) {
          if (to === from) continue
          if (evaluated >= BUDGET_PER_SEED) return { candidate: current, evaluated }
          const order = [...current.order]
          order.splice(to, 0, ...order.splice(from, run))
          if (consider(order, current.showTimes)) improved = true
        }
      }
    }
    for (const { entry, times } of movableShows) {
      for (const time of times) {
        if (time === (current.showTimes.get(entry.key) ?? entry.showTime ?? times[0])) continue
        if (evaluated >= BUDGET_PER_SEED) return { candidate: current, evaluated }
        if (consider(current.order, new Map(current.showTimes).set(entry.key, time))) improved = true
      }
    }
  }
  return { candidate: current, evaluated }
}
