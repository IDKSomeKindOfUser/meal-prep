import type { Recipe } from '../data/types'
import type { Catalog } from './types'

export interface PortionedDish {
  recipe: Recipe
  scale: number
  /** Raw grams for all portions of the batch. */
  batch: { id: string; grams: number }[]
  /** Per portion. */
  kcal: number
  protein: number
  fat: number
  carbs: number
}
export interface PortionedDay {
  dishes: PortionedDish[]
  kcal: number
  protein: number
  fat: number
  carbs: number
}

const MIN_SCALE = 0.5
const MAX_SCALE = 2
/** A lemon is cut into eight wedges. */
export const LEMON_WEDGES = 8

function portionDish(recipe: Recipe, days: number, scale: number, lookup: Catalog['ingredient']): PortionedDish {
  const out: PortionedDish = { recipe, scale, batch: [], kcal: 0, protein: 0, fat: 0, carbs: 0 }
  for (const { id, grams } of recipe.ingredients) {
    const product = lookup(id)
    const whole = product.pieceGrams
    const piece = whole !== null && id === 'lemon' ? whole / LEMON_WEDGES : whole
    const wanted = grams * scale
    let total: number
    if (piece === null) total = Math.round(wanted) * days
    else if (wanted >= piece * 0.75) total = Math.round(wanted / piece) * piece * days
    else total = Math.max(1, Math.round((wanted * days) / piece)) * piece
    out.batch.push({ id, grams: total })
    const share = total / days / 100
    out.kcal += product.kcal * share
    out.protein += product.protein * share
    out.fat += product.fat * share
    out.carbs += product.carbs * share
  }
  return out
}

function dayAt(recipes: readonly Recipe[], days: number, scale: number, lookup: Catalog['ingredient']): PortionedDay {
  const dishes = recipes.map((r) => portionDish(r, days, scale, lookup))
  const sum = (key: 'kcal' | 'protein' | 'fat' | 'carbs') => dishes.reduce((a, d) => a + d[key], 0)
  return { dishes, kcal: sum('kcal'), protein: sum('protein'), fat: sum('fat'), carbs: sum('carbs') }
}

/** Sizes the dishes of one day, eaten `days` days in a row, to the calorie target. */
export function portionDay(
  recipes: readonly Recipe[], days: number, kcal: number, lookup: Catalog['ingredient'],
): PortionedDay {
  const base = dayAt(recipes, days, 1, lookup)
  const clamp = (s: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, s))
  let scale = clamp(kcal / base.kcal)
  let best = base
  // Whole pieces make calories jump, so correct the scale a few times and keep the closest result.
  for (let i = 0; i < 4; i++) {
    const next = dayAt(recipes, days, scale, lookup)
    if (Math.abs(next.kcal - kcal) < Math.abs(best.kcal - kcal)) best = next
    if (Math.abs(best.kcal / kcal - 1) < 0.01) break
    scale = clamp((scale * kcal) / next.kcal)
  }
  return best
}
