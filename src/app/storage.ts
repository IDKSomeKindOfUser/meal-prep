import { ALLERGENS } from '../data/types'
import { KINDS, MEATS } from '../planner/prefer'
import { describeMenu, type Menu } from '../planner'
import { blocks } from '../planner/schedule'
import { SLOTS, TOOLS, type Catalog, type Settings } from '../planner/types'
import { makeCatalog, parseOverrides, type PriceOverrides } from './catalog'
import { isIsoDate } from './dates'
import { EMPTY_FORM, type Form } from './form'
import { EMPTY_OWN, parseOwn, type Own } from './own'
import { parseSync, type SyncMarks } from './sync'

export interface SavedPlan {
  settings: Settings
  menu: Menu
  seed: number
  /** The first day. */
  start: string
  /** The user replaced dishes, so the menu is no longer the best one found. */
  edited?: boolean
  /** Bought items, as `week:product`. */
  checked?: string[]
  /** Dishes marked as cooked, as `block:slot`. */
  cooked?: string[]
}
/** The key of a dish in `SavedPlan.cooked`. */
export const cookedKey = (block: number, slot: string) => `${block}:${slot}`

/** Keys of the dishes cooked on one cooking day: what is cooked in one go. */
export const cookingKeys = (cookTimes: Settings['cookTimes'], weeks: Settings['weeks'], cookDay: number) =>
  blocks(cookTimes, weeks).flatMap((b, i) => (b.cookDay === cookDay ? SLOTS.map((slot) => cookedKey(i, slot)) : []))
export interface SavedState {
  version: 1
  form: Form
  plan: SavedPlan | null
  /** The user's own prices by product. */
  prices: PriceOverrides
  /** The user's own products and recipes. */
  own: Own
  sync?: SyncMarks
}
export const EMPTY_STATE: SavedState = { version: 1, form: EMPTY_FORM, plan: null, prices: {}, own: EMPTY_OWN }

const oneOf = (...values: unknown[]) => (x: unknown) => values.includes(x)
const listOf = (ok: (x: unknown) => boolean) => (x: unknown) => Array.isArray(x) && x.every(ok)
const text = (x: unknown) => typeof x === 'string'
function isPrefer(x: unknown): boolean {
  const p = x as Record<string, unknown> | null
  return typeof p === 'object' && p !== null && listOf(oneOf(...MEATS))(p.meats) && listOf(oneOf(...KINDS))(p.kinds)
}
const CHECKS: { [K in keyof Form]: (x: unknown) => boolean } = {
  normBy: oneOf('profile', 'manual'), sex: oneOf('', 'male', 'female'),
  age: text, height: text, weight: text, kcal: text, protein: text, budget: text,
  activity: oneOf('low', 'light', 'medium', 'high', 'veryHigh'), goal: oneOf('lose', 'keep', 'gain'),
  allergens: listOf(oneOf(...ALLERGENS)), excluded: listOf(text), tools: listOf(oneOf(...TOOLS)),
  spicy: oneOf(true, false), lactose: oneOf('none', 'low', 'yes'),
  cookTimes: oneOf(1, 2, 3, 7), weeks: oneOf(1, 4), maxMinutes: oneOf('', '30', '45', '60'),
  prefer: isPrefer,
}

function parseForm(saved: unknown): Form {
  const form = { ...EMPTY_FORM } as Record<string, unknown>
  if (typeof saved === 'object' && saved !== null)
    for (const [key, ok] of Object.entries(CHECKS)) {
      const value = (saved as Record<string, unknown>)[key]
      if (ok(value)) form[key] = value
    }
  return form as unknown as Form
}

function parsePlan(saved: unknown, catalog: Catalog): SavedPlan | null {
  try {
    const plan = saved as SavedPlan
    if (!isIsoDate(plan.start)) return null
    if (!Array.isArray(plan.checked) || !plan.checked.every((x) => typeof x === 'string')) delete plan.checked
    if (!Array.isArray(plan.cooked) || !plan.cooked.every((x) => typeof x === 'string')) delete plan.cooked
    if (plan.settings.prefer !== undefined && !isPrefer(plan.settings.prefer)) delete plan.settings.prefer
    // Throws when the menu does not match the schedule or the recipes.
    const report = describeMenu(plan.menu, plan.settings, catalog)
    return Number.isFinite(report.shopping.total) && report.days.every((d) => Number.isFinite(d.kcal)) ? plan : null
  } catch {
    return null
  }
}

/** Never throws: what cannot be used is dropped. */
export function parseState(saved: string | null): SavedState {
  try {
    const state = JSON.parse(saved ?? 'null') as SavedState | null
    if (state?.version !== 1) return EMPTY_STATE
    const prices = parseOverrides(state.prices)
    const own = parseOwn(state.own)
    const parsed: SavedState = { version: 1, form: parseForm(state.form), plan: parsePlan(state.plan, makeCatalog(prices, own)), prices, own }
    const sync = parseSync(state.sync, state, parsed)
    return sync ? { ...parsed, sync } : parsed
  } catch {
    return EMPTY_STATE
  }
}

const KEY = 'menu-state'
export function loadState(): SavedState {
  try {
    return parseState(localStorage.getItem(KEY))
  } catch {
    return EMPTY_STATE
  }
}
/** `false` when the browser refuses to store. */
export function saveState(state: SavedState): boolean {
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
    return true
  } catch {
    return false
  }
}
