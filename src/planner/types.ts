import type { Allergen, Ingredient, Lactose, Recipe } from '../data/types'
import type { Prefer } from './prefer'

/** What the planner needs to know about products; the app adds the user's own recipes and prices here. */
export interface Catalog {
  recipes: readonly Recipe[]
  ingredient: (id: string) => Ingredient
  /** `null` for water. */
  price: (id: string) => { perKg: number; pack: { grams: number; price: number } | null } | null
}

/** Limits that a menu never breaks. Storage time is the remaining one and depends on the cooking schedule. */
export interface Limits {
  allergens: Allergen[]
  excluded: string[]
  spicy: boolean
  tools: string[]
  /** The highest lactose level allowed. */
  lactose: Lactose
}

export const TOOLS = ['плита', 'аэрогриль', 'духовка'] as const
export const NO_COOK = 'без готовки'
export const NO_LIMITS: Limits = { allergens: [], excluded: [], spicy: true, tools: [...TOOLS], lactose: 'yes' }

export type CookTimes = 1 | 2 | 3 | 7

export interface Settings extends Limits {
  kcal: number
  /** Grams per day. */
  protein: number
  weeks: 1 | 4
  cookTimes: CookTimes
  /** Rubles for the whole period. */
  budget: number | null
  /** Preferred longest cooking time of one dish. */
  maxMinutes: number | null
  /** Soft wishes asked before a rebuild. Absent in plans saved before they existed. */
  prefer?: Prefer
  /** Wishes of a single cooking (by its day) asked when only that cooking was rebuilt; they win over `prefer` there. */
  preferAt?: Record<number, Prefer>
}

export const SLOTS = ['breakfast', 'lunch', 'dinner', 'snack'] as const
export type Slot = (typeof SLOTS)[number]
