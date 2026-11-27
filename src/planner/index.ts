import { getIngredient, getPrice, recipes } from '../data'
import type { Recipe } from '../data/types'
import { candidates, explainMissing, type Missing } from './candidates'
import { preference } from './prefer'
import { describeMenu, type Menu, type Report } from './report'
import { blocks } from './schedule'
import { randomFrom, search, tasteFrom, type Picks } from './search'
import { SLOTS, type Catalog, type Settings, type Slot } from './types'

export { describeMenu, type Menu, type Report } from './report'
export type { Missing } from './candidates'

export interface Plan {
  ok: true
  menu: Menu
  report: Report
}
export type PlanResult = Plan | { ok: false; missing: Missing[] }

const priceCache = new Map<string, ReturnType<typeof getPrice>>()
/** The built-in recipes and prices. */
export const defaultCatalog: Catalog = {
  recipes,
  ingredient: getIngredient,
  price: (id) => {
    if (!priceCache.has(id)) priceCache.set(id, getPrice(id))
    return priceCache.get(id)!
  },
}

const STEPS_PER_WEEK = 6000
/** Only runs when the budget is tight, so it can afford a longer search. */
const CHEAPEST_FACTOR = 3
const TIME_LIMIT_MS = 4500
/** How much a menu may cost above the cheapest one found when the budget is out of reach. */
const UNREACHABLE_SLACK = 1.05

/**
 * The same settings, catalog and seed give the same menu unless the time limit is reached.
 * `previous`: the menu being rebuilt; every cooking of the new one differs from it where possible.
 * `onlyCookDay`: rebuild only the cooking of that day; other cookings keep their dishes while they still fit.
 */
export function planMenu(
  settings: Settings, catalog: Catalog, seed: number, previous?: Menu, timeLimitMs = TIME_LIMIT_MS, onlyCookDay?: number,
): PlanResult {
  const schedule = blocks(settings.cookTimes, settings.weeks)
  const kept = (i: number) => onlyCookDay !== undefined && previous?.length === schedule.length && schedule[i]!.cookDay !== onlyCookDay
  const options = schedule.map((block, i) => SLOTS.map((slot) => {
    const all = candidates(slot, block, settings, catalog)
    const same = kept(i) ? all.filter((r) => r.id === previous![i]![slot]) : []
    return same.length > 0 ? same : all
  }))

  const missing: Missing[] = []
  schedule.forEach((block, i) =>
    SLOTS.forEach((slot, j) => {
      // Weeks share the same schedule, so the first one tells everything.
      if (block.week === 0 && options[i]![j]!.length === 0) missing.push(explainMissing(slot, block, settings, catalog))
    }),
  )
  if (missing.length > 0) return { ok: false, missing }

  const random = randomFrom(seed)
  const liking = tasteFrom(randomFrom(seed ^ 0x5eed))
  const wish = preference(settings.prefer)
  // The search lowers the score, so a wished dish counts below zero.
  const taste = (r: Recipe) => liking(r) - wish(r)
  const before = previous?.length === schedule.length ? previous.map((b) => SLOTS.map((s) => b[s])) : undefined
  const deadline = performance.now() + timeLimitMs
  const steps = STEPS_PER_WEEK * settings.weeks
  const run = (start: Picks, goal: 'balanced' | 'cheapest', s = settings) =>
    search(start, options, schedule, s, catalog, goal, goal === 'cheapest' ? steps * CHEAPEST_FACTOR : steps, random, deadline, taste, before)

  const pick = (pool: readonly Recipe[]) => pool[Math.floor(random() * pool.length)]!
  const start = options.map((row) => {
    const picks = row.map(pick)
    const [, lunch, dinner] = picks
    // The search never makes lunch and dinner equal, so it must not start that way either.
    const others = row[2]!.filter((r) => r !== lunch)
    if (lunch === dinner && others.length > 0) picks[2] = pick(others)
    return picks
  })
  let found = run(start, 'balanced')
  if (settings.budget !== null && found.cost > settings.budget) {
    const cheapest = run(found.picks, 'cheapest')
    // Make the cheapest menu nicer without leaving the budget. When the budget cannot be met,
    // a little over the cheapest found is allowed, or every rebuild would give the same menu.
    const budget = Math.max(settings.budget, cheapest.cost * UNREACHABLE_SLACK)
    const nicer = run(cheapest.picks, 'balanced', { ...settings, budget })
    found = nicer.cost <= budget ? nicer : cheapest
  }
  const menu: Menu = found.picks.map(([breakfast, lunch, dinner, snack]) => ({
    breakfast: breakfast!.id, lunch: lunch!.id, dinner: dinner!.id, snack: snack!.id,
  }))
  return { ok: true, menu, report: describeMenu(menu, settings, catalog) }
}

/** Puts another dish into a block; all its days change, because they are cooked together. */
export function replaceDish(
  menu: Menu, blockIndex: number, slot: Slot, recipeId: string, settings: Settings, catalog: Catalog,
): Menu {
  const block = blocks(settings.cookTimes, settings.weeks)[blockIndex]
  if (!block) throw new Error(`No block ${blockIndex}`)
  if (!candidates(slot, block, settings, catalog).some((r) => r.id === recipeId))
    throw new Error(`Recipe ${recipeId} does not fit here`)
  return menu.map((row, i) => (i === blockIndex ? { ...row, [slot]: recipeId } : row))
}

export interface Alternative {
  recipe: Recipe
  /** Per day after the replacement. */
  kcal: number
  protein: number
  /** Rubles for the whole period. */
  costChange: number
}

/** Dishes that can replace the current one, the closest to the calorie and protein goals first. */
export function alternatives(
  menu: Menu, blockIndex: number, slot: Slot, settings: Settings, catalog: Catalog,
): Alternative[] {
  const block = blocks(settings.cookTimes, settings.weeks)[blockIndex]
  if (!block) throw new Error(`No block ${blockIndex}`)
  const now = describeMenu(menu, settings, catalog).shopping.total
  const miss = (a: Alternative) =>
    Math.abs(a.kcal / settings.kcal - 1) + Math.max(0, 1 - a.protein / Math.max(1, settings.protein))
  // Блюда по пожеланиям из «Собрать меню заново» идут первыми.
  const wish = preference(settings.prefer)
  return candidates(slot, block, settings, catalog)
    .filter((r) => r.id !== menu[blockIndex]![slot])
    .map((recipe) => {
      const changed = menu.map((row, i) => (i === blockIndex ? { ...row, [slot]: recipe.id } : row))
      const report = describeMenu(changed, settings, catalog)
      const { kcal, protein } = report.blocks[blockIndex]!.day
      return { recipe, kcal, protein, costChange: report.shopping.total - now }
    })
    .sort((a, b) => wish(b.recipe) - wish(a.recipe) || miss(a) - miss(b))
}
