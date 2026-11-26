import type { Report } from '../planner'
import { SLOTS, type Slot } from '../planner/types'
import { addDays, dayMonth, weekday } from './dates'
import { DayChart } from './DayChart'
import { DishPicture } from './DishPicture'
import { GoIcon } from './parts'
import { COOK, count, num, rub, SLOT } from './labels'
import { cookingMinutes } from './cookOrder'
import { cookHash } from './route'
import { checkKey } from './ShoppingScreen'
import { cookingKeys, type SavedPlan } from './storage'

const capital = (s: string) => s[0]!.toUpperCase() + s.slice(1)

/** A value against its goal. The numbers are written out, so the bar is never the only signal. */
function Meter({ label, value, goal, unit }: { label: string; value: number; goal: number; unit: string }) {
  const share = goal > 0 ? value / goal : 0
  return (
    <div className="meter">
      <p><span>{label}</span> <b>{num(value)}</b> из {num(goal)}{unit && ` ${unit}`}</p>
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

/** Progress as a ring with the numbers beside it. */
function Ring({ done, all, label }: { done: number; all: number; label: string }) {
  const share = all > 0 ? (done / all) * 100 : 0
  return (
    <div className="ring-row">
      <svg className="ring" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="20" pathLength="100" />
        <circle cx="24" cy="24" r="20" pathLength="100" strokeDasharray={`${share} 100`} />
      </svg>
      <p><b>{done} из {all}</b> <span className="hint">{label}</span></p>
    </div>
  )
}

/** Share of the week's products already ticked. */
function BoughtRing({ plan, report, week }: { plan: SavedPlan; report: Report; week: number }) {
  const list = report.shopping.weeks[week]!
  const all = [...list.market, ...list.store]
  const checked = new Set(plan.checked ?? [])
  const done = all.filter((i) => checked.has(checkKey(week, i.id))).length
  return <Ring done={done} all={all.length} label="куплено" />
}

/** Dishes of one cooking marked as cooked: the ring fills up in one go, not over the week. */
function CookedRing({ plan, cookDay }: { plan: SavedPlan; cookDay: number }) {
  const keys = cookingKeys(plan.settings.cookTimes, plan.settings.weeks, cookDay)
  const cooked = new Set(plan.cooked ?? [])
  return <Ring done={keys.filter((k) => cooked.has(k)).length} all={keys.length} label="блюд этой готовки приготовлено" />
}

/** Right column of the cooking screen. */
export function CookSide({ plan, day }: { plan: SavedPlan; day: number }) {
  return (
    <aside className="side widgets" aria-label="Сводка готовки">
      <section className="widget">
        <h2>Эта готовка</h2>
        <CookedRing plan={plan} cookDay={day} />
      </section>
    </aside>
  )
}

/** Market and store parts of the week's bill as one split bar. */
function Split({ marketCost, storeCost }: { marketCost: number; storeCost: number }) {
  const sum = marketCost + storeCost
  const market = sum > 0 ? Math.round((marketCost / sum) * 100) : 0
  return (
    <div className="meter">
      <p><span>Рынок</span> <b>{rub(marketCost)}</b> · <span>магазин</span> <b>{rub(storeCost)}</b></p>
      <div className="bar split" aria-hidden="true"><i style={{ inlineSize: `${market}%` }} /><i /></div>
      <p className="hint">На рынке {market}% чека, в магазине {100 - market}%.</p>
    </div>
  )
}

export function TodaySide({ plan, report, day, onDay }: { plan: SavedPlan; report: Report; day: number; onDay: (day: number) => void }) {
  const { settings, start } = plan
  const week = Math.floor(day / 7)
  const next = report.cookings.find((c) => c.day >= day)
  const shopping = report.shopping.weeks[week]!
  const month = settings.weeks > 1
  return (
    <aside className="side widgets" aria-label="Сводка">
      {next && (
        <section className="widget">
          <h2>Ближайшая готовка</h2>
          <p><b>{next.day === day ? 'Сегодня' : `${capital(weekday(addDays(start, next.day)))}, ${dayMonth(addDays(start, next.day))}`}</b></p>
          <p className="hint">{count(next.dishes.length, 'блюдо', 'блюда', 'блюд')}, около {num(cookingMinutes(next.dishes))} мин</p>
          <CookedRing plan={plan} cookDay={next.day} />
          <a className="tonal" href={cookHash(next.day)}>Начать готовку<GoIcon /></a>
        </section>
      )}
      <section className="widget">
        <h2>Покупки</h2>
        <BoughtRing plan={plan} report={report} week={week} />
        <a className="tonal" href="#shopping">К списку<GoIcon /></a>
      </section>
      <section className="widget">
        <h2>Неделя</h2>
        <DayChart start={start} firstDay={week * 7} goal={settings.kcal} day={day} onDay={onDay}
          days={report.days.slice(week * 7, week * 7 + 7).map((d) => d.kcal)} />
      </section>
      <section className="widget">
        <div className="sum">
          <h2>{month ? `Чек недели ${week + 1}` : 'Чек недели'}</h2>
          <b>{rub(shopping.marketCost + shopping.storeCost)}</b>
        </div>
        <Split marketCost={shopping.marketCost} storeCost={shopping.storeCost} />
        {month && <p className="hint">За 4 недели {rub(report.shopping.total)}</p>}
      </section>
    </aside>
  )
}

export function ShoppingSide({ plan, report, week }: { plan: SavedPlan; report: Report; week: number }) {
  const { marketCost, storeCost } = report.shopping.weeks[week]!
  return (
    <aside className="side" aria-label="Сводка покупок">
      <h2>Сводка покупок</h2>
      <Bought plan={plan} report={report} week={week} />
      <Split marketCost={marketCost} storeCost={storeCost} />
      {plan.settings.budget !== null && (
        <Meter label="Бюджет" value={Math.ceil(report.shopping.total)} goal={plan.settings.budget} unit="₽" />
      )}
    </aside>
  )
}

export function SettingsSide({ plan }: { plan: SavedPlan | null }) {
  if (!plan) return (
    <aside className="side" aria-label="Как собирается меню">
      <h2>Как собирается меню</h2>
      <ul className="facts-list">
        <li>Норма считается по анкете или берётся та, что вы введёте сами.</li>
        <li>Блюда подбираются так, чтобы день отличался от нормы не больше чем на 5% по калориям, а белка было не меньше 90%.</li>
        <li>Готовить можно заранее: меню сгруппировано по дням готовки.</li>
      </ul>
      <p className="hint">Заполните настройки и нажмите «Собрать меню»: здесь появится итог.</p>
    </aside>
  )
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
      <p className="hint">{SLOT[slot]}, готовить {dish.recipe.minutes} мин. День сейчас: {num(day.kcal)} ккал, белка {num(day.protein)} г.</p>
    </aside>
  )
}
