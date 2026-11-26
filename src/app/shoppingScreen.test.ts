import { describe, expect, it } from 'vitest'
import { defaultCatalog, describeMenu, planMenu } from '../planner'
import { EMPTY_FORM, readForm } from './form'
import { parseState } from './storage'
import { buyAmount, listText } from './ShoppingScreen'

const form = { ...EMPTY_FORM, normBy: 'manual' as const, kcal: '2000', protein: '100' }
const read = readForm(form)
if (!read.ok) throw new Error('bad form')
const made = planMenu(read.settings, defaultCatalog, 1)
if (!made.ok) throw new Error('no menu')
const plan = { settings: read.settings, menu: made.menu, seed: 1, start: '2026-11-25' }

describe('shopping list', () => {
  it('lists add up to the week check', () => {
    const report = describeMenu(plan.menu, plan.settings, defaultCatalog)
    const week = report.shopping.weeks[0]!
    const sum = [...week.market, ...week.store].reduce((a, i) => a + i.cost, 0)
    expect(sum).toBeCloseTo(week.marketCost + week.storeCost, 6)
    expect(sum).toBeCloseTo(report.shopping.total, 6)
    for (const item of [...week.market, ...week.store]) expect(buyAmount(item)).toMatch(/\d/)
  })
  it('keeps checked items after reload and drops a broken list', () => {
    const state = { version: 1, form, plan: { ...plan, checked: ['0:rice'] } }
    expect(parseState(JSON.stringify(state)).plan?.checked).toEqual(['0:rice'])
    expect(parseState(JSON.stringify({ ...state, plan: { ...plan, checked: 'x' } })).plan?.checked).toBeUndefined()
  })
  it('shows short amounts: kilos, pieces, litres', () => {
    const item = { id: 'rice', need: 1990, units: 1, unit: 'weight' as const, grams: 1990, cost: 1 }
    expect(buyAmount(item)).toBe('2 кг')
    expect(buyAmount({ ...item, id: 'egg', unit: 'pack', units: 2, grams: 1100 }, 55)).toBe('20 шт.')
    expect(buyAmount({ ...item, id: 'milk', unit: 'pack', grams: 1030 })).toBe('1 л')
    expect(buyAmount({ ...item, grams: 300 })).toBe('300 г')
    expect(listText([item], defaultCatalog)).toMatch(/: 2 кг$/)
  })
})
