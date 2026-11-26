import { describe, expect, test } from 'vitest'
import { recipes } from '../data'
import { defaultCatalog as catalog, planMenu } from './index'
import { kindsOf, meatsOf, type Prefer } from './prefer'
import { NO_LIMITS, SLOTS, type Settings } from './types'

const usual: Settings = {
  ...NO_LIMITS, kcal: 2000, protein: 120, weeks: 1, cookTimes: 2, budget: null, maxMinutes: null,
}
const byId = new Map(recipes.map((r) => [r.id, r]))

/** Dishes of all menus built with these seeds. */
function dishes(over: Partial<Settings>, seeds = [1, 2, 3, 4]) {
  return seeds.flatMap((seed) => {
    const result = planMenu({ ...usual, ...over }, catalog, seed)
    if (!result.ok) throw new Error(JSON.stringify(result.missing))
    return result.menu.flatMap((b) => SLOTS.map((s) => byId.get(b[s])!))
  })
}

describe('dish tags', () => {
  test('meat comes from the ingredients', () => {
    expect(meatsOf(byId.get('m-curry')!)).toEqual(['chicken'])
    expect(meatsOf(byId.get('m-t-honey')!)).toEqual(['chicken'])
    expect(meatsOf(byId.get('m-sh-pasta')!)).toEqual(['fish'])
    expect(meatsOf(byId.get('b-syrniki')!)).toEqual(['none'])
  })
  test('the kind comes from the name and the ingredients', () => {
    expect(kindsOf(byId.get('m-kharcho')!)).toContain('soup')
    expect(kindsOf(byId.get('m-bolo')!)).toContain('pasta')
    expect(kindsOf(byId.get('b-zap')!)).toContain('bake')
    expect(kindsOf(byId.get('b-buckmilk')!)).toEqual(expect.arrayContaining(['porridge', 'buckwheat']))
  })
  test('every main dish has some kind', () => {
    const untagged = recipes.filter((r) => r.type === 'main' && kindsOf(r).length === 0).map((r) => r.id)
    expect(untagged).toEqual([])
  })
})

describe('wishes before a rebuild', () => {
  const count = (list: ReturnType<typeof dishes>, ok: (r: (typeof list)[number]) => boolean) => list.filter(ok).length
  test('preferring chicken gives more chicken', () => {
    const chicken = (r: (typeof recipes)[number]) => meatsOf(r).includes('chicken')
    const prefer: Prefer = { meats: ['chicken'], kinds: [] }
    expect(count(dishes({ prefer }), chicken)).toBeGreaterThan(count(dishes({}), chicken) * 1.2)
  })
  test('preferring fish gives more fish', () => {
    const fish = (r: (typeof recipes)[number]) => meatsOf(r).includes('fish')
    const prefer: Prefer = { meats: ['fish'], kinds: [] }
    expect(count(dishes({ prefer }), fish)).toBeGreaterThan(count(dishes({}), fish) * 1.5)
  })
  test('preferring pasta gives more pasta', () => {
    const pasta = (r: (typeof recipes)[number]) => kindsOf(r).includes('pasta')
    const prefer: Prefer = { meats: [], kinds: ['pasta'] }
    expect(count(dishes({ prefer }), pasta)).toBeGreaterThan(count(dishes({}), pasta) * 1.5)
  })
  test('wishes do not break the norm', () => {
    const result = planMenu({ ...usual, prefer: { meats: ['fish'], kinds: ['soup'] } }, catalog, 1)
    if (!result.ok) throw new Error('no menu')
    expect(result.report.warnings).toEqual([])
  })
})
