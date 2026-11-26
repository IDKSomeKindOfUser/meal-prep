import type { Recipe } from '../data/types'

/** Temporary food until photos arrive: a bowl seen from above, coloured by what the dish is made of. */
const COLOR: Record<string, string> = {
  chicken: '#e3a35a', beef: '#6b2d16', bmince: '#7c3519', egg: '#f4c64e', cottage: '#fdfbf2', milk: '#faf6ea',
  kefir: '#faf6ea', cheese: '#f0b93a', yogurt: '#fbfaf5', rice: '#f7f3e8', buckw: '#8a5a2c', pasta: '#eac874',
  noodle: '#eac874', oats: '#e2cfa4', flour: '#e5bd7a', bread: '#c98b45', lavash: '#e8c98e', tortilla: '#e8c98e',
  potato: '#e9c25c', onion: '#efe0c4', carrot: '#e8862a', pepper: '#d0301f', tomato: '#d63a26', cucumber: '#79b356',
  broccoli: '#3e8f3a', spinach: '#3f7d35', vegmix: '#8fbf3f', greens: '#4f9a3c', lemon: '#f5df5a', banana: '#f3dc8a',
  apple: '#c8d46a', berries: '#a5162f', ctomato: '#b8391f', tpaste: '#a8361a', beans: '#7a2030', corn: '#f2c531',
  coconut: '#f8f4ea', honey: '#e0a021', gochu: '#b3271b', ketchup: '#b8261b', pbutter: '#b9813f', nuts: '#9a6a36',
  choc: '#3f2415', hummus: '#dcbf86', mush: '#c9b193', crumbs: '#d39b4c', semolina: '#f3e6c0', crisp: '#c99a5b',
  dates: '#5c3018', mandarin: '#f08a1d', chickpea: '#dcb266', lentr: '#dd7a35', lentg: '#7a7a3a', thigh: '#c9742c',
  turkey: '#e0b184', pork: '#b5673f', salmon: '#f08060', pink: '#ee9a7c', salmsalt: '#f0734f', shrimp: '#f5a184',
  peking: '#cfe0a0', iceberg: '#b9d98a', gbeans: '#5f9a3a',
}
const BASE = new Set([
  'rice', 'buckw', 'pasta', 'noodle', 'oats', 'potato', 'lentr', 'lentg', 'flour', 'semolina', 'cottage', 'yogurt',
  'milk', 'kefir', 'lavash', 'tortilla', 'bread', 'crisp', 'ctomato', 'tpaste', 'iceberg', 'peking',
])
const GOLDEN = 2.39996

function shade(hex: string, by: number): string {
  const part = (i: number) => Math.max(0, Math.min(255, parseInt(hex.slice(i, i + 2), 16) + by))
  return `rgb(${part(1)} ${part(3)} ${part(5)})`
}

export function DishArt({ recipe }: { recipe: Recipe }) {
  const parts = recipe.ingredients.filter((i) => COLOR[i.id]).sort((a, b) => b.grams - a.grams)
  const base = parts.find((p) => BASE.has(p.id)) ?? parts[0]
  const color = base ? COLOR[base.id]! : '#f1ead9'
  const toppings = parts.filter((p) => p !== base).slice(0, 5)
  const total = toppings.reduce((a, p) => a + p.grams, 0)
  // Pieces of one product stay apart because products take turns.
  const pieces = toppings.flatMap((p) => {
    const amount = Math.max(3, Math.round((p.grams / total) * 26))
    return Array.from({ length: amount }, (_, i) => ({ id: p.id, order: (i + 0.5) / amount, big: p.grams > 60 }))
  }).sort((a, b) => a.order - b.order)
  const spot = (i: number, n: number, radius: number) => {
    const r = radius * Math.sqrt((i + 0.5) / n)
    return { cx: (50 + r * Math.cos(i * GOLDEN)).toFixed(1), cy: (50 + r * Math.sin(i * GOLDEN)).toFixed(1) }
  }
  return (
    <svg className="art" viewBox="4 4 92 92" aria-hidden="true">
      <circle cx="50" cy="50" r="46" fill="#f4efe2" />
      <circle cx="50" cy="50" r="41" fill={color} />
      {Array.from({ length: 60 }, (_, i) => (
        <circle key={i} {...spot(i, 60, 38.5)} r="2.4" fill={shade(color, i % 2 ? -20 : 12)} />
      ))}
      {pieces.map((p, i) => (
        <circle key={`p${i}`} {...spot(i, pieces.length, 34)} r={p.big ? 6.4 : 4} fill={shade(COLOR[p.id]!, ((i % 3) - 1) * 16)} />
      ))}
    </svg>
  )
}
