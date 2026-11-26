import { describe, expect, it } from 'vitest'
import { averagePrice, type PriceRecord } from './averagePrice'

const record = (shop: PriceRecord['shop'], price: number, grams: number, status: PriceRecord['status'] = 'found'): PriceRecord => ({
  price, grams, shop, status, date: '2026-11-25', url: null,
})

describe('средняя цена', () => {
  it('два магазина: среднее за килограмм, а не за пачку', () => {
    // 100 ₽ за 500 г и 100 ₽ за 1 кг: 200 и 100 ₽/кг.
    const result = averagePrice('store', [record('spar', 100, 500), record('pyaterochka', 100, 1000)])
    expect(result).toEqual({ perKg: 150, shops: ['spar', 'pyaterochka'], estimated: false, notFromMarket: false })
  })

  it('несколько записей одного магазина весят как один магазин', () => {
    const result = averagePrice('store', [record('spar', 100, 1000), record('spar', 300, 1000), record('pyaterochka', 400, 1000)])
    expect(result.perKg).toBe(300)
  })

  it('один магазин: берётся его цена', () => {
    const result = averagePrice('store', [record('spar', 90, 450)])
    expect(result).toEqual({ perKg: 200, shops: ['spar'], estimated: false, notFromMarket: false })
  })

  it('мясо и рыба: магазины не влияют на среднюю рынка', () => {
    const result = averagePrice('market', [record('market', 550, 1000), record('market', 950, 1000), record('spar', 2000, 1000)])
    expect(result).toEqual({ perKg: 750, shops: ['market'], estimated: false, notFromMarket: false })
  })

  it('рынок без цены: берутся магазины с пометкой', () => {
    const result = averagePrice('market', [record('spar', 450, 1000), record('pyaterochka', 570, 1000)])
    expect(result).toEqual({ perKg: 510, shops: ['spar', 'pyaterochka'], estimated: false, notFromMarket: true })
  })

  it('рыночная цена не попадает в среднюю магазинного продукта', () => {
    const result = averagePrice('store', [record('market', 900, 1000), record('spar', 300, 1000)])
    expect(result.perKg).toBe(300)
  })

  it('оценка помечается', () => {
    expect(averagePrice('market', [record('market', 200, 1000, 'estimate')]).estimated).toBe(true)
  })

  it('без подходящих цен это ошибка, а не NaN', () => {
    expect(() => averagePrice('store', [])).toThrow()
  })
})
