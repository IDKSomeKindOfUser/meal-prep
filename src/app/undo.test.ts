import { describe, expect, it } from 'vitest'
import type { SavedPlan } from './storage'
import { planKey, undoPlan } from './undo'

const plan = (seed: number, checked?: string[]) => ({ seed, start: '2026-11-25', checked }) as unknown as SavedPlan

describe('undo', () => {
  it('after a replaced dish keeps the purchases marked since', () => {
    expect(undoPlan(plan(1, ['0:rice', '0:egg']), plan(1, ['0:rice']), true).checked).toEqual(['0:rice', '0:egg'])
    expect(undoPlan(plan(1), plan(1, ['0:rice']), true).checked).toBeUndefined()
  })
  it('after a new menu brings back its own purchases', () => {
    expect(undoPlan(plan(2, ['0:egg']), plan(1, ['0:rice']), false).checked).toEqual(['0:rice'])
  })
  it('marking purchases does not count as another menu', () => {
    expect(planKey(plan(1, ['0:rice']))).toBe(planKey(plan(1)))
    expect(planKey(plan(2))).not.toBe(planKey(plan(1)))
  })
})
