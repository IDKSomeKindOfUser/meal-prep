import type { Report } from '../planner'
import { SLOTS, type Slot } from '../planner/types'
import { addDays, dayMonth, weekday } from './dates'
import { DishPicture } from './DishPicture'
import { COOK, count, num, rub, SLOT } from './labels'
import { cookHash } from './route'
import { checkKey } from './ShoppingScreen'
import type { SavedPlan } from './storage'

/** A value against its goal. The numbers are written out, so the bar is never the only signal. */
function Meter({ label, value, goal, unit }: { label: string; value: number; goal: number; unit: string }) {
  const share = goal > 0 ? value / goal : 0
  return (
    <div className="meter">
      <p><span>{label}</span> <b>{num(value)}</b> из {num(goal)} {unit}</p>
      <div className="bar" aria-hidden="true"><i style={{ inlineSize: `${Math.min(share, 1) * 100}%` }} /></div>
    </div>
  )
}

function Bought({ plan, report, week }: { plan: SavedPlan; report: Report; week: number }) {
  const list = report.shopping.weeks[week]!
  const all = [...list.market, ...list.store]
  const checked = new Set(plan.checked ?? [])
  const done = all.filter((i) => checked.has(checkKey(week, i.id))).length
  return <Meter label="Куплено продуктов" value={done} goal={all.length} unit="" />
}

export function TodaySide({ plan, report, day }: { plan: SavedPlan; report: Report; day: number }) {
  const menu = report.days[day]!
  const { settings, start } = plan
  const next = report.cookings.find((c) => c.day >= day)
  return (
    <aside className="side" aria-label="Сводка дня">
      <h2>Сводка дня</h2>
      <Meter label="Калории" value={menu.kcal} goal={settings.kcal} unit="ккал" />
      <Meter label="Белок" value={menu.protein} goal={settings.protein} unit="г" />
      {next && (
        <a className="card" href={cookHash(next.day)}>
          <span className="hint">Ближайшая готовка</span>
          <b>{next.day === day ? 'Сегодня' : `${weekday(addDays(start, next.day))}, ${dayMonth(addDays(start, next.day))}`}</b>
          <span>{count(next.dishes.length, 'блюдо', 'блюда', 'блюд')}, около {num(next.minutes)} мин</span>
        </a>
      )}
      <Bought plan={plan} report={report} week={Math.floor(day / 7)} />
    </aside>
  )
}

export function ShoppingSide({ plan, report, week }: { plan: SavedPlan; report: Report; week: number }) {
  const { marketCost, storeCost } = report.shopping.weeks[week]!
  const sum = marketCost + storeCost
  const market = sum > 0 ? Math.round((marketCost / sum) * 100) : 0
  return (
    <aside className="side" aria-label="Сводка покупок">
      <h2>Сводка покупок</h2>
      <Bought plan={plan} report={report} week={week} />
      <div className="meter">
        <p><span>Рынок</span> <b>{rub(marketCost)}</b> · <span>магазин</span> <b>{rub(storeCost)}</b></p>
        <div className="bar split" aria-hidden="true"><i style={{ inlineSize: `${market}%` }} /><i /></div>
        <p className="hint">На рынке {market}% чека, в магазине {100 - market}%.</p>
      </div>
      {plan.settings.budget !== null && (
        <Meter label="Бюджет" value={Math.ceil(report.shopping.total)} goal={plan.settings.budget} unit="₽" />
      )}
    </aside>
  )
}

export function SettingsSide({ plan }: { plan: SavedPlan | null }) {
  if (!plan) return null
  const { kcal, protein, weeks, cookTimes, budget } = plan.settings
  return (
    <aside className="side" aria-label="Текущая норма">
      <h2>Текущая норма</h2>
      <p className="big-num"><b>{num(kcal)}</b> ккал и <b>{num(protein)}</b> г белка в день</p>
      <ul className="facts-list">
        <li>Меню на {weeks === 1 ? 'неделю' : '4 недели'}, готовка {COOK[cookTimes].toLowerCase()}{cookTimes === 7 ? '' : ' в неделю'}.</li>
        <li>Блюда подбираются так, чтобы день отличался от нормы не больше чем на 5% по калориям, а белка было не меньше 90%.</li>
        <li>{budget === null ? 'Бюджет не задан: меню ищет дешёвые блюда, но не ограничено суммой.' : `Бюджет ${rub(budget)} за весь срок.`}</li>
      </ul>
      <p className="hint">Новые ответы в анкете меняют норму после кнопки сборки меню.</p>
    </aside>
  )
}

export function SwapSide({ report, block, slot }: { report: Report; block: number; slot: Slot }) {
  const { day } = report.blocks[block]!
  const dish = day.dishes[SLOTS.indexOf(slot)]!
  return (
    <aside className="side" aria-label="Текущее блюдо">
      <h2>Сейчас в меню</h2>
      <span className="thumb wide"><DishPicture recipe={dish.recipe} /></span>
      <p><b>{dish.recipe.name}</b></p>
      <p className="hint">{SLOT[slot]}, готовить {dish.recipe.minutes} мин. День сейчас: {num(day.kcal)} ккал, белка {num(day.protein)} г.</p>
    </aside>
  )
}
