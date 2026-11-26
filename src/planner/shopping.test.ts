import { expect, test } from 'vitest'
import { getIngredient } from '../data'
import type { Catalog } from './types'
import { shoppingList } from './shopping'

const catalog: Catalog = {
  recipes: [],
  ingredient: getIngredient,
  price: (id) =>
    ({
      rice: { perKg: 100, pack: { grams: 800, price: 80 } },
      egg: { perKg: 200, pack: { grams: 550, price: 110 } },
      chicken: { perKg: 600, pack: null },
      garlic: { perKg: 400, pack: null },
      lemon: { perKg: 200, pack: null },
      apple: { perKg: 100, pack: null },
    })[id] ?? null,
}
const buy = (...weeks: Record<string, number>[]) => shoppingList(weeks.map((w) => new Map(Object.entries(w))), catalog)

test('packs are bought whole', () => {
  const list = buy({ rice: 900 })
  expect(list.weeks[0]!.store).toEqual([{ id: 'rice', need: 900, units: 2, unit: 'pack', grams: 1600, cost: 160 }])
  expect(list.total).toBe(160)
})
test('the rest of a pack is used the next week', () => {
  const list = buy({ rice: 500 }, { rice: 200 }, { rice: 200 })
  expect(list.weeks.map((w) => w.store[0]?.units ?? 0)).toEqual([1, 0, 1])
  expect(list.total).toBe(160)
})
test('meat goes to the market by weight, rounded up to 10 g', () => {
  const list = buy({ chicken: 491 })
  expect(list.weeks[0]!.store).toEqual([])
  expect(list.weeks[0]!.market[0]).toMatchObject({ grams: 500, unit: 'weight' })
  expect(list.weeks[0]!.marketCost).toBeCloseTo(300)
})
test('fruit is bought in whole pieces', () => {
  expect(buy({ apple: 190 }).weeks[0]!.store[0]).toMatchObject({ units: 2, unit: 'piece', grams: 360, cost: 36 })
})
test('garlic is bought in heads and lemons whole, the rest is used the next week', () => {
  const list = buy({ garlic: 30, lemon: 25 }, { garlic: 15, lemon: 75 })
  expect(list.weeks[0]!.store.map((i) => [i.id, i.units, i.grams])).toEqual([['garlic', 1, 50], ['lemon', 1, 100]])
  expect(list.weeks[1]!.store).toEqual([])
  expect(list.total).toBeCloseTo(40)
})
test('water is not bought, sections add up to the total', () => {
  const list = buy({ water: 500, rice: 10, chicken: 100 })
  expect(list.weeks[0]!.storeCost + list.weeks[0]!.marketCost).toBeCloseTo(140)
  expect(list.total).toBeCloseTo(140)
})
