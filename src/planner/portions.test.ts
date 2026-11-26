import { expect, test } from 'vitest'
import { getIngredient, recipes } from '../data'
import type { Recipe } from '../data/types'
import { portionDay } from './portions'

const dish = (id: string, ingredients: [string, number][]): Recipe => ({
  ...recipes[0]!, id, ingredients: ingredients.map(([i, grams]) => ({ id: i, grams })),
})
const day = (dishes: Recipe[], days: number, kcal: number) => portionDay(dishes, days, kcal, getIngredient)

test('portions grow to reach the daily norm', () => {
  // Chicken breast is 120 kcal per 100 g.
  const out = day([dish('a', [['chicken', 200]])], 3, 360)
  expect(out.kcal).toBeCloseTo(360)
  expect(out.protein).toBeCloseTo(67.5)
  expect(out.dishes[0]!.batch).toEqual([{ id: 'chicken', grams: 900 }])
})
test('a portion with about an egg or more gets whole eggs', () => {
  const out = day([dish('a', [['egg', 110], ['chicken', 300]])], 2, 700)
  const eggs = out.dishes[0]!.batch.find((i) => i.id === 'egg')!.grams / 55
  expect(eggs % 2).toBe(0)
  expect(out.kcal).toBeGreaterThan(665)
  expect(out.kcal).toBeLessThan(735)
})
test('a small share of an egg is rounded over the whole batch, at least one', () => {
  const eggs = (days: number) => day([dish('a', [['egg', 11], ['chicken', 300]])], days, 377).dishes[0]!.batch[0]!.grams
  expect(eggs(1)).toBe(55)
  expect(eggs(4)).toBe(55)
})
test('calories are counted after rounding', () => {
  const out = day([dish('a', [['egg', 165]])], 1, 250)
  const eggs = out.dishes[0]!.batch[0]!.grams
  expect(eggs % 55).toBe(0)
  expect(out.kcal).toBeCloseTo((getIngredient('egg').kcal * eggs) / 100)
})
test('lemon is measured in whole wedges, garlic in whole cloves', () => {
  const batch = (grams: number, id: string) =>
    day([dish('a', [['chicken', 300], [id, grams]])], 2, 363).dishes[0]!.batch[1]!.grams
  expect(batch(10, 'lemon')).toBe(25) // a wedge is an eighth of a 100 g lemon, one per portion
  expect(batch(24, 'lemon')).toBe(50)
  expect(batch(8, 'garlic')).toBe(20) // two 5 g cloves per portion
})
test('portions stay within half and double size', () => {
  expect(day([dish('a', [['chicken', 100]])], 1, 5000).kcal).toBeCloseTo(240)
  expect(day([dish('a', [['chicken', 1000]])], 1, 100).kcal).toBeCloseTo(600)
})
test('every real recipe alone lands near its scaled size', () => {
  for (const r of recipes) for (const k of [0.7, 1, 1.5])
    expect(Math.abs(day([r], 3, r.kcal * k).kcal / (r.kcal * k) - 1), `${r.id} ${k}`).toBeLessThan(0.15)
})
