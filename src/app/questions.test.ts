import { expect, test } from 'vitest'
import { NO_LIMITS, type Settings } from '../planner/types'
import { EMPTY_FORM, readForm } from './form'
import { answersFrom, applyToForm, applyToSettings, canDropMilk } from './questions'
import { parseState } from './storage'

const settings: Settings = { ...NO_LIMITS, kcal: 2000, protein: 120, weeks: 1, cookTimes: 2, budget: null, maxMinutes: 45 }
const form = { ...EMPTY_FORM, normBy: 'manual' as const, kcal: '2000', protein: '120', maxMinutes: '45' }

test('keeping every answer changes nothing', () => {
  expect(applyToSettings(settings, answersFrom(undefined))).toEqual(settings)
  expect(readForm(applyToForm(form, answersFrom(undefined)))).toEqual(readForm(form))
})
test('the form and the plan get the same settings from the answers', () => {
  const answers = { meats: ['fish' as const], kinds: ['soup' as const], effort: 'simple' as const, dairy: 'none' as const }
  const read = readForm(applyToForm(form, answers))
  if (!read.ok) throw new Error('form')
  expect(read.settings).toEqual(applyToSettings(read.ok ? { ...settings } : settings, answers))
  expect(read.settings).toMatchObject({ maxMinutes: 30, allergens: ['milk'], prefer: { meats: ['fish'], kinds: ['soup'] } })
})
test('"without dairy" never adds milk twice and "any effort" lifts the time limit', () => {
  const s = applyToSettings({ ...settings, allergens: ['milk'] }, { ...answersFrom(undefined), dairy: 'none', effort: 'any' })
  expect(s.allergens).toEqual(['milk'])
  expect(s.maxMinutes).toBeNull()
})
test('answers for one cooking leave the wishes of the others alone', () => {
  const rice = { meats: [], kinds: ['rice' as const] }
  const fish = { ...answersFrom(undefined), meats: ['fish' as const] }
  const start = { ...settings, prefer: rice, preferAt: { 3: { meats: ['beef' as const], kinds: [] } } }
  const part = applyToSettings(start, fish, 0)
  expect(part.prefer).toEqual(rice)
  expect(part.preferAt).toEqual({ 3: { meats: ['beef'], kinds: [] }, 0: { meats: ['fish'], kinds: [] } })
  // Nothing chosen for one cooking still means "no wishes" there, not "the common ones".
  expect(applyToSettings(start, answersFrom(undefined), 0).preferAt?.[0]).toEqual({ meats: [], kinds: [] })
  // A whole new menu starts over.
  const whole = applyToSettings(start, fish)
  expect(whole.prefer).toEqual({ meats: ['fish'], kinds: [] })
  expect(whole.preferAt).toBeUndefined()
  // The form keeps the common wishes when one cooking changes.
  expect(applyToForm({ ...form, prefer: rice }, fish, 0).prefer).toEqual(rice)
})
test('a broken saved wish is dropped', () => {
  const state = parseState(JSON.stringify({ version: 1, form: { ...form, prefer: { meats: ['dragon'], kinds: [] } } }))
  expect(state.form.prefer).toEqual({ meats: [], kinds: [] })
})
test('without dairy is offered only when some breakfast has no milk', () => {
  const none = { contains: [], may: [] }
  const recipe = (type: string, id: string) => ({ type, ingredients: [{ id }], spiceAllergens: none, tools: [], spicy: false })
  const ingredient = (id: string) => ({ id, lactose: 'none', allergens: id === 'milky' ? { contains: ['milk'], may: [] } : none })
  const catalog = (...recipes: unknown[]) => ({ recipes, ingredient }) as never
  expect(canDropMilk(settings, catalog(recipe('breakfast', 'milky'), recipe('main', 'plain')))).toBe(false)
  expect(canDropMilk(settings, catalog(recipe('breakfast', 'milky'), recipe('breakfast', 'plain')))).toBe(true)
})
