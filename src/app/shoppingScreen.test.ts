import { describe, expect, it } from 'vitest'
import { defaultCatalog, describeMenu, planMenu } from '../planner'
import { EMPTY_FORM, readForm } from './form'
import { parseState } from './storage'
import { buyAmount } from './ShoppingScreen'

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
})
