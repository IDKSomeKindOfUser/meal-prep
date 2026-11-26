import { SLOTS, type Slot } from '../planner/types'

export const MAIN_SCREENS = ['today', 'week', 'shopping', 'settings'] as const
export type MainScreen = (typeof MAIN_SCREENS)[number]
export type Route =
  | { screen: MainScreen | 'prices' | 'recipes' | 'credits' }
  /** `block` is an index in the cooking schedule. */
  | { screen: 'dish' | 'swap'; block: number; slot: Slot }
  /** `day` is a cooking day of the menu, counted from 0. */
  | { screen: 'cook'; day: number }
  /** `id` is `new` or an own recipe. */
  | { screen: 'recipe'; id: string }

export const dishHash = (block: number, slot: Slot) => `#dish/${block}/${slot}`
export const cookHash = (day: number) => `#cook/${day}`
export const recipeHash = (id: string) => `#recipe/${id}`
export const swapHash = (block: number, slot: Slot) => `#swap/${block}/${slot}`

export function parseHash(hash: string): Route {
  const main = MAIN_SCREENS.find((s) => `#${s}` === hash)
  if (main) return { screen: main }
  if (hash === '#prices') return { screen: 'prices' }
  if (hash === '#recipes') return { screen: 'recipes' }
  if (hash === '#credits') return { screen: 'credits' }
  const recipe = /^#recipe\/([\w-]+)$/.exec(hash)
  if (recipe) return { screen: 'recipe', id: recipe[1]! }
  const cook = /^#cook\/(\d+)$/.exec(hash)
  if (cook) return { screen: 'cook', day: Number(cook[1]) }
  const [, screen, block, slot] = /^#(dish|swap)\/(\d+)\/(\w+)$/.exec(hash) ?? []
  const known = SLOTS.find((s) => s === slot)
  return screen && known ? { screen: screen as 'dish' | 'swap', block: Number(block), slot: known } : { screen: 'today' }
}
