export type Shop = 'market' | 'pyaterochka' | 'spar'

export interface PriceRecord {
  /** Rubles for `grams` of product. */
  price: number
  grams: number
  shop: Shop
  /** ISO date when the price was seen or estimated. */
  date: string
  /** `null` only for estimates. */
  url: string | null
  status: 'found' | 'estimate'
  note?: string
}

export interface AveragePrice {
  perKg: number
  shops: Shop[]
  /** At least one of the averaged prices is an estimate. */
  estimated: boolean
  /** A market product priced by a shop because there is no market price. */
  notFromMarket: boolean
}

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length

/** Meat and fish take the market mean; everything else takes the mean of shops. Shops weigh equally. */
export function averagePrice(place: 'market' | 'store', records: PriceRecord[]): AveragePrice {
  const inShops = records.filter((r) => r.shop !== 'market')
  const atMarket = records.filter((r) => r.shop === 'market')
  const used = place === 'market' && atMarket.length > 0 ? atMarket : inShops
  if (used.length === 0) throw new Error('No price records to average')

  const shops = [...new Set(used.map((r) => r.shop))]
  const perShop = shops.map((shop) =>
    mean(used.filter((r) => r.shop === shop).map((r) => (r.price / r.grams) * 1000)),
  )
  return {
    perKg: mean(perShop),
    shops,
    estimated: used.some((r) => r.status === 'estimate'),
    notFromMarket: place === 'market' && used === inShops,
  }
}
