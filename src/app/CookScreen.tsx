import { BackLink, GoIcon } from './parts'
import type { CSSProperties } from 'react'
import { frozenDays } from '../planner/schedule'
import { DishPicture } from './DishPicture'
import type { Report } from '../planner'
import { SLOTS } from '../planner/types'
import { cookOrder } from './cookOrder'
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
      SLOTS.map((slot, i) => {
        const dish = menu.dishes[i]!
        return { block, index, slot, dish, minutes: dish.recipe.minutes, tools: dish.recipe.tools }
      }))
  const order = cookOrder(rows)
  const tools = [...new Set(order.steps.map((s) => s.tool))]
  const longest =Math.max(1, ...rows.map((r) => r.minutes))
  const portions = rows.reduce((sum, r) => sum + r.block.days, 0)
  const frozen = rows.reduce((sum, r) => sum + frozenDays(r.dish.recipe, r.block).length, 0)

  const row = ({ block, index, slot, dish }: (typeof rows)[number], when?: string) => {
    const frozen = frozenDays(dish.recipe, block)
    const days = `${weekdayShort(addDays(plan.start, block.firstDay))}${block.days > 1 ? ` – ${weekdayShort(addDays(plan.start, block.firstDay + block.days - 1))}` : ''}`
    return (
      <li key={`${index}-${slot}`} data-slot={slot}>
        <span className="thumb"><DishPicture recipe={dish.recipe} /></span>
        <div>
          {when && <p className="when">{when}</p>}
          <a href={dishHash(index, slot)}>{dish.recipe.name}<GoIcon /></a>
          <ul className="facts">
            <li>{SLOT[slot]}, {days}</li>
            <li>{count(block.days, 'порция', 'порции', 'порций')}</li>
            {frozen.length > 0 && <li>в морозилку {frozen.length} из {block.days}</li>}
            <li>хранится {daysCount(dish.recipe.keepDays)}</li>
          </ul>
          {/* The bar shows the share of the cooking time. */}
          <span className="time" style={{ '--share': `${Math.round((dish.recipe.minutes / longest) * 100)}%` } as CSSProperties}>
            <b>{dish.recipe.minutes} мин</b>
          </span>
        </div>
      </li>
    )
  }

  return (
    <article className="recipe">
      <div className="top"><BackLink href="#today">Назад к меню дня</BackLink></div>
      <header>
        <h1 tabIndex={-1}>Готовка: {weekday(date)}, {dayMonth(date)}</h1>
        <p className="sub">Примерно {order.minutes} минут{tools.length > 1 && `, если ${tools.slice(0, -1).join(', ')} и ${tools.at(-1)} работают одновременно`}.</p>
      </header>
      {order.steps.length > 0 && (
        <section>
          <h2>По порядку</h2>
          <p>Самое долгое ставьте первым. Следующее блюдо — когда освободится прибор.</p>
          <ol className="cook">
            {order.steps.map((s) => row(s.item, `${s.tool[0]!.toUpperCase()}${s.tool.slice(1)}, ${s.start ? `через ${s.start} мин` : 'сразу'}`))}
          </ol>
        </section>
      )}
      {order.meanwhile.length > 0 && (
        <section>
          <h2>{order.steps.length > 0 ? 'Пока всё готовится' : 'Без готовки'}</h2>
          <ul className="cook">{order.meanwhile.map((r) => row(r))}</ul>
        </section>
      )}
      <section>
        <h2>В конце</h2>
        <p>
          Остудите блюда и разложите по {count(portions, 'контейнеру', 'контейнерам', 'контейнерам')}.
          {frozen > 0 && ` ${count(frozen, 'контейнер', 'контейнера', 'контейнеров')} уберите в морозилку, остальное в холодильник.`}
        </p>
      </section>
    </article>
  )
}
