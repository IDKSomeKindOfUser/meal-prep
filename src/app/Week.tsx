import type { Report } from '../planner'
import { SLOTS } from '../planner/types'
import { addDays, dayMonth, dayNumber, weekday, weekdayShort } from './dates'
import { num, rub } from './labels'
import { DishField, WeekTabs } from './parts'
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
      {report.blocks.filter((b) => b.block.week === week).map(({ block, day: menu }) => (
        <section className="block" key={block.firstDay} aria-labelledby={`block-${block.firstDay}`}>
          <div className="blockhead">
            <h2 id={`block-${block.firstDay}`}>
              {weekday(addDays(start, block.firstDay))}{block.days > 1 && ` – ${weekday(addDays(start, block.firstDay + block.days - 1))}`}
            </h2>
            <p className="sub">
              {num(menu.kcal)} ккал в день, белка {num(menu.protein)} г. Готовка: {weekday(addDays(start, block.cookDay))}
            </p>
            <div className="days">
              {Array.from({ length: block.days }, (_, i) => {
                const d = block.firstDay + i
                const iso = addDays(start, d)
                return (
                  <button key={d} type="button" aria-label={`Открыть: ${weekday(iso)}, ${dayMonth(iso)}`}
                    aria-current={iso === today ? 'date' : undefined} onClick={() => onOpenDay(d)}>
                    {weekdayShort(iso)}<b>{dayNumber(iso)}</b>
                  </button>
                )
              })}
            </div>
          </div>
          <ul className="meals compact">
            {SLOTS.map((slot, i) => <DishField key={slot} slot={slot} dish={menu.dishes[i]!} href={dishHash(report.blocks.findIndex((b) => b.block === block), slot)} />)}
          </ul>
        </section>
      ))}
    </>
  )
}
