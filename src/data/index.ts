import { averagePrice, type AveragePrice, type PriceRecord } from './averagePrice'
import ingredientsJson from './ingredients.json'
import pricesJson from './prices.json'
import recipesJson from './recipes.json'
import yieldsJson from './yields.json'
import type { Allergen, AllergenInfo, Ingredient, Lactose, Recipe } from './types'

export const ingredients: ReadonlyMap<string, Ingredient> = new Map(
  (ingredientsJson as Ingredient[]).map((i) => [i.id, i]),
)
export const recipes = recipesJson as Recipe[]
/** Cooked weight divided by raw weight. */
export const yields: Record<string, number> = yieldsJson

export interface ProductPrice {
  /** Usual pack in grams; `null` for products sold by weight. */
  packGrams: number | null
  records: PriceRecord[]
}
/** Collected by hand, not produced by `npm run extract`. Water has no price. */
export const prices = pricesJson as Record<string, ProductPrice>

/** `null` for water, which is never bought. `pack` is `null` for products sold by weight. */
export function getPrice(id: string): (AveragePrice & { pack: { grams: number; price: number } | null }) | null {
  const { place } = getIngredient(id)
  if (place === null) return null
  const found = prices[id]
  if (!found) throw new Error(`No price for ingredient: ${id}`)
  const average = averagePrice(place, found.records)
  const grams = found.packGrams
  return { ...average, pack: grams === null ? null : { grams, price: (average.perKg * grams) / 1000 } }
}

export function getIngredient(id: string): Ingredient {
  const found = ingredients.get(id)
  if (!found) throw new Error(`Unknown ingredient: ${id}`)
  return found
}

export function recipeAllergens(recipe: Pick<Recipe, 'ingredients' | 'spiceAllergens'>, lookup = getIngredient): AllergenInfo {
  const all = [recipe.spiceAllergens, ...recipe.ingredients.map((i) => lookup(i.id).allergens)]
  const contains = new Set<Allergen>(all.flatMap((x) => x.contains))
  const may = new Set<Allergen>(all.flatMap((x) => x.may).filter((x) => !contains.has(x)))
  return { contains: [...contains].sort(), may: [...may].sort() }
}

export function recipeLactose(recipe: Recipe, lookup = getIngredient): Lactose {
  const levels = recipe.ingredients.map((i) => lookup(i.id).lactose)
  return levels.includes('yes') ? 'yes' : levels.includes('low') ? 'low' : 'none'
}
