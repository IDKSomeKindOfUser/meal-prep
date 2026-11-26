import type { CSSProperties } from 'react'
import { frozenDays } from '../planner/schedule'
import { DishPicture } from './DishPicture'
import type { Report } from '../planner'
import { SLOTS } from '../planner/types'
import { addDays, dayMonth, weekday, weekdayShort } from './dates'
import { count, daysCount, SLOT } from './labels'
import { dishHash } from './route'
import type { SavedPlan } from './storage'

interface Props {
  plan: SavedPlan
  report: Report
  day: number
}

export function CookScreen({ plan, report, day }: Props) {
  const date = addDays(plan.start, day)
  const rows = report.blocks
    .map((b, index) => ({ ...b, index }))
    .filter((b) => b.block.cookDay === day)
    .flatMap(({ block, day: menu, index }) =>
      SLOTS.map((slot, i) => ({ block, index, slot, dish: menu.dishes[i]! })))
  const cooking = report.cookings.find((c) => c.day === day)
  const longest = Math.max(1, ...rows.map((r) => r.dish.recipe.minutes))
  return (
    <article className="recipe">
      <div className="top"><a className="back" href="#today">Назад к меню дня</a></div>
      <header>
        <h1 tabIndex={-1}>Готовка: {weekday(date)}, {dayMonth(date)}</h1>
        <p className="sub">Всего до {cooking?.minutes ?? 0} минут, если делать блюда по очереди. Что-то можно готовить одновременно.</p>
      </header>
      <section>
        <ul className="cook">
          {rows.map(({ block, index, slot, dish }) => {
            const frozen = frozenDays(dish.recipe, block)
            const days = `${weekdayShort(addDays(plan.start, block.firstDay))}${block.days > 1 ? ` – ${weekdayShort(addDays(plan.start, block.firstDay + block.days - 1))}` : ''}`
            return (
              <li key={`${index}-${slot}`} data-slot={slot}>
                <span className="thumb"><DishPicture recipe={dish.recipe} /></span>
                <div>
                  <a href={dishHash(index, slot)}>{dish.recipe.name}</a>
                  <ul className="facts">
                    <li>{SLOT[slot]}, {days}</li>
                    <li>{count(block.days, 'порция', 'порции', 'порций')}</li>
                    {frozen.length > 0 && <li>в морозилку {frozen.length} из {block.days}</li>}
                    <li>хранится {daysCount(dish.recipe.keepDays)}</li>
                  </ul>
                  {/* The bar shows the share of the cooking time. */}
                  <span className="time" style={{ '--share': `${Math.round((dish.recipe.minutes / longest) * 100)}%` } as CSSProperties}>
                    <b>{dish.recipe.minutes} мин</b>
                  </span>
                </div>
              </li>
            )
          })}
        </ul>
      </section>
    </article>
  )
}
