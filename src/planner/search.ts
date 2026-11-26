import type { Recipe } from '../data/types'
import { portionDay, type PortionedDay } from './portions'
import { KCAL_TOLERANCE, PROTEIN_MIN } from './report'
import type { Block } from './schedule'
import { buyingUnit, unitsPerWeek } from './shopping'
import type { Catalog, Settings } from './types'

/** One recipe per slot, in the order of `SLOTS`, for every block. */
export type Picks = Recipe[][]
export type Goal = 'balanced' | 'cheapest'

const LUNCH = 1
const DINNER = 2

/** mulberry32 */
export function randomFrom(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), a | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Keeps the total cost up to date while single blocks change. */
class Cost {
  total = 0
  #rows = new Map<string, { needs: number[]; unit: { grams: number; cost: number } | null; cost: number }>()
  constructor(private catalog: Catalog, private weeks: number) {}

  change(week: number, before: PortionedDay | null, after: PortionedDay): void {
    const delta = new Map<string, number>()
    const collect = (day: PortionedDay, sign: number) => {
      for (const d of day.dishes) for (const i of d.batch) delta.set(i.id, (delta.get(i.id) ?? 0) + sign * i.grams)
    }
    if (before) collect(before, -1)
    collect(after, 1)
    for (const [id, grams] of delta) {
      if (grams === 0) continue
      let row = this.#rows.get(id)
      if (!row) {
        const unit = buyingUnit(this.catalog.ingredient(id), this.catalog.price)
        this.#rows.set(id, (row = { needs: Array<number>(this.weeks).fill(0), unit, cost: 0 }))
      }
      row.needs[week]! += grams
      if (!row.unit) continue
      const cost = unitsPerWeek(row.needs, row.unit.grams).reduce((a, b) => a + b, 0) * row.unit.cost
      this.total += cost - row.cost
      row.cost = cost
    }
  }
}

function dayPenalty(day: PortionedDay, s: Settings): number {
  const off = Math.abs(day.kcal / s.kcal - 1)
  const short = s.protein > 0 ? Math.max(0, 1 - day.protein / s.protein) : 0
  // Aim slightly inside the accepted range.
  const kcal = off * 10 + Math.max(0, off - KCAL_TOLERANCE * 0.9) * 2000
  const protein = short * 5 + Math.max(0, short - (1 - PROTEIN_MIN) * 0.9) * 1000
  return kcal + protein
}

function comfortPenalty(picks: Picks, schedule: readonly Block[], s: Settings): number {
  const weeksOf = new Map<string, number[]>()
  let penalty = 0
  picks.forEach((row, i) => {
    if (row[LUNCH] === row[DINNER]) penalty += 10
    for (const r of row) {
      const seen = weeksOf.get(r.id)
      const week = schedule[i]!.week
      if (seen) {
        for (const w of seen) penalty += w === week ? 3 : 1
        seen.push(week)
      } else weeksOf.set(r.id, [week])
      if (s.maxMinutes !== null) penalty += 4 * Math.max(0, r.minutes / s.maxMinutes - 1)
    }
  })
  return penalty / picks.length
}

export interface Found {
  picks: Picks
  cost: number
}

/** How strongly the seed's random liking of dishes can outweigh comfort; small next to the norm and the budget. */
const TASTE = 2

/** A random liking of every dish, so that different seeds settle on different good menus. */
export function tasteFrom(random: () => number): (recipe: Recipe) => number {
  const taste = new Map<string, number>()
  return (r) => {
    if (!taste.has(r.id)) taste.set(r.id, random() * TASTE)
    return taste.get(r.id)!
  }
}

/** Simulated annealing. Deterministic for a given random source unless the deadline cuts it short. */
export function search(
  start: Picks, options: readonly (readonly Recipe[])[][], schedule: readonly Block[],
  settings: Settings, catalog: Catalog, goal: Goal, steps: number, random: () => number, deadline: number,
  taste: (recipe: Recipe) => number = () => 0,
): Found {
  const picks = start.map((row) => [...row])
  const size = (row: readonly Recipe[], i: number) =>
    portionDay(row, schedule[i]!.days, settings.kcal, catalog.ingredient)
  const days = picks.map(size)
  const cost = new Cost(catalog, settings.weeks)
  days.forEach((d, i) => cost.change(schedule[i]!.week, null, d))
  const totalDays = schedule.reduce((a, b) => a + b.days, 0)
  const penalties = days.map((d, i) => (dayPenalty(d, settings) * schedule[i]!.days) / totalDays)

  const score = () => {
    const daily = penalties.reduce((a, b) => a + b, 0)
    if (goal === 'cheapest') return daily + cost.total / totalDays / 10
    const { budget } = settings
    const over = budget !== null && cost.total > budget ? 20 + (200 * (cost.total - budget)) / budget : 0
    const liking = picks.reduce((sum, row) => sum + row.reduce((a, r) => a + taste(r), 0), 0) / picks.length
    return daily + over + comfortPenalty(picks, schedule, settings) + liking
  }

  let current = score()
  let bestScore = current
  let best: Found = { picks: picks.map((row) => [...row]), cost: cost.total }
  for (let step = 0; step < steps; step++) {
    if (step % 64 === 0 && performance.now() > deadline) break
    const temperature = 2 * 0.002 ** (step / steps)
    const i = Math.floor(random() * picks.length)
    const slot = Math.floor(random() * options[i]!.length)
    const pool = options[i]![slot]!
    const old = picks[i]![slot]!
    const next = pool[Math.floor(random() * pool.length)]!
    if (next === old) continue
    const oldDay = days[i]!
    const oldPenalty = penalties[i]!
    const { week, days: length } = schedule[i]!
    picks[i]![slot] = next
    const nextDay = size(picks[i]!, i)
    days[i] = nextDay
    penalties[i] = (dayPenalty(nextDay, settings) * length) / totalDays
    cost.change(week, oldDay, nextDay)
    const after = score()
    if (after <= current || random() < Math.exp((current - after) / temperature)) {
      current = after
      if (after < bestScore - 1e-9) {
        bestScore = after
        best = { picks: picks.map((row) => [...row]), cost: cost.total }
      }
    } else {
      picks[i]![slot] = old
      days[i] = oldDay
      penalties[i] = oldPenalty
      cost.change(week, nextDay, oldDay)
    }
  }
  return best
}
