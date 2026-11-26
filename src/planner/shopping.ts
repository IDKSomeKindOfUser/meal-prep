import type { Ingredient } from '../data/types'
import type { Catalog } from './types'

export interface ShoppingItem {
  id: string
  /** Grams the recipes of this week use. */
  need: number
  units: number
  unit: 'pack' | 'piece' | 'weight'
  /** Grams bought. */
  grams: number
  cost: number
}
export interface ShoppingWeek {
  market: ShoppingItem[]
  store: ShoppingItem[]
  marketCost: number
  storeCost: number
}
export interface ShoppingList {
  weeks: ShoppingWeek[]
  total: number
}

const WEIGHT_STEP = 10
/** Recipes count garlic in cloves, shops sell heads of about ten. */
const GARLIC_HEAD = 50

/** The smallest amount of a product that can be bought. `null` for water. */
export function buyingUnit(
  product: Ingredient, price: Catalog['price'],
): { unit: ShoppingItem['unit']; grams: number; cost: number } | null {
  const found = price(product.id)
  if (found === null) return null
  const piece = product.id === 'garlic' ? GARLIC_HEAD : product.pieceGrams
  const grams = found.pack?.grams ?? piece ?? WEIGHT_STEP
  const unit = found.pack ? 'pack' : piece ? 'piece' : 'weight'
  return { unit, grams, cost: found.pack?.price ?? (found.perKg * grams) / 1000 }
}

/** Units to buy each week; what is left over is used in the following weeks. */
export function unitsPerWeek(needs: ArrayLike<number>, unitGrams: number): number[] {
  let left = 0
  return Array.from(needs, (need) => {
    const units = Math.max(0, Math.ceil((need - left) / unitGrams - 1e-9))
    left += units * unitGrams - need
    return units
  })
}

export function shoppingList(needs: readonly ReadonlyMap<string, number>[], catalog: Catalog): ShoppingList {
  const weeks: ShoppingWeek[] = needs.map(() => ({ market: [], store: [], marketCost: 0, storeCost: 0 }))
  for (const id of new Set(needs.flatMap((w) => [...w.keys()]))) {
    const product = catalog.ingredient(id)
    const buying = buyingUnit(product, catalog.price)
    if (!buying) continue
    const perWeek = needs.map((w) => w.get(id) ?? 0)
    unitsPerWeek(perWeek, buying.grams).forEach((units, i) => {
      if (units === 0) return
      const week = weeks[i]!
      // Строку чека округляем до рубля, итоги суммируют уже округлённое: на экране всё сходится.
      const cost = Math.round(units * buying.cost)
      const item = { id, need: perWeek[i]!, units, unit: buying.unit, grams: units * buying.grams, cost }
      if (product.place === 'market') {
        week.market.push(item)
        week.marketCost += cost
      } else {
        week.store.push(item)
        week.storeCost += cost
      }
    })
  }
  return { weeks, total: weeks.reduce((a, w) => a + w.marketCost + w.storeCost, 0) }
}
