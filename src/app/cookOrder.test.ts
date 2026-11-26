import { describe, expect, it } from 'vitest'
import { cookOrder } from './cookOrder'

const dish = (name: string, minutes: number, ...tools: string[]) => ({ name, minutes, tools })

describe('cookOrder', () => {
  it('puts the longest dish on each tool first, tools run together', () => {
    const order = cookOrder([dish('a', 20, 'плита'), dish('b', 40, 'плита'), dish('c', 30, 'аэрогриль')])
    expect(order.steps.map((s) => [s.item.name, s.tool, s.start])).toEqual([
      ['b', 'плита', 0],
      ['c', 'аэрогриль', 0],
      ['a', 'плита', 40],
    ])
    expect(order.minutes).toBe(60)
  })
  it('picks the oven, then the air fryer, as the main tool', () => {
    const order = cookOrder([dish('a', 50, 'духовка', 'плита'), dish('b', 15, 'плита', 'аэрогриль'), dish('c', 10, 'плита')])
    expect(order.steps.map((s) => s.tool)).toEqual(['духовка', 'аэрогриль', 'плита'])
    expect(order.minutes).toBe(50)
  })
  it('keeps no-cook dishes apart, done while something cooks', () => {
    const order = cookOrder([dish('a', 10, 'без готовки'), dish('b', 30, 'плита')])
    expect(order.steps.map((s) => s.item.name)).toEqual(['b'])
    expect(order.meanwhile.map((d) => d.name)).toEqual(['a'])
    expect(order.minutes).toBe(30)
  })
  it('counts no-cook time when nothing else cooks', () => {
    const order = cookOrder([dish('a', 10, 'без готовки'), dish('b', 5, 'без готовки')])
    expect(order.steps).toEqual([])
    expect(order.minutes).toBe(15)
  })
})
