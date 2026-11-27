import { describe, expect, it } from 'vitest'
import { defaultCatalog } from '../planner'
import { findDishes, isNew } from './dishes'
import { cardHash, parseHash } from './route'
import type { Recipe } from '../data/types'

const recipes = defaultCatalog.recipes
const byId = (id: string) => recipes.find((r) => r.id === id)!

describe('findDishes', () => {
  it('shows every dish by default', () => {
    expect(findDishes(recipes, 'all', '')).toHaveLength(recipes.length)
  })
  it('keeps only the chosen type', () => {
    for (const type of ['breakfast', 'main', 'snack'] as const) {
      const found = findDishes(recipes, type, '')
      expect(found.length).toBeGreaterThan(0)
      expect(found.every((r) => r.type === type)).toBe(true)
    }
  })
  it('searches the name ignoring case, ё and extra spaces', () => {
    const name = byId('b-m-millet').name
    expect(findDishes(recipes, 'all', `  ${name.toUpperCase()} `).map((r) => r.id)).toContain('b-m-millet')
    const withYo = { ...byId('b-m-millet'), id: 'x', name: 'Тёплый салат' } as Recipe
    expect(findDishes([withYo], 'all', 'теплый')).toEqual([withYo])
    expect(findDishes(recipes, 'all', 'нет такого блюда')).toEqual([])
  })
  it('combines the type and the search', () => {
    expect(findDishes(recipes, 'snack', byId('b-m-millet').name)).toEqual([])
  })
  it('puts new dishes first', () => {
    const found = findDishes(recipes, 'all', '', '2026-11-28')
    const first = found.findIndex((r) => !isNew(r, '2026-11-28'))
    expect(found.slice(first).some((r) => isNew(r, '2026-11-28'))).toBe(false)
    expect(first).toBeGreaterThan(0)
  })
})

describe('isNew', () => {
  const dish = byId('b-m-millet')
  it('marks the dishes of stage 20 for 7 days', () => {
    expect(dish.added).toBe('2026-11-28')
    expect(isNew(dish, '2026-11-28')).toBe(true)
    expect(isNew(dish, '2026-12-04')).toBe(true)
    expect(isNew(dish, '2026-12-05')).toBe(false)
    expect(isNew(dish, '2026-11-27')).toBe(false)
  })
  it('does not mark dishes without a date', () => {
    expect(isNew(byId('b-eggmuff'), '2026-11-28')).toBe(false)
  })
})


describe('card route', () => {
  it('reads a dish from the list', () => {
    expect(parseHash('#dishes')).toEqual({ screen: 'dishes' })
    expect(parseHash(cardHash('b-m-millet'))).toEqual({ screen: 'card', id: 'b-m-millet' })
  })
})
