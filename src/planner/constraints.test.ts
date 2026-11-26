import { expect, test } from 'vitest'
import { recipeAllergens, recipes } from '../data'
import { violations } from './constraints'
import { NO_LIMITS } from './types'

const find = (id: string) => recipes.find((r) => r.id === id)!
const eggMuffins = find('b-eggmuff')

test('without limits every recipe is allowed', () => {
  for (const r of recipes) expect(violations(r, NO_LIMITS)).toEqual([])
})
test('an allergen in a product', () => {
  expect(violations(eggMuffins, { ...NO_LIMITS, allergens: ['eggs'] })).toEqual(['allergens'])
})
test('an allergen the recipe may contain is refused too', () => {
  const r = recipes.find((x) => recipeAllergens(x).may.length > 0)!
  expect(violations(r, { ...NO_LIMITS, allergens: recipeAllergens(r).may })).toEqual(['allergens'])
})
test('an excluded product', () => {
  expect(violations(eggMuffins, { ...NO_LIMITS, excluded: ['spinach'] })).toEqual(['excluded'])
})
test('spicy food', () => {
  const spicy = recipes.find((r) => r.spicy)!
  expect(violations(spicy, { ...NO_LIMITS, spicy: false })).toEqual(['spicy'])
})
test('a missing tool, while no-cook recipes need none', () => {
  expect(violations(eggMuffins, { ...NO_LIMITS, tools: ['плита'] })).toEqual(['tools'])
  expect(violations(find('s-nuts'), { ...NO_LIMITS, tools: [] })).toEqual([])
})
test('lactose limit is separate from milk allergy', () => {
  const milky = recipes.find((r) => r.ingredients.some((i) => i.id === 'kefir'))!
  expect(violations(milky, { ...NO_LIMITS, lactose: 'none' })).toEqual(['lactose'])
  expect(violations(milky, { ...NO_LIMITS, lactose: 'yes' })).toEqual([])
})
test('all broken limits are listed', () => {
  expect(violations(eggMuffins, { ...NO_LIMITS, allergens: ['eggs'], tools: [] })).toEqual(['allergens', 'tools'])
})
