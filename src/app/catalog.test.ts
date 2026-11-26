import { describe, expect, it } from 'vitest'
import { defaultCatalog } from '../planner'
import { makeCatalog, parseOverrides } from './catalog'

const packed = [...['rice', 'buckwheat']].find((id) => defaultCatalog.price(id)?.pack) ?? 'rice'

describe('makeCatalog', () => {
  it('is the built-in catalog without own prices', () => expect(makeCatalog({})).toBe(defaultCatalog))
  it('uses own pack price and weight', () => {
    const price = makeCatalog({ [packed]: { price: 100, grams: 500 } }).price(packed)!
    expect(price.pack).toEqual({ grams: 500, price: 100 })
    expect(price.perKg).toBeCloseTo(200)
  })
  it('keeps other products', () => {
    expect(makeCatalog({ [packed]: { price: 1, grams: 1 } }).price('chicken')).toEqual(defaultCatalog.price('chicken'))
  })
})
describe('parseOverrides', () => {
  it('drops unknown products and bad numbers', () => {
    expect(parseOverrides({ [packed]: { price: 90, grams: 400 }, nope: { price: 1, grams: 1 }, chicken: { price: -1, grams: 1000 }, x: 5 }))
      .toEqual({ [packed]: { price: 90, grams: 400 } })
    expect(parseOverrides(null)).toEqual({})
  })
})
