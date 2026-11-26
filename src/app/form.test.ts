import { describe, expect, it } from 'vitest'
import { EMPTY_FORM, norm, readForm, type Form } from './form'

const profile: Form = { ...EMPTY_FORM, sex: 'male', age: '30', height: '180', weight: '80' }
const manual: Form = { ...EMPTY_FORM, normBy: 'manual', kcal: '2000', protein: '120' }

describe('norm', () => {
  it('comes from the profile', () => expect(norm(profile)).toEqual({ kcal: 2450, protein: 112 }))
  it('is absent until the profile is complete', () => {
    expect(norm(EMPTY_FORM)).toBeNull()
    expect(norm({ ...profile, age: '17' })).toBeNull()
    expect(norm({ ...profile, weight: '80кг' })).toBeNull()
  })
  it('accepts a decimal comma', () => expect(norm({ ...profile, weight: '80,0' })).toEqual({ kcal: 2450, protein: 112 }))
  it('comes from manual numbers', () => expect(norm(manual)).toEqual({ kcal: 2000, protein: 120 }))
})

describe('readForm', () => {
  it('names every empty profile field', () => {
    const r = readForm(EMPTY_FORM)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(Object.keys(r.errors).sort()).toEqual(['age', 'height', 'sex', 'weight'])
  })
  it('ignores the profile when numbers are manual', () => {
    const r = readForm({ ...manual, age: 'abc' })
    expect(r.ok && r.settings).toMatchObject({ kcal: 2000, protein: 120, weeks: 1, cookTimes: 2, budget: null, maxMinutes: null })
  })
  it('checks manual numbers', () => {
    const r = readForm({ ...manual, kcal: '900', protein: '' })
    expect(!r.ok && Object.keys(r.errors).sort()).toEqual(['kcal', 'protein'])
  })
  it('reads the budget with spaces and rejects nonsense', () => {
    const r = readForm({ ...manual, budget: '6 000' })
    expect(r.ok && r.settings.budget).toBe(6000)
    expect(readForm({ ...manual, budget: '-1' }).ok).toBe(false)
    expect(readForm({ ...manual, budget: '0' }).ok).toBe(false)
    expect(readForm({ ...manual, budget: 'много' }).ok).toBe(false)
  })
  it('passes the limits on', () => {
    const r = readForm({ ...manual, allergens: ['milk'], excluded: ['egg'], spicy: false, tools: ['плита'], lactose: 'low', weeks: 4, cookTimes: 7, maxMinutes: '45' })
    expect(r.ok && r.settings).toMatchObject({ allergens: ['milk'], excluded: ['egg'], spicy: false, tools: ['плита'], lactose: 'low', weeks: 4, cookTimes: 7, maxMinutes: 45 })
  })
})
