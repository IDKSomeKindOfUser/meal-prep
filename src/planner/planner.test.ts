import { describe, expect, test } from 'vitest'
import { ALLERGENS } from '../data/types'
import { ingredients, recipeAllergens, recipeLactose, recipes } from '../data'
import { alternatives, defaultCatalog as catalog, describeMenu, planMenu, replaceDish, type Plan } from './index'
import { NO_LIMITS, SLOTS, TOOLS, type Settings } from './types'

const usual: Settings = {
  ...NO_LIMITS, kcal: 2000, protein: 120, weeks: 1, cookTimes: 2, budget: null, maxMinutes: null,
}
const plan = (over: Partial<Settings> = {}, seed = 1): Plan => {
  const result = planMenu({ ...usual, ...over }, catalog, seed)
  if (!result.ok) throw new Error(JSON.stringify(result.missing))
  return result
}
const byId = new Map(recipes.map((r) => [r.id, r]))

describe('a usual menu', () => {
  test('every day has breakfast, two mains and a snack', () => {
    const { menu, report } = plan()
    expect(report.days).toHaveLength(7)
    for (const block of menu) expect(SLOTS.map((s) => byId.get(block[s])!.type)).toEqual(['breakfast', 'main', 'main', 'snack'])
  })
  test.each([1, 2, 3, 7] as const)('reaches the norm when cooking %i times', (cookTimes) => {
    for (const weeks of [1, 4] as const) for (const seed of [1, 2, 3]) {
      const { report } = plan({ cookTimes, weeks }, seed)
      expect(report.warnings).toEqual([])
      for (const d of report.days) {
        expect(Math.abs(d.kcal / 2000 - 1)).toBeLessThanOrEqual(0.05)
        expect(d.protein).toBeGreaterThanOrEqual(108)
      }
    }
  })
  test('the same seed gives the same menu, another seed a different one', () => {
    expect(plan({ weeks: 4 }, 5).menu).toEqual(plan({ weeks: 4 }, 5).menu)
    expect(plan({}, 5).menu).not.toEqual(plan({}, 6).menu)
  })
  test('weeks of a month differ and a dish is not repeated within a week', () => {
    const { menu } = plan({ weeks: 4 })
    const weeks = [0, 1, 2, 3].map((w) => menu.slice(w * 2, w * 2 + 2).flatMap((b) => SLOTS.map((s) => b[s])))
    for (const w of weeks) expect(new Set(w).size).toBe(w.length)
    expect(new Set(weeks.map((w) => [...w].sort().join())).size).toBe(4)
  })
  test('short cooking is preferred when asked for', () => {
    const { menu } = plan({ maxMinutes: 35 })
    for (const b of menu) for (const s of SLOTS) expect(byId.get(b[s])!.minutes).toBeLessThanOrEqual(35)
  })
  test('the cooking plan freezes late portions', () => {
    const { report } = plan({ cookTimes: 1 })
    expect(report.cookings).toHaveLength(1)
    const dishes = report.cookings[0]!.dishes
    expect(dishes).toHaveLength(8)
    for (const d of dishes) expect(d.fridge + d.frozen).toBe(d.portions)
    expect(dishes.some((d) => d.frozen > 0)).toBe(true)
  })
})

describe('budget', () => {
  test('a menu stays within a reachable budget', () => {
    const free = plan().report.shopping.total
    const limited = plan({ budget: free * 0.8 }).report
    expect(limited.shopping.total).toBeLessThanOrEqual(free * 0.8)
    expect(limited.shortage).toBe(0)
  })
  test('an unreachable budget gives a cheap menu and the missing sum', () => {
    const { report } = plan({ budget: 100 })
    expect(report.shortage).toBeCloseTo(report.shopping.total - 100)
    expect(report.shortage).toBeGreaterThan(0)
    expect(report.shopping.total).toBeLessThan(plan().report.shopping.total)
    for (const d of report.days) expect(Math.abs(d.kcal / 2000 - 1)).toBeLessThanOrEqual(0.05)
  })
  const flat = (p: Plan) => p.menu.flatMap((b) => SLOTS.map((s) => b[s]))
  const changed = (a: Plan, b: Plan) => flat(a).filter((id, i) => id !== flat(b)[i]).length
  test.each([
    ['reachable', { budget: 4000 }],
    ['tight', { kcal: 2600, protein: 150, budget: 4000 }],
  ] as const)('a rebuild with a %s budget changes the menu noticeably', (_, over) => {
    const menus = [1, 2, 3, 4].map((seed) => plan(over, seed))
    const cheapest = Math.min(...menus.map((m) => m.report.shopping.total))
    for (const m of menus) {
      expect(m.report.warnings).toEqual([])
      expect(m.report.shopping.total).toBeLessThanOrEqual(Math.max(over.budget, cheapest * 1.08))
    }
    for (let i = 1; i < menus.length; i++) expect(changed(menus[i]!, menus[i - 1]!)).toBeGreaterThanOrEqual(3)
  })
})

describe('when nothing fits', () => {
  test('says which meal and which limit', () => {
    const result = planMenu({ ...usual, tools: [] }, catalog, 1)
    expect(result.ok).toBe(false)
    if (result.ok) return
    const main = result.missing.find((m) => m.slot === 'lunch')!
    expect(main.helps[0]!.limit).toBe('tools')
    expect(main.helps[0]!.recipes).toBeGreaterThan(0)
  })
  test('names storage when it is the only obstacle', () => {
    const fresh = { ...catalog, recipes: recipes.filter((r) => r.type !== 'snack' || r.keepDays < 4 && !r.freezable) }
    const result = planMenu(usual, fresh, 1)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.missing[0]!.helps[0]!.limit).toBe('storage')
  })
  test('an unreachable protein goal is reported, not hidden', () => {
    const { report } = plan({ protein: 400 })
    expect(report.warnings).toContain('protein')
  })
})

describe('replacing a dish', () => {
  const settings = { ...usual, allergens: ['fish' as const] }
  const { menu, report } = plan(settings)
  const options = alternatives(menu, 0, 'lunch', settings, catalog)

  test('offers only allowed dishes of the same kind, without the current one', () => {
    expect(options.length).toBeGreaterThan(5)
    for (const o of options) {
      expect(o.recipe.type).toBe('main')
      expect(recipeAllergens(o.recipe).contains).not.toContain('fish')
      expect(o.recipe.id).not.toBe(menu[0]!.lunch)
    }
  })
  test('the promised numbers match the menu after replacing', () => {
    const option = options[0]!
    const changed = replaceDish(menu, 0, 'lunch', option.recipe.id, settings, catalog)
    const after = describeMenu(changed, settings, catalog)
    expect(changed[0]!.lunch).toBe(option.recipe.id)
    expect(changed[1]).toEqual(menu[1])
    expect(after.days[0]!.kcal).toBeCloseTo(option.kcal)
    expect(after.days[0]!.protein).toBeCloseTo(option.protein)
    expect(after.shopping.total - report.shopping.total).toBeCloseTo(option.costChange)
  })
  test('refuses a forbidden dish', () => {
    const fish = recipes.find((r) => r.type === 'main' && recipeAllergens(r).contains.includes('fish'))!
    expect(() => replaceDish(menu, 0, 'lunch', fish.id, settings, catalog)).toThrow()
  })
})

test('hundreds of random settings never break a hard limit', () => {
  let state = 42
  const rnd = () => (state = (state * 16807) % 2147483647) / 2147483647
  const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)]!
  const some = <T,>(a: readonly T[], p: number) => a.filter(() => rnd() < p)
  const products = [...ingredients.keys()]
  let built = 0
  for (let n = 0; n < 400; n++) {
    const s: Settings = {
      kcal: 1300 + Math.floor(rnd() * 2000), protein: 60 + Math.floor(rnd() * 120),
      weeks: n % 10 === 0 ? 4 : 1, cookTimes: pick([1, 2, 3, 7] as const),
      budget: pick([null, 2000, 4000]), maxMinutes: pick([null, 30]),
      allergens: some(ALLERGENS, 0.12), excluded: some(products, 0.02), spicy: rnd() < 0.5,
      tools: some(TOOLS, 0.75), lactose: pick(['none', 'low', 'yes', 'yes'] as const),
    }
    const result = planMenu(s, catalog, n)
    if (!result.ok) {
      expect(result.missing.length).toBeGreaterThan(0)
      continue
    }
    built++
    const order = ['none', 'low', 'yes']
    for (const c of result.report.cookings) for (const d of c.dishes) {
      const r = d.recipe
      const a = recipeAllergens(r)
      expect([...a.contains, ...a.may].filter((x) => s.allergens.includes(x))).toEqual([])
      expect(r.ingredients.filter((i) => s.excluded.includes(i.id))).toEqual([])
      expect(r.spicy && !s.spicy).toBe(false)
      expect(r.tools.filter((t) => t !== 'без готовки' && !s.tools.includes(t))).toEqual([])
      expect(order.indexOf(recipeLactose(r))).toBeLessThanOrEqual(order.indexOf(s.lactose))
      if (!r.freezable) expect(Math.max(...d.days) - c.day).toBeLessThan(r.keepDays)
    }
    for (const d of result.report.days) for (const dish of d.dishes) for (const i of dish.batch)
      if (i.id === 'egg') expect(i.grams % 55).toBe(0)
    // Enough of everything is bought by every week.
    const bought = new Map<string, number>()
    const used = new Map<string, number>()
    result.report.shopping.weeks.forEach((w, week) => {
      for (const i of [...w.market, ...w.store]) bought.set(i.id, (bought.get(i.id) ?? 0) + i.grams)
      for (const b of result.report.blocks.filter((x) => x.block.week === week))
        for (const dish of b.day.dishes) for (const i of dish.batch) used.set(i.id, (used.get(i.id) ?? 0) + i.grams)
      for (const [id, g] of used) if (id !== 'water') expect(bought.get(id) ?? 0).toBeGreaterThanOrEqual(g - 1e-6)
    })
    expect(result.report.shortage).toBeCloseTo(Math.max(0, result.report.shopping.total - (s.budget ?? Infinity)))
  }
  expect(built).toBeGreaterThan(200)
}, 300_000)

test('is fast enough', () => {
  for (const cookTimes of [1, 2, 3, 7] as const) for (const budget of [null, 100]) for (const weeks of [1, 4] as const) {
    const start = performance.now()
    plan({ weeks, cookTimes, budget })
    const ms = performance.now() - start
    console.log(`cook ${cookTimes}, weeks ${weeks}, budget ${budget}: ${Math.round(ms)} ms`)
    expect(ms).toBeLessThan(weeks === 1 ? 1000 : 5000)
  }
}, 60_000)
