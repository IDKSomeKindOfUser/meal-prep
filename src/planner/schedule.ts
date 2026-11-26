import type { Recipe } from '../data/types'
import type { CookTimes } from './types'

/** Consecutive days that share the same set of dishes, cooked on one day. Days count from 0. */
export interface Block {
  week: number
  cookDay: number
  firstDay: number
  days: number
}

/** [cooking day, first day, number of days] within a week. */
const WEEK: Record<CookTimes, [number, number, number][]> = {
  1: [[0, 0, 4], [0, 4, 3]],
  2: [[0, 0, 4], [4, 4, 3]],
  3: [[0, 0, 3], [3, 3, 2], [5, 5, 2]],
  7: [0, 1, 2, 3, 4, 5, 6].map((d) => [d, d, 1]),
}

export function blocks(cookTimes: CookTimes, weeks: 1 | 4): Block[] {
  return Array.from({ length: weeks }, (_, week) =>
    WEEK[cookTimes].map(([cook, first, days]) => ({
      week, cookDay: week * 7 + cook, firstDay: week * 7 + first, days,
    })),
  ).flat()
}

/** Days whose portion has to be frozen because the fridge is too short. The cooking day is day one of storage. */
export function frozenDays(recipe: Recipe, block: Block): number[] {
  const days = Array.from({ length: block.days }, (_, i) => block.firstDay + i)
  return days.filter((d) => d - block.cookDay >= recipe.keepDays)
}

export function storable(recipe: Recipe, block: Block): boolean {
  return recipe.freezable || frozenDays(recipe, block).length === 0
}
