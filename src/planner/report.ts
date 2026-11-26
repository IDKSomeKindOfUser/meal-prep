import type { Recipe } from '../data/types'
import { portionDay, type PortionedDay } from './portions'
import { blocks, frozenDays, type Block } from './schedule'
import { shoppingList, type ShoppingList } from './shopping'
import { SLOTS, type Catalog, type Settings, type Slot } from './types'

/** Recipe ids for every block of the schedule. */
export type Menu = Record<Slot, string>[]

export interface Cooking {
  day: number
  /** Sum over dishes; cooking in parallel takes less. */
  minutes: number
  dishes: { recipe: Recipe; days: number[]; portions: number; fridge: number; frozen: number }[]
}

export type Warning = 'kcal' | 'protein'

export interface Report {
  blocks: { block: Block; day: PortionedDay }[]
  /** One entry per day; dishes go in the order of `SLOTS`. `batch` covers all days of the block. */
  days: PortionedDay[]
  cookings: Cooking[]
  shopping: ShoppingList
  /** Rubles above the budget. */
  shortage: number
  warnings: Warning[]
}

export const KCAL_TOLERANCE = 0.05
export const PROTEIN_MIN = 0.9

export function recipeById(catalog: Catalog, id: string): Recipe {
  const found = catalog.recipes.find((r) => r.id === id)
  if (!found) throw new Error(`Unknown recipe: ${id}`)
  return found
}

export function describeMenu(menu: Menu, settings: Settings, catalog: Catalog): Report {
  const schedule = blocks(settings.cookTimes, settings.weeks)
  if (menu.length !== schedule.length) throw new Error('The menu does not match the cooking schedule')
  const sized = schedule.map((block, i) => {
    const dishes = SLOTS.map((s) => recipeById(catalog, menu[i]![s]))
    return { block, day: portionDay(dishes, block.days, settings.kcal, catalog.ingredient) }
  })

  const needs = Array.from({ length: settings.weeks }, () => new Map<string, number>())
  const cookings = new Map<number, Cooking>()
  for (const { block, day } of sized) {
    const cooking = cookings.get(block.cookDay) ?? { day: block.cookDay, minutes: 0, dishes: [] }
    cookings.set(block.cookDay, cooking)
    const need = needs[block.week]!
    for (const { recipe, batch } of day.dishes) {
      const frozen = frozenDays(recipe, block).length
      cooking.minutes += recipe.minutes
      cooking.dishes.push({
        recipe, portions: block.days, frozen, fridge: block.days - frozen,
        days: Array.from({ length: block.days }, (_, i) => block.firstDay + i),
      })
      for (const { id, grams } of batch) need.set(id, (need.get(id) ?? 0) + grams)
    }
  }

  const shopping = shoppingList(needs, catalog)
  const days = sized.flatMap(({ block, day }) => Array.from({ length: block.days }, () => day))
  const warnings: Warning[] = []
  if (days.some((d) => Math.abs(d.kcal / settings.kcal - 1) > KCAL_TOLERANCE)) warnings.push('kcal')
  if (days.some((d) => d.protein < settings.protein * PROTEIN_MIN)) warnings.push('protein')
  return {
    blocks: sized, days, cookings: [...cookings.values()], shopping, warnings,
    shortage: settings.budget === null ? 0 : Math.max(0, shopping.total - settings.budget),
  }
}
