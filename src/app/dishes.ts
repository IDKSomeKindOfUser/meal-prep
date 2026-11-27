import { recipeAllergens } from '../data'
import type { MealType, Recipe } from '../data/types'
import { violations } from '../planner/constraints'
import { blocks, storable } from '../planner/schedule'
import type { Catalog, Settings } from '../planner/types'
import { daysBetween } from './dates'
import { ALLERGEN } from './labels'

export type DishFilter = 'all' | MealType

/** How many days the «Новое» mark stays after `added`. */
const NEW_DAYS = 7

export const isNew = (recipe: Recipe, today: string) =>
  recipe.added !== undefined && daysBetween(recipe.added, today) >= 0 && daysBetween(recipe.added, today) < NEW_DAYS

const normalize = (text: string) => text.toLowerCase().replaceAll('ё', 'е').replace(/\s+/g, ' ').trim()

/** Dishes of the chosen type whose name contains the query; new dishes go first. */
export function findDishes(recipes: readonly Recipe[], filter: DishFilter, query: string, today?: string): Recipe[] {
  const words = normalize(query)
  const found = recipes.filter((r) => (filter === 'all' || r.type === filter) && normalize(r.name).includes(words))
  return today ? [...found.filter((r) => isNew(r, today)), ...found.filter((r) => !isNew(r, today))] : found
}

/** Why the menu with these settings never gets this dish. Empty: it fits. */
export function unfitReasons(recipe: Recipe, settings: Settings | null, catalog: Catalog): string[] {
  if (!settings) return []
  const reasons: string[] = []
  for (const limit of violations(recipe, settings, catalog.ingredient)) {
    if (limit === 'allergens') {
      const { contains, may } = recipeAllergens(recipe, catalog.ingredient)
      const hit = settings.allergens.filter((a) => contains.includes(a) || may.includes(a))
      reasons.push(`аллерген: ${hit.map((a) => ALLERGEN[a].toLowerCase()).join(', ')}`)
    } else if (limit === 'excluded') {
      const names = recipe.ingredients.filter((i) => settings.excluded.includes(i.id)).map((i) => catalog.ingredient(i.id).name.toLowerCase())
      reasons.push(`исключено: ${names.join(', ')}`)
    } else if (limit === 'tools') {
      reasons.push(`нет техники: ${recipe.tools.filter((t) => t !== 'без готовки' && !settings.tools.includes(t)).join(', ')}`)
    } else reasons.push(limit === 'spicy' ? 'острое' : 'лактоза')
  }
  if (!blocks(settings.cookTimes, settings.weeks).some((b) => storable(recipe, b))) reasons.push('не хранится до следующей готовки')
  return reasons
}
