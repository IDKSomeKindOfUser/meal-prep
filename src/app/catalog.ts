import { ingredients } from '../data'
import { defaultCatalog } from '../planner'
import type { Catalog } from '../planner/types'
import { EMPTY_OWN, toRecipe, type Own } from './own'

/** The user's own price: `price` rubles for `grams`. For products sold by weight `grams` is 1000. */
export interface PriceOverride { price: number; grams: number }
export type PriceOverrides = Record<string, PriceOverride>

export const validOverride = (x: unknown): x is PriceOverride => {
  const o = x as PriceOverride
  return typeof o === 'object' && o !== null && Number.isFinite(o.price) && o.price > 0 && Number.isFinite(o.grams) && o.grams > 0
}

/** The built-in catalog with the user's prices, products and recipes on top. */
export function makeCatalog(overrides: PriceOverrides, own: Own = EMPTY_OWN): Catalog {
  if (Object.keys(overrides).length === 0 && own.products.length === 0 && own.recipes.length === 0) return defaultCatalog
  const products = new Map(own.products.map((p) => [p.id, p]))
  const ingredient: Catalog['ingredient'] = (id) => products.get(id) ?? defaultCatalog.ingredient(id)
  return {
    recipes: [...defaultCatalog.recipes, ...own.recipes.map((r) => toRecipe(r, ingredient))],
    ingredient,
    price: (id) => {
      const product = products.get(id)
      if (product) {
        const { price, grams } = product.price
        return { perKg: (price / grams) * 1000, pack: product.buyBy === 'pack' ? { grams, price } : null }
      }
      const base = defaultCatalog.price(id)
      const mine = overrides[id]
      if (!base || !mine) return base
      const perKg = (mine.price / mine.grams) * 1000
      return { ...base, perKg, pack: base.pack ? { grams: mine.grams, price: mine.price } : null }
    },
  }
}

/** Drops unknown products and unusable numbers. */
export function parseOverrides(saved: unknown): PriceOverrides {
  const result: PriceOverrides = {}
  if (typeof saved !== 'object' || saved === null) return result
  for (const [id, value] of Object.entries(saved)) {
    if (ingredients.get(id)?.place && validOverride(value)) result[id] = { price: value.price, grams: value.grams }
  }
  return result
}
