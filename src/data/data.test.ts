import { describe, expect, it, test } from 'vitest'
import { getIngredient, ingredients, recipeAllergens, recipeLactose, recipes, yields } from '.'
import { ALLERGENS } from './types'

const list = [...ingredients.values()]
const byId = (id: string) => recipes.find((r) => r.id === id)!

describe('целостность', () => {
  it('77 продуктов и 99 рецептов с уникальными id', () => {
    expect(ingredients.size).toBe(77)
    expect(recipes).toHaveLength(99)
    expect(new Set(recipes.map((r) => r.id)).size).toBe(99)
  })

  it('типы рецептов: 26 завтраков, 55 основных, 18 перекусов', () => {
    const n = (t: string) => recipes.filter((r) => r.type === t).length
    expect([n('breakfast'), n('main'), n('snack')]).toEqual([26, 55, 18])
  })

  it('рецепты и выходы ссылаются на известные продукты', () => {
    const ids = [...recipes.flatMap((r) => r.ingredients.map((i) => i.id)), ...Object.keys(yields)]
    expect(ids.filter((id) => !ingredients.has(id))).toEqual([])
  })

  test.each(recipes)('$id: числа осмысленны', (r) => {
    for (const n of [r.kcal, r.cookedGrams, r.minutes, r.keepDays]) expect(n).toBeGreaterThan(0)
    for (const i of r.ingredients) expect(i.grams).toBeGreaterThan(0)
    expect(r.steps.length).toBeGreaterThan(0)
  })
})

// The label has rounded values, so one unit of drift is allowed.
test.each(recipes)('$id: ккал и БЖУ сходятся с составом', (r) => {
  const sum = (key: 'kcal' | 'protein' | 'fat' | 'carbs') =>
    r.ingredients.reduce((s, i) => s + (getIngredient(i.id)[key] * i.grams) / 100, 0)
  for (const key of ['kcal', 'protein', 'fat', 'carbs'] as const) {
    expect(Math.abs(sum(key) - r[key]), key).toBeLessThanOrEqual(1)
  }
})

describe('аллергены', () => {
  it('таблица «содержит» зафиксирована', () => {
    const table = Object.fromEntries(
      ALLERGENS.map((x) => [x, list.filter((i) => i.allergens.contains.includes(x)).map((i) => i.id).sort()]),
    )
    expect(table).toEqual({
      gluten: ['bread', 'bulgur', 'couscous', 'crisp', 'crumbs', 'flour', 'gochu', 'lavash', 'noodle', 'oats', 'pasta', 'semolina', 'soy', 'tortilla'],
      milk: ['cheese', 'cottage', 'kefir', 'milk', 'yogurt'],
      eggs: ['egg'],
      fish: ['pink', 'salmon', 'salmsalt'],
      crustaceans: ['shrimp'],
      peanuts: ['pbutter'],
      nuts: ['nuts'],
      soy: ['gochu', 'soy'],
      sesame: ['hummus', 'sesoil'],
      mustard: [],
    })
  })

  it('известны все значения, «содержит» и «возможно» не пересекаются', () => {
    for (const { allergens: x } of [...list, ...recipes.map((r) => ({ allergens: recipeAllergens(r) }))]) {
      for (const v of [...x.contains, ...x.may]) expect(ALLERGENS).toContain(v)
      expect(x.may.filter((v) => x.contains.includes(v))).toEqual([])
    }
  })

  it('горчица и кунжут из специй не теряются', () => {
    expect(recipeAllergens(byId('b-s-eggsand')).contains).toContain('mustard')
    expect(recipeAllergens(byId('b-sand')).may).toContain('mustard')
    for (const r of recipes) {
      const x = recipeAllergens(r)
      const all = [...x.contains, ...x.may]
      const text = `${r.spices} ${r.steps.join(' ')}`
      if (/горчиц|карри|масала|хмели|уцхо/i.test(text)) expect(all, r.id).toContain('mustard')
      if (/кунжут/i.test(text)) expect(all, r.id).toContain('sesame')
    }
  })

  it('безлактозное молоко: молочный аллерген есть, лактозы нет', () => {
    const milk = getIngredient('milk')
    expect(milk.allergens.contains).toEqual(['milk'])
    expect(milk.lactose).toBe('none')
  })

  it('лактоза выводится из состава', () => {
    expect(recipeLactose(byId('s-kefir'))).toBe('yes')
    expect(recipeLactose(byId('m-s-paprika'))).toBe('none')
  })
})

describe('покупка', () => {
  it('на рынке только мясо и рыба, и они развесные', () => {
    const m = list.filter((i) => i.place === 'market')
    expect(m.map((i) => i.id).sort()).toEqual(
      ['beef', 'bfat', 'bmince', 'chicken', 'pink', 'pork', 'salmon', 'thigh', 'turkey'])
    expect(m.every((i) => i.buyBy === 'weight')).toBe(true)
  })

  it('развес и пачки', () => {
    const by = (id: string) => getIngredient(id).buyBy
    expect(['potato', 'banana', 'salmon'].map(by)).toEqual(['weight', 'weight', 'weight'])
    expect(['shrimp', 'salmsalt', 'vegmix', 'gbeans', 'berries', 'rice', 'egg', 'greens', 'spinach', 'iceberg'].map(by)).toEqual(Array(10).fill('pack'))
    expect(list.filter((i) => i.buyBy === 'free').map((i) => i.id)).toEqual(['water'])
  })
})
