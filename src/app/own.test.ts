import { describe, expect, it } from 'vitest'
import { recipeAllergens, recipeLactose } from '../data'
import { defaultCatalog, describeMenu, planMenu, type Menu } from '../planner'
import { candidates } from '../planner/candidates'
import { blocks } from '../planner/schedule'
import { NO_LIMITS, type Settings } from '../planner/types'
import { makeCatalog } from './catalog'
import {
  EMPTY_OWN, EMPTY_PRODUCT, EMPTY_RECIPE, parseOwn, productDraft, readProduct, readRecipe, recipeDraft, unfitDishes,
  type Own, type ProductDraft, type RecipeDraft,
} from './own'

const tofu: ProductDraft = {
  ...EMPTY_PRODUCT, name: ' Тофу ', kcal: '120', protein: '12,5', fat: '7', carbs: '2', place: 'store', buyBy: 'pack',
  price: '180', packGrams: '300', allergens: ['soy'], mayContain: ['gluten'], lactose: 'none',
}
const made = readProduct(tofu, 'own-tofu')
if (!made.ok) throw new Error('bad product')
const product = made.value

const bowl: RecipeDraft = {
  ...EMPTY_RECIPE, type: 'main', name: 'Тофу с рисом', portions: '2', minutes: '25', keepDays: '4',
  rows: [{ key: 1, id: 'own-tofu', amount: '300' }, { key: 2, id: 'rice', amount: '160' }, { key: 3, id: 'egg', amount: '2' }],
  steps: 'Сварить рис.\n\nОбжарить тофу.',
}
const lookup = makeCatalog({}, { products: [product], recipes: [] }).ingredient
const read = readRecipe(bowl, 'own-bowl', lookup)
if (!read.ok) throw new Error('bad recipe')
const own: Own = { products: [product], recipes: [read.value] }
const catalog = makeCatalog({}, own)
const recipe = catalog.recipes.find((r) => r.id === 'own-bowl')!
const settings: Settings = { ...NO_LIMITS, kcal: 2000, protein: 100, weeks: 1, cookTimes: 2, budget: null, maxMinutes: null }

describe('readProduct', () => {
  it('reads numbers with a comma and trims the name', () => {
    expect(product.name).toBe('Тофу')
    expect(product.protein).toBe(12.5)
    expect(product.allergens).toEqual({ contains: ['soy'], may: ['gluten'] })
  })
  const errorsOf = (change: Partial<ProductDraft>) => {
    const r = readProduct({ ...tofu, ...change }, 'x')
    return r.ok ? [] : Object.keys(r.errors)
  }
  it('does not accept a product without a decision about allergens', () => {
    expect(errorsOf({ allergens: [], mayContain: [] })).toEqual(['allergens'])
    expect(errorsOf({ allergens: [], mayContain: [], noAllergens: true })).toEqual([])
  })
  it('does not accept allergens together with "none"', () => expect(errorsOf({ noAllergens: true })).toEqual(['allergens']))
  it('does not accept a product without lactose, price, pack or place', () => {
    expect(errorsOf({ lactose: '' })).toEqual(['lactose'])
    expect(errorsOf({ price: '' })).toEqual(['price'])
    expect(errorsOf({ price: '0' })).toEqual(['price'])
    expect(errorsOf({ packGrams: '' })).toEqual(['packGrams'])
    expect(errorsOf({ place: '' })).toEqual(['place'])
    expect(errorsOf({ buyBy: 'weight', packGrams: '' })).toEqual([])
  })
  it('does not accept impossible nutrition', () => {
    expect(errorsOf({ kcal: '950' })).toEqual(['kcal'])
    expect(errorsOf({ protein: '60', fat: '30', carbs: '30' })).toEqual(['carbs'])
  })
})

describe('readRecipe', () => {
  const errorsOf = (change: Partial<RecipeDraft>) => {
    const r = readRecipe({ ...bowl, ...change }, 'x', lookup)
    return r.ok ? [] : Object.keys(r.errors)
  }
  it('needs a name, a meal and products', () => {
    expect(errorsOf({ name: ' ', type: '', rows: [] })).toEqual(['name', 'type', 'rows'])
  })
  it('rejects bad amounts and unknown products', () => {
    expect(errorsOf({ rows: [{ key: 1, id: 'rice', amount: '0' }] })).toEqual(['row-1'])
    expect(errorsOf({ rows: [{ key: 7, id: 'gone', amount: '5' }] })).toEqual(['row-7'])
    expect(errorsOf({ rows: [{ key: 1, id: 'water', amount: '500' }] })).toEqual(['rows'])
  })
  it('merges the same product', () => {
    const r = readRecipe({ ...bowl, rows: [{ key: 1, id: 'rice', amount: '100' }, { key: 2, id: 'rice', amount: '50' }] }, 'x', lookup)
    expect(r.ok && r.value.ingredients).toEqual([{ id: 'rice', grams: 150 }])
  })
  it('survives editing unchanged', () => {
    const again = readRecipe(recipeDraft(own.recipes[0]!, lookup), 'own-bowl', lookup)
    expect(again).toEqual({ ok: true, value: own.recipes[0] })
    expect(readProduct(productDraft(product), 'own-tofu')).toEqual({ ok: true, value: product })
  })
})

describe('own recipes in the catalog', () => {
  it('divides products by portions and counts pieces', () => {
    expect(recipe.ingredients).toEqual([{ id: 'own-tofu', grams: 150 }, { id: 'rice', grams: 80 }, { id: 'egg', grams: 55 }])
    expect(recipe.steps).toEqual(['Сварить рис.', 'Обжарить тофу.'])
  })
  it('takes allergens from products and from spices', () => {
    expect(recipeAllergens(recipe, catalog.ingredient)).toEqual({ contains: ['eggs', 'soy'], may: ['gluten'] })
    expect(recipeLactose(recipe, catalog.ingredient)).toBe('none')
    const spiced = readRecipe({ ...bowl, spices: 'смесь', spiceAllergens: ['mustard'] }, 'own-bowl', lookup)
    if (!spiced.ok) throw new Error('bad')
    const r = makeCatalog({}, { ...own, recipes: [spiced.value] }).recipes.at(-1)!
    expect(recipeAllergens(r, catalog.ingredient).contains).toContain('mustard')
  })
  it('never offers the recipe to a person allergic to its product', () => {
    const block = blocks(2, 1)[0]!
    const ids = (limits: Partial<Settings>) => candidates('lunch', block, { ...settings, ...limits }, catalog).map((r) => r.id)
    expect(ids({})).toContain('own-bowl')
    expect(ids({ allergens: ['soy'] })).not.toContain('own-bowl')
    expect(ids({ allergens: ['gluten'] })).not.toContain('own-bowl')
  })
  it('counts the price of an own product by packs', () => {
    expect(catalog.price('own-tofu')).toEqual({ perKg: 600, pack: { grams: 300, price: 180 } })
    const other = planMenu(settings, catalog, 1)
    if (!other.ok) throw new Error('no menu')
    const menu: Menu = other.menu.map((row) => ({ ...row, lunch: 'own-bowl' }))
    const item = describeMenu(menu, settings, catalog).shopping.weeks[0]!.store.find((i) => i.id === 'own-tofu')!
    expect(item.unit).toBe('pack')
    expect(item.cost).toBe(item.units * 180)
  })
})

describe('unfitDishes', () => {
  const plan = planMenu(settings, catalog, 1)
  if (!plan.ok) throw new Error('no menu')
  const menu: Menu = plan.menu.map((row) => ({ ...row, lunch: 'own-bowl' }))
  it('is empty while everything fits', () => expect(unfitDishes(menu, settings, catalog)).toEqual([]))
  it('finds a dish whose product has got an allergen', () => {
    const changed = makeCatalog({}, { ...own, products: [{ ...product, allergens: { contains: ['soy', 'nuts'], may: [] } }] })
    const strict: Settings = { ...settings, allergens: ['nuts'] }
    const rows = unfitDishes(menu, strict, changed).filter((d) => d.recipe.id === 'own-bowl')
    expect(rows.map((d) => [d.block, d.slot])).toEqual(menu.map((_, i) => [i, 'lunch']))
  })
})

describe('parseOwn', () => {
  it('restores what was saved', () => expect(parseOwn(JSON.parse(JSON.stringify(own)))).toEqual(own))
  it('drops a product without allergens and every recipe that uses it', () => {
    const { allergens: _, ...broken } = product
    expect(parseOwn({ products: [broken], recipes: own.recipes })).toEqual(EMPTY_OWN)
  })
  it('drops ids that would replace built-in data, and garbage', () => {
    expect(parseOwn({ products: [{ ...product, id: 'milk' }], recipes: [] })).toEqual(EMPTY_OWN)
    for (const x of [null, 5, [], {}, { products: 1, recipes: 'a' }, { products: [null], recipes: [{}] }]) expect(parseOwn(x)).toEqual(EMPTY_OWN)
  })
  it('leaves the built-in catalog alone', () => expect(makeCatalog({}, EMPTY_OWN)).toBe(defaultCatalog))
})
