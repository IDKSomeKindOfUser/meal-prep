import type { MealType, Recipe } from '../data/types'
import { violations, type Limit } from './constraints'
import { storable, type Block } from './schedule'
import type { Catalog, Limits, Slot } from './types'

const TYPE: Record<Slot, MealType> = { breakfast: 'breakfast', lunch: 'main', dinner: 'main', snack: 'snack' }

export function candidates(slot: Slot, block: Block, limits: Limits, catalog: Catalog): Recipe[] {
  return catalog.recipes.filter(
    (r) => r.type === TYPE[slot] && storable(r, block) && violations(r, limits, catalog.ingredient).length === 0,
  )
}

export interface Missing {
  slot: Slot
  block: Block
  /** Limits that would free some recipes if lifted alone, the most useful first. Empty: no single one helps. */
  helps: { limit: Limit | 'storage'; recipes: number }[]
}

export function explainMissing(slot: Slot, block: Block, limits: Limits, catalog: Catalog): Missing {
  const counts = new Map<Limit | 'storage', number>()
  for (const r of catalog.recipes) {
    if (r.type !== TYPE[slot]) continue
    const broken: (Limit | 'storage')[] = violations(r, limits, catalog.ingredient)
    if (!storable(r, block)) broken.push('storage')
    if (broken.length === 1) counts.set(broken[0]!, (counts.get(broken[0]!) ?? 0) + 1)
  }
  const helps = [...counts].map(([limit, recipes]) => ({ limit, recipes })).sort((a, b) => b.recipes - a.recipes)
  return { slot, block, helps }
}
