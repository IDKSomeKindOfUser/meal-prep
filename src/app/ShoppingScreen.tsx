import { Copy, Check, Pencil } from 'lucide-react'
import { useState } from 'react'
import type { Report } from '../planner'
import type { ShoppingItem } from '../planner/shopping'
import type { Catalog } from '../planner/types'
import { addDays, dayMonth } from './dates'
import { count, num, rub } from './labels'
import { WeekTabs } from './parts'
import { celebrate } from './confetti'
import type { SavedPlan } from './storage'

interface Props {
  plan: SavedPlan
  report: Report
  catalog: Catalog
  week: number
  onWeek: (week: number) => void
  onCheck: (key: string, bought: boolean) => void
}

export const checkKey = (week: number, id: string) => `${week}:${id}`

/** Liquids are bought by volume: grams per millilitre. */
const DENSITY: Record<string, number> = { milk: 1.03, kefir: 1.03, oil: 0.92, sesoil: 0.92, soy: 1.15, vinegar: 1 }
const ORDER = ['Овощи', 'Фрукты', 'Мясо', 'Рыба и креветки', 'Яйца и молочное', 'Крупы и хлеб', 'Консервы', 'Бакалея и соусы']

const trim = (n: number) => num(Math.round(n * 10) / 10)
const weight = (g: number) => (g >= 1000 ? `${trim(g / 1000)} кг` : `${num(g)} г`)
const volume = (ml: number) => (ml >= 1000 ? `${trim(ml / 1000)} л` : `${num(ml)} мл`)

/** What to buy, short: "2 кг", "20 шт.", "1 л". */
export function buyAmount({ id, unit, units, grams }: ShoppingItem, pieceGrams: number | null = null): string {
  if (id === 'garlic') return count(units, 'головка', 'головки', 'головок')
  if (unit === 'piece') return `${num(units)} шт.`
  if (unit === 'pack' && pieceGrams) return `${num(Math.round(grams / pieceGrams))} шт.`
  const density = DENSITY[id]
  return density ? volume(Math.round(grams / density / 10) * 10) : weight(grams)
}

/** Second line: packs and the amount the recipes need, shown only when it adds something. */
function detail(item: ShoppingItem): string {
  const parts: string[] = []
  if (item.unit === 'pack') parts.push(count(item.units, 'пачка', 'пачки', 'пачек'))
  const need = Math.round(item.need)
  if (Math.abs(item.grams - need) / Math.max(need, 1) > 0.05) parts.push(`по рецептам нужно ${num(need)} г`)
  return parts.join(', ')
}

function Row({ item, catalog, checked, week, onCheck }: {
  item: ShoppingItem; catalog: Catalog; checked: boolean; week: number; onCheck: Props['onCheck']
}) {
  const product = catalog.ingredient(item.id)
  const amount = buyAmount(item, product.pieceGrams)
  const more = detail(item)
  return (
    <li>
      <label>
        <input type="checkbox" checked={checked} onChange={(e) => onCheck(checkKey(week, item.id), e.target.checked)} />
        <span className="what">
          <span className="name"><span className="line">{product.name}</span></span>
          <span className="hint">{more}</span>
        </span>
        <span className="qty"><span className="line">{amount}</span></span>
        <b>{rub(item.cost)}</b>
      </label>
    </li>
  )
}

function Group({ title, cost, items, week, checked, catalog, onCheck }: {
  catalog: Catalog; title: string; cost: number; items: ShoppingItem[]; week: number; checked: Set<string>; onCheck: Props['onCheck']
}) {
  if (items.length === 0) return null
  const byName = (a: ShoppingItem, b: ShoppingItem) =>
    catalog.ingredient(a.id).name.localeCompare(catalog.ingredient(b.id).name, 'ru')
  const isDone = (i: ShoppingItem) => checked.has(checkKey(week, i.id))
  // Купленное остаётся на месте и просто зачёркивается: меньше лишних нажатий.
  const cats = [...new Set(items.map((i) => catalog.ingredient(i.id).category))]
    .sort((a, b) => (ORDER.indexOf(a) + 100) % 100 - (ORDER.indexOf(b) + 100) % 100)
  const row = (i: ShoppingItem) => <Row key={i.id} item={i} catalog={catalog} checked={isDone(i)} week={week} onCheck={onCheck} />
  return (
    <section>
      <div className="sum"><h2>{title}</h2><b>{rub(cost)}</b></div>
      {cats.map((cat) => (
        <div key={cat}>
          <h3 className="aisle">{cat}</h3>
          <ul className="buy">{items.filter((i) => catalog.ingredient(i.id).category === cat).sort(byName).map(row)}</ul>
        </div>
      ))}
    </section>
  )
}

/** Plain text of what is still to buy, for a messenger or notes. */
export function listText(items: ShoppingItem[], catalog: Catalog): string {
  return items
    .map((i) => `${catalog.ingredient(i.id).name}: ${buyAmount(i, catalog.ingredient(i.id).pieceGrams)}`)
    .join('\n')
}

export function ShoppingScreen({ plan, report, catalog, week, onWeek, onCheck }: Props) {
  const list = report.shopping.weeks[week]!
  const checked = new Set(plan.checked ?? [])
  const all = [...list.market, ...list.store]
  const done = all.filter((i) => checked.has(checkKey(week, i.id))).length
  const first = addDays(plan.start, week * 7)
  const [copied, setCopied] = useState<boolean | null>(false)
  const check: Props['onCheck'] = (key, bought) => {
    if (bought && done + 1 === all.length) celebrate('shopping')
    onCheck(key, bought)
  }
  const copy = () => {
    const rest = all.filter((i) => !checked.has(checkKey(week, i.id)))
    navigator.clipboard?.writeText(listText(rest, catalog)).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    }, () => setCopied(null))
  }
  return (
    <>
      <header>
        <h1 tabIndex={-1}>Покупки</h1>
        <p className="sub">{dayMonth(first)} – {dayMonth(addDays(first, 6))}</p>
        <WeekTabs weeks={plan.settings.weeks} week={week} onChange={onWeek} />
        <div className="sum total">
          <span>Итого за неделю</span><b>{rub(list.marketCost + list.storeCost)}</b>
        </div>
        <p className="hint" role="status">Куплено {done} из {all.length}</p>
        <div className="actions-row">
          <button type="button" className="link" onClick={copy}>{copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}{copied ? 'Скопировано' : 'Скопировать список'}</button>
          <span className={copied === null ? 'warn' : 'sr-only'} role="status">{copied === null ? 'Не удалось скопировать' : copied ? 'Список скопирован' : ''}</span>
          <a className="tonal" href="#prices"><Pencil aria-hidden="true" />Править цены</a>
        </div>
        <p className="hint">Соль и специи считаются имеющимися дома. Остаток пачки идёт в следующую неделю.</p>
      </header>
      <Group title="Рынок" cost={list.marketCost} items={list.market} week={week} checked={checked} catalog={catalog} onCheck={check} />
      <Group title="Магазин" cost={list.storeCost} items={list.store} week={week} checked={checked} catalog={catalog} onCheck={check} />
    </>
  )
}
