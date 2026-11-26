import { describe, expect, it } from 'vitest'
import { cookHash, dishHash, parseHash, swapHash } from './route'

describe('parseHash', () => {
  it('reads the main screens', () => {
    expect(parseHash('#week')).toEqual({ screen: 'week' })
    expect(parseHash('#settings')).toEqual({ screen: 'settings' })
  })
  it('reads a dish and its replacement', () => {
    expect(parseHash(dishHash(3, 'lunch'))).toEqual({ screen: 'dish', block: 3, slot: 'lunch' })
    expect(parseHash(swapHash(0, 'snack'))).toEqual({ screen: 'swap', block: 0, slot: 'snack' })
  })
  it('falls back to today', () => {
    for (const hash of ['', '#', '#today', '#else', '#dish', '#dish/1', '#dish/-1/lunch', '#dish/x/lunch', '#dish/1/tea', '#dish/1/lunch/2'])
      expect(parseHash(hash)).toEqual({ screen: 'today' })
  })
})

describe('cooking route', () => {
  it('reads a cooking day', () => {
    expect(parseHash(cookHash(4))).toEqual({ screen: 'cook', day: 4 })
    expect(parseHash('#shopping')).toEqual({ screen: 'shopping' })
    for (const hash of ['#cook', '#cook/x', '#cook/-1', '#cook/1/2']) expect(parseHash(hash)).toEqual({ screen: 'today' })
  })
})
