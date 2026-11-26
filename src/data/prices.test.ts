import { describe, expect, it, test } from 'vitest'
import { getPrice, ingredients, prices } from '.'

const bought = [...ingredients.values()].filter((i) => i.buyBy !== 'free')

describe('цены', () => {
  it('есть у всех продуктов, кроме воды, и нет лишних', () => {
    expect(Object.keys(prices).sort()).toEqual(bought.map((i) => i.id).sort())
    expect(getPrice('water')).toBeNull()
  })

  test.each(bought.map((i) => [i.id, i] as const))('%s: записи полные', (id, ingredient) => {
    const { packGrams, records } = prices[id]!
    expect(getPrice(id)!.perKg).toBeGreaterThan(0)
    if (ingredient.buyBy === 'pack') expect(packGrams).toBeGreaterThan(0)
    else expect(packGrams).toBeNull()
    for (const r of records) {
      expect(r.price).toBeGreaterThan(0)
      expect(r.grams).toBeGreaterThan(0)
      expect(['market', 'pyaterochka', 'spar']).toContain(r.shop)
      expect(r.date).toMatch(/^2026-\d\d-\d\d$/)
      if (r.status === 'found') expect(r.url).toMatch(/^https:\/\//)
      else expect(r.note).toBeTruthy()
    }
  })

  it('пачка считается по средней за килограмм', () => {
    // Творог 200 г: 144,99 и 109,99 ₽.
    expect(getPrice('cottage')!.pack!.price).toBeCloseTo(127.49)
  })

  it('индейка и горбуша помечены: цены рынка нет', () => {
    expect(getPrice('turkey')!.notFromMarket).toBe(true)
    expect(getPrice('pink')!.notFromMarket).toBe(true)
    expect(getPrice('beef')!.notFromMarket).toBe(false)
  })
})
