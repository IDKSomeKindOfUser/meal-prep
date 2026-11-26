import type { Report } from '../planner'
import { SLOTS } from '../planner/types'
import { addDays, dayMonth, dayNumber, weekday, weekdayShort } from './dates'
import { daysCount, num, rub } from './labels'
import { DishPicture } from './DishPicture'
import { WeekTabs } from './parts'
import { dishHash } from './route'
import type { SavedPlan } from './storage'

interface Props {
  plan: SavedPlan
  report: Report
  today: string
  day: number
  onDay: (day: number) => void
  onOpenDay: (day: number) => void
}

export function Week({ plan, report, today, day, onDay, onOpenDay }: Props) {
  const { start, settings } = plan
  const week = Math.floor(day / 7)
  const month = settings.weeks > 1
  const first = addDays(start, week * 7)
  const shopping = report.shopping.weeks[week]!
  return (
    <>
      <header>
        <h1 tabIndex={-1}>{month ? 'Меню на 4 недели' : 'Меню на неделю'}</h1>
        <p className="sub">{dayMonth(first)} – {dayMonth(addDays(first, 6))}, чек {rub(shopping.marketCost + shopping.storeCost)}</p>
        <WeekTabs weeks={settings.weeks} week={week} onChange={(w) => onDay(w * 7)} />
      </header>
      <ol className="wk">
        {report.blocks.flatMap(({ block, day: menu }, bi) => (block.week === week ? Array.from({ length: block.days }, (_, i) => {
          const d = block.firstDay + i
          const iso = addDays(start, d)
          const cook = d === block.cookDay
          return (
            <li key={d} className={`wkrow${cook ? ' wkcook' : ''}`} aria-current={iso === today ? 'date' : undefined}>
              <button type="button" className="wkday" aria-label={`Открыть: ${weekday(iso)}, ${dayMonth(iso)}`} onClick={() => onOpenDay(d)}>
                <span>{weekdayShort(iso)}</span><b>{dayNumber(iso)}</b>
                <small>{cook ? <>готовка<span className="wkfor"> на {daysCount(block.days)}</span></> : 'остатки'}</small>
              </button>
              <ul className="wkdishes">
                {SLOTS.map((slot, k) => {
                  const dish = menu.dishes[k]!
                  return (
                    <li key={slot} data-slot={slot}>
                      <a href={dishHash(bi, slot)} aria-label={`${dish.recipe.name}, ${num(dish.kcal)} ккал`}>
                        <DishPicture recipe={dish.recipe} />
                        <span className="wkname" aria-hidden="true">{dish.recipe.name}</span>
                      </a>
                    </li>
                  )
                })}
              </ul>
              <p className="wkkcal">{num(menu.kcal)}<small> ккал</small><small>белка {num(menu.protein)} г</small></p>
            </li>
          )
        }) : []))}
      </ol>
    </>
  )
}
