import { describe, expect, it } from 'vitest'
import { defaultCatalog } from '../planner'
import { dishTints } from './tints'

const byId = (id: string) => defaultCatalog.recipes.find((r) => r.id === id)!

describe('dishTints', () => {
  it('puts seafood first', () => {
    expect(dishTints(byId('m-q-shrimpnoodle'))[0]).toBe('sea')
  })
  it('marks asian dishes red', () => {
    expect(dishTints(byId('m-lomein'))).toContain('chili')
  })
  it('marks milk porridge with berries as berry and milk', () => {
    expect(dishTints(byId('b-m-semolina'))).toEqual(['berry', 'milk'])
  })
  it('marks lentils green and Italian pasta olive', () => {
    expect(dishTints(byId('m-l-soup'))).toContain('leaf')
    expect(dishTints(byId('m-bolo'))).toContain('olive')
  })
  it('gives at most two tints to every dish', () => {
    expect(defaultCatalog.recipes.every((r) => dishTints(r).length <= 2)).toBe(true)
  })
})
