import { describe, expect, it } from 'vitest'
import { addDays, daysBetween, dayOfPlan, isIsoDate, greeting, mealNow, nextMeal, toIso } from './dates'

describe('dates', () => {
  it('uses the local calendar day', () => {
    expect(toIso(new Date(2026, 10, 25, 0, 5))).toBe('2026-11-25')
    expect(toIso(new Date(2026, 10, 25, 23, 55))).toBe('2026-11-25')
  })
  it('crosses months and clock changes', () => {
    expect(addDays('2026-11-30', 1)).toBe('2026-12-01')
    expect(daysBetween('2026-03-01', '2026-04-01')).toBe(31)
    expect(daysBetween('2026-11-25', '2026-11-20')).toBe(-5)
  })
  it('rejects dates that do not exist', () => {
    expect(isIsoDate('2026-02-29')).toBe(false)
    expect(isIsoDate('25.11.2026')).toBe(false)
    expect(isIsoDate('')).toBe(false)
    expect(isIsoDate('2026-02-28')).toBe(true)
  })
  it('tells where today is in the plan', () => {
    expect(dayOfPlan('2026-11-25', 7, '2026-11-25')).toEqual({ state: 'now', day: 0 })
    expect(dayOfPlan('2026-11-25', 7, '2026-12-01')).toEqual({ state: 'now', day: 6 })
    expect(dayOfPlan('2026-11-25', 7, '2026-12-02')).toEqual({ state: 'ended', day: 6 })
    expect(dayOfPlan('2026-11-25', 7, '2026-11-24')).toEqual({ state: 'before', day: 0 })
  })

  it('picks the meal for the hour of the day', () => {
    expect(mealNow(5)).toBe('breakfast')
    expect(mealNow(10)).toBe('breakfast')
    expect(mealNow(11)).toBe('lunch')
    expect(mealNow(14)).toBe('lunch')
    expect(mealNow(15)).toBe('snack')
    expect(mealNow(17)).toBe('snack')
    expect(mealNow(18)).toBe('dinner')
    expect(mealNow(21)).toBe('dinner')
    expect(mealNow(22)).toBeNull()
    expect(mealNow(3)).toBeNull()
  })
  it('greets by the time of day', () => {
    expect(greeting(4)).toBe('Доброй ночи')
    expect(greeting(5)).toBe('Доброе утро')
    expect(greeting(12)).toBe('Добрый день')
    expect(greeting(18)).toBe('Добрый вечер')
    expect(greeting(23)).toBe('Доброй ночи')
  })
  it('finds the next meal by the clock', () => {
    expect(nextMeal(6)).toEqual({ slot: 'breakfast', time: '8:00' })
    expect(nextMeal(8)).toEqual({ slot: 'lunch', time: '13:00' })
    expect(nextMeal(13)).toEqual({ slot: 'snack', time: '16:00' })
    expect(nextMeal(16)).toEqual({ slot: 'dinner', time: '19:00' })
    expect(nextMeal(19)).toBeNull()
  })
})
