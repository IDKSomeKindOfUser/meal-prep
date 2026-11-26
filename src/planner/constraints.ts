import { getIngredient, recipeAllergens, recipeLactose } from '../data'
import type { Recipe } from '../data/types'
import { NO_COOK, type Catalog, type Limits } from './types'

export type Limit = 'allergens' | 'excluded' | 'spicy' | 'tools' | 'lactose'

const LACTOSE = { none: 0, low: 1, yes: 2 }

/** The limits a recipe breaks. Possible traces of an allergen count as the allergen. */
export function violations(recipe: Recipe, limits: Limits, lookup: Catalog['ingredient'] = getIngredient): Limit[] {
  const { contains, may } = recipeAllergens(recipe, lookup)
  const broken: Limit[] = []
  if (limits.allergens.some((a) => contains.includes(a) || may.includes(a))) broken.push('allergens')
  if (recipe.ingredients.some((i) => limits.excluded.includes(i.id))) broken.push('excluded')
  if (recipe.spicy && !limits.spicy) broken.push('spicy')
  if (recipe.tools.some((t) => t !== NO_COOK && !limits.tools.includes(t))) broken.push('tools')
  if (LACTOSE[recipeLactose(recipe, lookup)] > LACTOSE[limits.lactose]) broken.push('lactose')
  return broken
}
