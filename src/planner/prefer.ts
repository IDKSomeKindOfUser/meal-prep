import type { Recipe } from '../data/types'

export const MEATS = ['chicken', 'turkey', 'beef', 'pork', 'fish', 'none'] as const
export type Meat = (typeof MEATS)[number]
export const KINDS = ['porridge', 'soup', 'pasta', 'rice', 'buckwheat', 'potato', 'legumes', 'wrap', 'bake'] as const
export type Kind = (typeof KINDS)[number]

/** Soft wishes: matching dishes are chosen more often, others stay possible. Empty lists mean no wish. */
export interface Prefer {
  meats: Meat[]
  kinds: Kind[]
}

const MEAT_OF: Record<string, Meat> = {
  chicken: 'chicken', thigh: 'chicken', turkey: 'turkey',
  beef: 'beef', bmince: 'beef', bfat: 'beef', pork: 'pork',
  salmon: 'fish', pink: 'fish', salmsalt: 'fish', shrimp: 'fish',
}

/** Meat and fish in the dish; `none` when there is neither. */
export function meatsOf(recipe: Recipe): Meat[] {
  const found = new Set(recipe.ingredients.map((i) => MEAT_OF[i.id]).filter((m) => m !== undefined))
  return found.size > 0 ? [...found] : ['none']
}

const KIND_BY_NAME: [Kind, RegExp][] = [
  ['porridge', /каш|овсянк|манк/i],
  ['soup', /суп|харчо|лагман|борщ/i],
  ['bake', /запеканк|запеч|маффин|печень/i],
]
const KIND_BY_INGREDIENT: [Kind, string[]][] = [
  ['pasta', ['pasta', 'noodle']],
  ['rice', ['rice']],
  ['buckwheat', ['buckw']],
  ['potato', ['potato']],
  ['legumes', ['lentr', 'lentg', 'beans', 'chickpea']],
  ['wrap', ['lavash', 'tortilla']],
]

export function kindsOf(recipe: Recipe): Kind[] {
  const ids = new Set(recipe.ingredients.map((i) => i.id))
  return [
    ...KIND_BY_NAME.filter(([, name]) => name.test(recipe.name)).map(([kind]) => kind),
    ...KIND_BY_INGREDIENT.filter(([, list]) => list.some((id) => ids.has(id))).map(([kind]) => kind),
  ]
}

/** How much a matching dish is preferred; enough to tip the choice, not to break the norm or the budget. */
const BONUS = 3

/**
 * The wishes that count for one cooking: its own when it was rebuilt alone, otherwise the common ones.
 * Without `cookDay` only the common ones are meant (the whole menu is being built).
 */
export function wishesFor(
  settings: { prefer?: Prefer; preferAt?: Record<number, Prefer> }, cookDay?: number,
): Prefer | undefined {
  return cookDay === undefined ? settings.prefer : settings.preferAt?.[cookDay] ?? settings.prefer
}

/** A score the search subtracts: higher for dishes that match the wishes. */
export function preference(prefer: Prefer | undefined): (recipe: Recipe) => number {
  if (!prefer || (prefer.meats.length === 0 && prefer.kinds.length === 0)) return () => 0
  const cache = new Map<string, number>()
  return (r) => {
    let value = cache.get(r.id)
    if (value === undefined) {
      value = (meatsOf(r).some((m) => prefer.meats.includes(m)) ? BONUS : 0)
        + (kindsOf(r).some((k) => prefer.kinds.includes(k)) ? BONUS : 0)
      cache.set(r.id, value)
    }
    return value
  }
}
