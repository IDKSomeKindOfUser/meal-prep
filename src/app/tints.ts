import type { Recipe } from '../data/types'

/** Extra colors of a dish next to the meal color: what the dish is known for. */
export type Tint = 'sea' | 'chili' | 'spice' | 'olive' | 'berry' | 'milk' | 'leaf'

const has = (recipe: Recipe, ids: readonly string[]) => recipe.ingredients.some((i) => ids.includes(i.id))
const grams = (recipe: Recipe, ids: readonly string[]) =>
  recipe.ingredients.filter((i) => ids.includes(i.id)).reduce((sum, i) => sum + i.grams, 0)

const SEA = ['salmon', 'pink', 'salmsalt', 'shrimp']
const HOT = ['Азиатская', 'Китайская', 'Японская', 'Мексиканская']
const EAST = ['Среднеазиатская', 'Ближневосточная', 'Индийская', 'Грузинская']
const SOUTH = ['Средиземноморская', 'Итальянская', 'Европейская']
const FRUIT = ['berries', 'apple', 'banana', 'dates', 'mandarin']
const MILK = ['cowmilk', 'milk', 'kefir', 'yogurt', 'cottage']
const LEGUMES = ['lentg', 'lentr', 'beans', 'chickpea']
const GREENS = ['spinach', 'broccoli', 'iceberg', 'cucumber', 'tomato', 'zucchini', 'cabbage', 'pepper', 'vegmix', 'greens', 'daikon']
/** Enough vegetables to call the dish green. */
const GREEN_GRAMS = 150

/** Rules in the order of how much they say about a dish. */
const RULES: [Tint, (r: Recipe) => boolean][] = [
  ['sea', (r) => has(r, SEA)],
  ['chili', (r) => r.spicy || HOT.includes(r.cuisine) || has(r, ['gochu'])],
  ['spice', (r) => EAST.includes(r.cuisine) || /корица/i.test(r.spices ?? '')],
  ['olive', (r) => SOUTH.includes(r.cuisine) || has(r, ['hummus'])],
  ['berry', (r) => has(r, FRUIT)],
  ['milk', (r) => has(r, MILK)],
  ['leaf', (r) => has(r, LEGUMES) || grams(r, GREENS) >= GREEN_GRAMS],
]

/** At most two tints of a dish, the most telling first. */
export const dishTints = (recipe: Recipe): Tint[] => RULES.filter(([, test]) => test(recipe)).map(([tint]) => tint).slice(0, 2)
