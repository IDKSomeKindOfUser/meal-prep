import { describe, expect, it } from 'vitest'
import { alternatives, defaultCatalog, planMenu, replaceDish } from '../planner'
import { EMPTY_FORM, readForm } from './form'
import { parseState, EMPTY_STATE, type SavedState } from './storage'

const form = { ...EMPTY_FORM, normBy: 'manual' as const, kcal: '2000', protein: '100' }
const read = readForm(form)
if (!read.ok) throw new Error('bad form')
const made = planMenu(read.settings, defaultCatalog, 1)
if (!made.ok) throw new Error('no menu')
const state: SavedState = { version: 1, form, prices: {}, own: { products: [], recipes: [] }, plan: { settings: read.settings, menu: made.menu, seed: 1, start: '2026-11-25' } }

describe('parseState', () => {
  it('restores what was saved', () => expect(parseState(JSON.stringify(state))).toEqual(state))
  it('restores a menu with a replaced dish', () => {
    const { settings, menu } = state.plan!
    const other = alternatives(menu, 0, 'lunch', settings, defaultCatalog)[0]!.recipe.id
    const edited = { ...state, plan: { ...state.plan!, edited: true, menu: replaceDish(menu, 0, 'lunch', other, settings, defaultCatalog) } }
    expect(parseState(JSON.stringify(edited))).toEqual(edited)
  })
  it('restores own prices and drops broken ones', () => {
    const own = { ...state, prices: { rice: { price: 99, grams: 700 } } }
    expect(parseState(JSON.stringify(own))).toEqual(own)
    expect(parseState(JSON.stringify({ ...own, prices: { rice: { price: 'a' }, zzz: { price: 1, grams: 1 } } })).prices).toEqual({})
  })
  it('starts empty without data or with broken data', () => {
    for (const text of [null, '', '{', 'null', '[]', '5', '{"version":99}']) expect(parseState(text)).toEqual(EMPTY_STATE)
  })
  it('keeps the form when the plan does not fit the recipes any more', () => {
    const broken = structuredClone(state)
    broken.plan!.menu[0]!.lunch = 'gone'
    expect(parseState(JSON.stringify(broken))).toEqual({ ...state, plan: null })
    const short = structuredClone(state)
    short.plan!.menu.pop()
    expect(parseState(JSON.stringify(short)).plan).toBeNull()
    const date = structuredClone(state)
    date.plan!.start = 'завтра'
    expect(parseState(JSON.stringify(date)).plan).toBeNull()
  })
  it('replaces form fields of a wrong type with defaults', () => {
    const odd = { ...state, form: { ...form, age: 5, tools: 'плита', cookTimes: 9 } }
    expect(parseState(JSON.stringify(odd)).form).toEqual(form)
  })
})
