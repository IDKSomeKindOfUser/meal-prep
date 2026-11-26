import type { Report } from '../planner'
import { blocks } from '../planner/schedule'
import { SLOTS } from '../planner/types'
import { addDays, dayMonth, dayNumber, dayOfPlan, daysBetween, weekday, weekdayShort } from './dates'
import { daysCount, num, rub } from './labels'
import { DishField, portionNote, Warnings, WeekTabs } from './parts'
import { cookHash, dishHash } from './route'
import type { SavedPlan } from './storage'

interface Props {
  plan: SavedPlan
  report: Report
  today: string
  day: number
  onDay: (day: number) => void
  busy: boolean
  onRebuild: () => void
}

const capital = (s: string) => s[0]!.toUpperCase() + s.slice(1)

export function Today({ plan, report, today, day, onDay, busy, onRebuild }: Props) {
  const { settings, start } = plan
  const date = addDays(start, day)
  const place = dayOfPlan(start, report.days.length, today)
  const week = Math.floor(day / 7)
  const menu = report.days[day]!
  const schedule = blocks(settings.cookTimes, settings.weeks)
  const blockIndex = schedule.findIndex((b) => day >= b.firstDay && day < b.firstDay + b.days)
  const block = schedule[blockIndex]!
  const shopping = report.shopping.weeks[week]!
  const month = settings.weeks > 1
  const cookings = report.cookings.filter((c) => Math.floor(c.day / 7) === week)
  return (
    <>
      <header>
        <h1 tabIndex={-1}>{date === today ? `Сегодня, ${weekday(date)}` : `${capital(weekday(date))}, ${dayMonth(date)}`}</h1>
        <p className="sub">{num(menu.kcal)} ккал, белка {num(menu.protein)} г</p>
        {place.state === 'before' && <p className="note">Меню начинается {dayMonth(start)}, через {daysCount(daysBetween(today, start))}.</p>}
        {place.state === 'ended' && <p className="note">Это меню закончилось {dayMonth(addDays(start, report.days.length - 1))}. Соберите новое, оно начнётся с сегодняшнего дня.</p>}
        <WeekTabs weeks={settings.weeks} week={week} onChange={(w) => onDay(w * 7 + (day % 7))} />
        <div className="days" role="group" aria-label="День">
          {Array.from({ length: 7 }, (_, i) => {
            const d = week * 7 + i
            const iso = addDays(start, d)
            return (
              <button key={d} type="button" aria-pressed={d === day} aria-label={`${weekday(iso)}, ${dayMonth(iso)}`}
                aria-current={iso === today ? 'date' : undefined} onClick={() => onDay(d)}>
                {weekdayShort(iso)}<b>{dayNumber(iso)}</b>
              </button>
            )
          })}
        </div>
      </header>
      <ul className="meals" aria-label="Блюда дня">
        {SLOTS.map((slot, i) => (
          <DishField key={slot} slot={slot} dish={menu.dishes[i]!} href={dishHash(blockIndex, slot)} note={portionNote(menu.dishes[i]!, block, day)} big={slot === 'lunch'} />
        ))}
      </ul>
      <section>
        <h2>Готовка</h2>
        <ul className="cookings">
          {cookings.map((c) => {
            const iso = addDays(start, c.day)
            const covered = new Set(c.dishes.flatMap((d) => d.days)).size
            return (
              <li key={c.day} data-now={iso === today || undefined}>
                <a href={cookHash(c.day)}>
                  <b>{iso === today ? 'Сегодня' : capital(weekdayShort(iso))}, на {daysCount(covered)}</b>
                  <span>до {c.minutes} минут</span>
                </a>
              </li>
            )
          })}
        </ul>
      </section>
      <section>
        <div className="sum">
          <h2>{month ? `Чек недели ${week + 1}` : 'Чек недели'}</h2>
          <b>{rub(shopping.marketCost + shopping.storeCost)}</b>
        </div>
        <p>Рынок {rub(shopping.marketCost)}, магазин {rub(shopping.storeCost)}</p>
        {month && <p>За 4 недели {rub(report.shopping.total)}</p>}
        {report.shortage > 0 && (
          <p className="warn">Не хватает {rub(report.shortage)} до бюджета {rub(settings.budget!)}.{!plan.edited && ' Это самое дешёвое найденное меню.'}</p>
        )}
        <Warnings report={report} edited={plan.edited ?? false} />
        <button type="button" className="go" disabled={busy} onClick={onRebuild}>{busy ? 'Собираем…' : 'Собрать заново'}</button>
      </section>
    </>
  )
}
