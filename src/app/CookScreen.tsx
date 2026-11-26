import { frozenDays } from '../planner/schedule'
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
  return (
    <article className="recipe">
      <div className="top"><a className="back" href="#today">Назад к меню дня</a></div>
      <header>
        <h1 tabIndex={-1}>Готовка: {weekday(date)}, {dayMonth(date)}</h1>
        <p className="sub">Всего до {cooking?.minutes ?? 0} минут, если делать блюда по очереди. Что-то можно готовить одновременно.</p>
      </header>
      <section>
        <ul className="amounts cook">
          {rows.map(({ block, index, slot, dish }) => {
            const frozen = frozenDays(dish.recipe, block)
            const days = `${weekdayShort(addDays(plan.start, block.firstDay))}${block.days > 1 ? ` – ${weekdayShort(addDays(plan.start, block.firstDay + block.days - 1))}` : ''}`
            return (
              <li key={`${index}-${slot}`}>
                <span>
                  <a href={dishHash(index, slot)}>{dish.recipe.name}</a>
                  <span className="hint">
                    {SLOT[slot]}, {days}: {count(block.days, 'порция', 'порции', 'порций')}
                    {frozen.length > 0 ? `, в морозилку ${frozen.length} из ${block.days}` : ''}
                    , хранится {daysCount(dish.recipe.keepDays)}
                  </span>
                </span>
                <b>{dish.recipe.minutes} мин</b>
              </li>
            )
          })}
        </ul>
      </section>
    </article>
  )
}
