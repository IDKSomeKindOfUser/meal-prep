import type { Report } from '../planner'
import type { ShoppingItem } from '../planner/shopping'
import type { Catalog } from '../planner/types'
import { addDays, dayMonth } from './dates'
import { count, num, rub } from './labels'
import { WeekTabs } from './parts'
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

/** What to buy: packs, heads of garlic, pieces or grams. */
export function buyAmount({ id, unit, units, grams }: ShoppingItem): string {
  if (unit === 'pack') return `${count(units, 'пачка', 'пачки', 'пачек')}, ${num(grams)} г`
  if (id === 'garlic') return count(units, 'головка', 'головки', 'головок')
  if (unit === 'piece') return `${num(units)} шт. (${num(grams)} г)`
  return `${num(grams)} г`
}

function Group({ title, cost, items, week, checked, catalog, onCheck }: {
  catalog: Catalog; title: string; cost: number; items: ShoppingItem[]; week: number; checked: Set<string>; onCheck: Props['onCheck']
}) {
  if (items.length === 0) return null
  const sorted = [...items].sort((a, b) => catalog.ingredient(a.id).name.localeCompare(catalog.ingredient(b.id).name, 'ru'))
  return (
    <section>
      <div className="sum"><h2>{title}</h2><b>{rub(cost)}</b></div>
      <ul className="buy">
        {sorted.map((item) => {
          const key = checkKey(week, item.id)
          const name = catalog.ingredient(item.id).name
          return (
            <li key={item.id}>
              <label>
                <input type="checkbox" checked={checked.has(key)} onChange={(e) => onCheck(key, e.target.checked)} />
                <span className="what">
                  <span className="name">{name}</span>
                  <span className="hint">{buyAmount(item)}, по рецептам нужно {num(Math.round(item.need))} г</span>
                </span>
                <b>{rub(item.cost)}</b>
              </label>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export function ShoppingScreen({ plan, report, catalog, week, onWeek, onCheck }: Props) {
  const list = report.shopping.weeks[week]!
  const checked = new Set(plan.checked ?? [])
  const all = [...list.market, ...list.store]
  const done = all.filter((i) => checked.has(checkKey(week, i.id))).length
  const first = addDays(plan.start, week * 7)
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
        <p className="hint">Соль и специи считаются имеющимися дома. Остаток пачки идёт в следующую неделю. <a href="#prices">Править цены</a></p>
      </header>
      <Group title="Рынок" cost={list.marketCost} items={list.market} week={week} checked={checked} catalog={catalog} onCheck={onCheck} />
      <Group title="Магазин" cost={list.storeCost} items={list.store} week={week} checked={checked} catalog={catalog} onCheck={onCheck} />
    </>
  )
}
