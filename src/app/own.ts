import { getIngredient, ingredients, yields } from '../data'
import { ALLERGENS, type Allergen, type Ingredient, type Lactose, type MealType, type Recipe } from '../data/types'
import type { Menu } from '../planner'
import { candidates } from '../planner/candidates'
import { LEMON_WEDGES } from '../planner/portions'
import { recipeById } from '../planner/report'
import { blocks } from '../planner/schedule'
import { NO_COOK, SLOTS, TOOLS, type Catalog, type Settings, type Slot } from '../planner/types'

/** A product added by the user. `price` is rubles for `grams`; for products sold by weight `grams` is 1000. */
export interface OwnProduct extends Ingredient { price: { price: number; grams: number } }
/** A recipe added by the user. Allergens and nutrition are not stored: they follow the products. */
export interface OwnRecipe extends Pick<Recipe, 'id' | 'type' | 'name' | 'tools' | 'minutes' | 'keepDays' | 'freezable' | 'spicy' | 'spices' | 'spiceAllergens' | 'steps'> {
  portions: number
  /** Grams of raw product for all portions. */
  ingredients: { id: string; grams: number }[]
}
export interface Own { products: OwnProduct[]; recipes: OwnRecipe[] }
export const EMPTY_OWN: Own = { products: [], recipes: [] }

const OWN_ID = /^own-[\w-]+$/
export const newId = () => `own-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
export const OWN_CATEGORY = 'Свои продукты'

/** What is typed. Numbers stay text until the form is read. */
export interface ProductDraft {
  name: string
  kcal: string
  protein: string
  fat: string
  carbs: string
  place: 'market' | 'store' | ''
  buyBy: 'weight' | 'pack' | ''
  price: string
  packGrams: string
  allergens: Allergen[]
  mayContain: Allergen[]
  /** The user states that there are none, so an untouched form cannot pass for a safe product. */
  noAllergens: boolean
  lactose: Lactose | ''
}
export const EMPTY_PRODUCT: ProductDraft = {
  name: '', kcal: '', protein: '', fat: '', carbs: '', place: '', buyBy: '', price: '', packGrams: '',
  allergens: [], mayContain: [], noAllergens: false, lactose: '',
}
export interface RecipeDraft {
  name: string
  type: MealType | ''
  portions: string
  minutes: string
  keepDays: string
  freezable: boolean
  spicy: boolean
  tools: string[]
  rows: { key: number; id: string; amount: string }[]
  spices: string
  spiceAllergens: Allergen[]
  /** One step per line. */
  steps: string
}
export const EMPTY_RECIPE: RecipeDraft = {
  name: '', type: '', portions: '1', minutes: '', keepDays: '', freezable: false, spicy: false, tools: [],
  rows: [{ key: 1, id: '', amount: '' }], spices: '', spiceAllergens: [], steps: '',
}

export type Errors = Record<string, string>
export type Read<T> = { ok: true; value: T } | { ok: false; errors: Errors }

const NAME_LIMIT = 100
function number(text: string, min: number, max: number): number | null {
  const clean = text.replace(/\s/g, '').replace(',', '.')
  if (!/^\d+(\.\d+)?$/.test(clean)) return null
  const value = Number(clean)
  return value >= min && value <= max ? value : null
}
const whole = (text: string, min: number, max: number) => {
  const value = number(text, min, max)
  return value !== null && Number.isInteger(value) ? value : null
}
const known = (list: Allergen[]) => ALLERGENS.filter((a) => list.includes(a))

export function readProduct(d: ProductDraft, id: string): Read<OwnProduct> {
  const errors: Errors = {}
  const name = d.name.trim()
  if (!name || name.length > NAME_LIMIT) errors.name = `Введите название, до ${NAME_LIMIT} знаков.`
  const kcal = number(d.kcal, 0, 900)
  if (kcal === null) errors.kcal = 'Калории на 100 г: число от 0 до 900.'
  const [protein, fat, carbs] = (['protein', 'fat', 'carbs'] as const).map((key) => {
    const value = number(d[key], 0, 100)
    if (value === null) errors[key] = 'Число от 0 до 100 г.'
    return value
  })
  if (protein != null && fat != null && carbs != null && protein + fat + carbs > 100)
    errors.carbs = 'Белков, жиров и углеводов вместе больше 100 г на 100 г продукта.'
  if (!d.place) errors.place = 'Выберите, где покупаете продукт.'
  if (!d.buyBy) errors.buyBy = 'Выберите, как продаётся продукт.'
  const price = number(d.price, 0.01, 1_000_000)
  if (price === null) errors.price = 'Цена: число больше нуля.'
  const grams = d.buyBy === 'pack' ? number(d.packGrams, 1, 50_000) : 1000
  if (grams === null) errors.packGrams = 'Вес пачки: число от 1 до 50 000 г.'
  const contains = known(d.allergens)
  const may = known(d.mayContain).filter((a) => !contains.includes(a))
  const any = contains.length + may.length > 0
  if (any === d.noAllergens)
    errors.allergens = any ? 'Отмечено и «нет аллергенов», и аллергены. Оставьте одно.' : 'Отметьте аллергены или «Аллергенов нет».'
  if (!d.lactose) errors.lactose = 'Укажите, есть ли лактоза.'
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return {
    ok: true,
    value: {
      id, name, category: OWN_CATEGORY, kcal: kcal!, protein: protein!, fat: fat!, carbs: carbs!,
      pieceGrams: null, pieceLabel: null, buyBy: d.buyBy as 'weight' | 'pack', place: d.place as 'market' | 'store',
      allergens: { contains, may }, lactose: d.lactose as Lactose, price: { price: price!, grams: grams! },
    },
  }
}

export function productDraft(p: OwnProduct): ProductDraft {
  const { contains, may } = p.allergens
  return {
    name: p.name, kcal: String(p.kcal), protein: String(p.protein), fat: String(p.fat), carbs: String(p.carbs),
    place: p.place ?? '', buyBy: p.buyBy === 'free' ? '' : p.buyBy, price: String(p.price.price),
    packGrams: p.buyBy === 'pack' ? String(p.price.grams) : '',
    allergens: contains, mayContain: may, noAllergens: contains.length + may.length === 0, lactose: p.lactose,
  }
}

/** How the amount of a product is typed: a lemon in wedges, garlic in cloves, eggs in pieces, the rest in grams. */
export function amountUnit({ id, pieceGrams }: Ingredient): { label: string; grams: number } {
  if (pieceGrams === null) return { label: 'г', grams: 1 }
  if (id === 'lemon') return { label: 'дольки', grams: pieceGrams / LEMON_WEDGES }
  return { label: id === 'garlic' ? 'зубчики' : 'шт.', grams: pieceGrams }
}

const has = (id: string, lookup: Catalog['ingredient']): Ingredient | null => {
  try {
    return lookup(id)
  } catch {
    return null
  }
}

/** Products of a draft that are filled in correctly, the same ones added together. */
export function draftIngredients(d: RecipeDraft, lookup: Catalog['ingredient']): { id: string; grams: number }[] {
  const sum = new Map<string, number>()
  for (const row of d.rows) {
    const product = has(row.id, lookup)
    const amount = number(row.amount, 0.01, 50_000)
    if (product && amount !== null) sum.set(row.id, (sum.get(row.id) ?? 0) + amount * amountUnit(product).grams)
  }
  return [...sum].map(([id, grams]) => ({ id, grams }))
}

export function readRecipe(d: RecipeDraft, id: string, lookup: Catalog['ingredient']): Read<OwnRecipe> {
  const errors: Errors = {}
  const name = d.name.trim()
  if (!name || name.length > NAME_LIMIT) errors.name = `Введите название, до ${NAME_LIMIT} знаков.`
  if (!d.type) errors.type = 'Выберите приём пищи.'
  const portions = whole(d.portions, 1, 50)
  if (portions === null) errors.portions = 'Целое число от 1 до 50.'
  const minutes = whole(d.minutes, 1, 1440)
  if (minutes === null) errors.minutes = 'Целое число от 1 до 1440 минут.'
  const keepDays = whole(d.keepDays, 1, 30)
  if (keepDays === null) errors.keepDays = 'Целое число от 1 до 30 дней.'
  const rows = d.rows.filter((r) => r.id !== '' || r.amount.trim() !== '')
  for (const row of rows) {
    if (!has(row.id, lookup)) errors[`row-${row.key}`] = 'Выберите продукт.'
    else if (number(row.amount, 0.01, 50_000) === null) errors[`row-${row.key}`] = 'Количество: число больше нуля.'
  }
  const parts = draftIngredients(d, lookup)
  if (rows.length === 0) errors.rows = 'Добавьте хотя бы один продукт.'
  else if (!rows.some((r) => errors[`row-${r.key}`]) && parts.every((p) => lookup(p.id).kcal * p.grams === 0))
    errors.rows = 'Добавьте продукт, в котором есть калории.'
  if (Object.keys(errors).length > 0) return { ok: false, errors }
  const tools = TOOLS.filter((t) => d.tools.includes(t))
  const spices = d.spices.trim()
  return {
    ok: true,
    value: {
      id, name, type: d.type as MealType, portions: portions!, minutes: minutes!, keepDays: keepDays!,
      freezable: d.freezable, spicy: d.spicy, tools: tools.length > 0 ? tools : [NO_COOK], ingredients: parts,
      spices, spiceAllergens: { contains: spices ? known(d.spiceAllergens) : [], may: [] },
      steps: d.steps.split('\n').map((s) => s.trim()).filter(Boolean),
    },
  }
}

export function recipeDraft(r: OwnRecipe, lookup: Catalog['ingredient']): RecipeDraft {
  return {
    name: r.name, type: r.type, portions: String(r.portions), minutes: String(r.minutes), keepDays: String(r.keepDays),
    freezable: r.freezable, spicy: r.spicy, tools: r.tools.filter((t) => t !== NO_COOK),
    rows: r.ingredients.map(({ id, grams }, i) => ({
      key: i + 1, id, amount: String(Number((grams / amountUnit(lookup(id)).grams).toFixed(6))),
    })),
    spices: r.spices, spiceAllergens: r.spiceAllergens.contains, steps: r.steps.join('\n'),
  }
}

/** Nutrition of one portion. */
export function nutrition(parts: { id: string; grams: number }[], portions: number, lookup: Catalog['ingredient']) {
  const sum = (key: 'kcal' | 'protein' | 'fat' | 'carbs') =>
    Math.round(parts.reduce((a, p) => a + (lookup(p.id)[key] * p.grams) / 100, 0) / portions)
  return { kcal: sum('kcal'), protein: sum('protein'), fat: sum('fat'), carbs: sum('carbs') }
}

/** The recipe as the planner sees it. */
export function toRecipe({ portions, ...r }: OwnRecipe, lookup: Catalog['ingredient']): Recipe {
  const parts = r.ingredients.map(({ id, grams }) => ({ id, grams: grams / portions }))
  return {
    ...r, ingredients: parts, cuisine: 'Своё', source: null, ...nutrition(parts, 1, lookup),
    cookedGrams: Math.round(parts.reduce((a, p) => a + p.grams * (yields[p.id] ?? 1), 0)),
  }
}

/** Dishes of a menu that no longer fit its limits: an own recipe or product may have been changed after the menu was made. */
export function unfitDishes(menu: Menu, settings: Settings, catalog: Catalog): { block: number; slot: Slot; recipe: Recipe }[] {
  return blocks(settings.cookTimes, settings.weeks).flatMap((block, i) =>
    SLOTS.flatMap((slot) => {
      const recipe = recipeById(catalog, menu[i]![slot])
      return candidates(slot, block, settings, catalog).includes(recipe) ? [] : [{ block: i, slot, recipe }]
    }))
}

/** Never throws: what cannot be used is dropped. A product with unclear allergens takes its recipes with it. */
export function parseOwn(saved: unknown): Own {
  const list = (x: unknown): unknown[] => (Array.isArray(x) ? x : [])
  const { products: savedProducts, recipes: savedRecipes } = (saved ?? {}) as Record<string, unknown>
  const keep = <T extends { id: string }>(items: unknown[], read: (x: T) => Read<T>): T[] => {
    const result = new Map<string, T>()
    for (const x of items) {
      try {
        if (!OWN_ID.test((x as T).id)) continue
        const r = read(x as T)
        if (r.ok) result.set(r.value.id, r.value)
      } catch {
        // Not a saved record.
      }
    }
    return [...result.values()]
  }
  const products = keep<OwnProduct>(list(savedProducts), (p) => readProduct(productDraft(p), p.id))
  const byId = new Map(products.map((p) => [p.id, p]))
  const lookup = (id: string) => byId.get(id) ?? getIngredient(id)
  const recipes = keep<OwnRecipe>(list(savedRecipes), (r) => {
    if (r.ingredients.some((i) => !byId.has(i.id) && !ingredients.has(i.id))) return { ok: false, errors: {} }
    return readRecipe(recipeDraft(r, lookup), r.id, lookup)
  })
  return { products, recipes }
}
