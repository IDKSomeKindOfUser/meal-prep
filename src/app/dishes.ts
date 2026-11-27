import type { MealType, Recipe } from '../data/types'
import { daysBetween } from './dates'

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
