import type { Allergen, Ingredient, Lactose, MealType } from '../data/types'
import type { Profile } from '../planner/norm'
import type { Missing } from '../planner'
import { LEMON_WEDGES } from '../planner/portions'
import type { CookTimes, Slot } from '../planner/types'

export const SLOT: Record<Slot, string> = { breakfast: 'Завтрак', lunch: 'Обед', dinner: 'Ужин', snack: 'Перекус' }
export const MEAL: Record<MealType, string> = { breakfast: 'Завтрак', main: 'Обед или ужин', snack: 'Перекус' }
export const ALLERGEN: Record<Allergen, string> = {
  gluten: 'Глютен', milk: 'Молоко', eggs: 'Яйца', fish: 'Рыба', crustaceans: 'Ракообразные',
  peanuts: 'Арахис', nuts: 'Орехи', soy: 'Соя', sesame: 'Кунжут', mustard: 'Горчица',
}
export const LACTOSE: Record<Lactose, string> = { yes: 'Можно', low: 'Немного', none: 'Нельзя' }
export const ACTIVITY: Record<Profile['activity'], string> = {
  low: 'Почти без движения', light: 'Прогулки или 1–3 тренировки в неделю', medium: '3–5 тренировок в неделю',
  high: '6–7 тренировок в неделю', veryHigh: 'Тяжёлая физическая работа',
}
export const GOAL: Record<Profile['goal'], string> = { lose: 'Похудеть', keep: 'Держать вес', gain: 'Набрать' }
export const COOK: Record<CookTimes, string> = { 1: '1 раз', 2: '2 раза', 3: '3 раза', 7: 'Каждый день' }

const HELP: Record<Missing['helps'][number]['limit'], string> = {
  allergens: 'аллергены', excluded: 'исключённые продукты', spicy: 'острое', tools: 'техника',
  lactose: 'лактоза', storage: 'срок хранения (готовьте чаще)',
}

/** What stands in the way of every meal that has no dishes; repeats between blocks are merged. */
export function missingLines(missing: Missing[]): string[] {
  const lines = missing.map(({ slot, helps }) =>
    `${SLOT[slot]}: ${
      helps.length > 0
        ? `${helps.length > 1 ? 'ослабьте одно из ограничений' : 'ослабьте ограничение'}: ${helps.map((h) => HELP[h.limit]).join(', ')}.`
        : 'мешают несколько ограничений сразу, ослабьте хотя бы два.'
    }`)
  return [...new Set(lines)]
}

const rubles = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 })
export const rub = (n: number) => `${rubles.format(Math.ceil(n))} ₽`
export const num = (n: number) => rubles.format(n)

const plural = new Intl.PluralRules('ru-RU')
export function count(n: number, one: string, few: string, many: string): string {
  const form = plural.select(n)
  return `${n} ${form === 'one' ? one : form === 'few' ? few : many}`
}
export const daysCount = (n: number) => count(n, 'день', 'дня', 'дней')

/** `+12`, `−12` or `0`. */
export function signed(n: number): string {
  const r = Math.round(n)
  return r === 0 ? '0' : `${r > 0 ? '+' : '−'}${num(Math.abs(r))}`
}

/** An amount in a recipe. A lemon is counted in wedges and garlic in cloves. */
export function amount(product: Ingredient, grams: number): string {
  const { id, pieceGrams } = product
  if (pieceGrams === null) return `${num(grams)} г`
  if (id === 'lemon') return count(Math.round((grams * LEMON_WEDGES) / pieceGrams), 'долька', 'дольки', 'долек')
  const pieces = Math.round(grams / pieceGrams)
  if (id === 'garlic') return count(pieces, 'зубчик', 'зубчика', 'зубчиков')
  return `${num(pieces)} шт. (${num(grams)} г)`
}
