import { BackLink } from './parts'
import { useState } from 'react'
import { getIngredient, ingredients, prices } from '../data'
import { defaultCatalog } from '../planner'
import { num } from './labels'
import { validOverride, type PriceOverrides } from './catalog'

interface Props {
  overrides: PriceOverrides
  onChange: (next: PriceOverrides) => void
}

const products = [...ingredients.values()].filter((i) => i.place).sort((a, b) => a.name.localeCompare(b.name, 'ru'))
const round = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',')

function Row({ id, own, onChange }: { id: string; own: PriceOverrides[string] | undefined; onChange: (next: PriceOverrides[string] | null) => void }) {
  const base = defaultCatalog.price(id)!
  const packed = base.pack !== null
  const shown = own ?? { price: packed ? base.pack!.price : base.perKg, grams: packed ? base.pack!.grams : 1000 }
  const [price, setPrice] = useState(round(shown.price))
  const [grams, setGrams] = useState(String(Math.round(shown.grams)))
  const commit = (p: string, g: string) => {
    const next = { price: Number(p.replace(',', '.')), grams: packed ? Number(g.replace(',', '.')) : 1000 }
    if (validOverride(next)) onChange(next)
  }
  const bad = (v: string) => !(Number(v.replace(',', '.')) > 0)
  const name = getIngredient(id).name
  const estimated = prices[id]?.records.some((r) => r.status === 'estimate')
  return (
    <li>
      <div className="what">
        <span className="name">{name}</span>
        {own ? <span className="hint">Ваша цена</span> : estimated && <span className="hint">Цена примерная</span>}
      </div>
      <label>
        <span className="hint">{packed ? '₽ за пачку' : '₽ за кг'}</span>
        <input inputMode="decimal" autoComplete="off" aria-label={`${name}, ${packed ? 'рублей за пачку' : 'рублей за килограмм'}`} value={price} aria-invalid={bad(price) || undefined}
          onChange={(e) => { setPrice(e.target.value); commit(e.target.value, grams) }} />
      </label>
      {packed && (
        <label>
          <span className="hint">г в пачке</span>
          <input inputMode="decimal" autoComplete="off" aria-label={`${name}, граммов в пачке`} value={grams} aria-invalid={bad(grams) || undefined}
            onChange={(e) => { setGrams(e.target.value); commit(price, e.target.value) }} />
        </label>
      )}
      {own && (
        <button type="button" onClick={() => {
          onChange(null)
          setPrice(round(packed ? base.pack!.price : base.perKg)); setGrams(String(Math.round(packed ? base.pack!.grams : 1000)))
        }}>Вернуть {num(Math.round(packed ? base.pack!.price : base.perKg))} ₽</button>
      )}
    </li>
  )
}

export function PricesScreen({ overrides, onChange }: Props) {
  const count = Object.keys(overrides).length
  /** Rows keep what is typed; a reset of everything starts them over. */
  const [resets, setRound] = useState(0)
  return (
    <>
      <header>
        <div className="top"><BackLink href="#shopping">Назад к покупкам</BackLink></div>
        <h1 tabIndex={-1}>Цены и пачки</h1>
        <p className="sub">Исправьте цену или вес пачки, меню и чек пересчитаются. Новое меню подберётся уже по вашим ценам.</p>
        {count > 0 && (
          <button type="button" className="textbtn" onClick={() => {
            if (confirm('Вернуть все цены к исходным?')) { onChange({}); setRound((n) => n + 1) }
          }}>Вернуть все цены ({count})</button>
        )}
      </header>
      <section>
        <ul className="priced">
          {products.map((p) => (
            <Row key={`${p.id}-${resets}`} id={p.id} own={overrides[p.id]}
              onChange={(next) => {
                const copy = { ...overrides }
                if (next) copy[p.id] = next
                else delete copy[p.id]
                onChange(copy)
              }} />
          ))}
        </ul>
        <p className="note hint">Цены продуктов, которые вы добавили сами, меняются на экране <a href="#recipes">«Свои рецепты»</a>.</p>
      </section>
    </>
  )
}
