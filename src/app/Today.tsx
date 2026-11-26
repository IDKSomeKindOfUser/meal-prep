import { Dices } from 'lucide-react'
import type { Report } from '../planner'
import { blocks } from '../planner/schedule'
import { SLOTS } from '../planner/types'
import { useEffect, useState } from 'react'
import { addDays, dayMonth, dayNumber, dayOfPlan, daysBetween, mealNow, nextMeal, weekday, weekdayShort } from './dates'
import { daysCount, num, rub, SLOT } from './labels'
import { DishField, GoIcon, portionNote, Warnings, WeekTabs } from './parts'
import { cookHash, dishHash } from './route'
import { cookedKey, type SavedPlan } from './storage'
import { transition } from './transition'

interface Props {
  plan: SavedPlan
  report: Report
  today: string
  day: number
  onDay: (day: number) => void
  busy: boolean
  onShuffle: () => void
}

const capital = (s: string) => s[0]!.toUpperCase() + s.slice(1)

function useHour(): number {
  const [hour, setHour] = useState(() => new Date().getHours())
  useEffect(() => {
    const update = () => setHour(new Date().getHours())
    const timer = setInterval(update, 60_000)
    document.addEventListener('visibilitychange', update)
    return () => { clearInterval(timer); document.removeEventListener('visibilitychange', update) }
  }, [])
  return hour
}

// Каскад карточек играет только при первом показе «Сегодня» за сессию, не при смене дня.
let cascaded = false

export function Today({ plan, report, today, day, onDay, busy, onShuffle }: Props) {
  const [cascade] = useState(() => !cascaded)
  useEffect(() => { cascaded = true }, [])
  const { settings, start } = plan
  const date = addDays(start, day)
  const place = dayOfPlan(start, report.days.length, today)
  const week = Math.floor(day / 7)
  const menu = report.days[day]!
  const schedule = blocks(settings.cookTimes, settings.weeks)
  const blockIndex = schedule.findIndex((b) => day >= b.firstDay && day < b.firstDay + b.days)
  const block = schedule[blockIndex]!
  const cookings = report.cookings.filter((c) => Math.floor(c.day / 7) === week)
  const hour = useHour()
  const now = date === today ? mealNow(hour) : null
  const next = date === today ? nextMeal(hour) : null
  return (
    <>
      <header>
        <h1 tabIndex={-1}>{date === today ? `Сегодня, ${weekday(date)}` : `${capital(weekday(date))}, ${dayMonth(date)}`}</h1>
        <p className="sub">{num(menu.kcal)} ккал, белка {num(menu.protein)} г{day === block.cookDay && ', готовим в этот день'}</p>
        {next && (
          <p className="next">
            <span>Следующий приём: {SLOT[next.slot].toLowerCase()} в {next.time}</span>
            <a className="tonal" href={dishHash(blockIndex, next.slot)}>Открыть рецепт<GoIcon /></a>
          </p>
        )}
        {place.state === 'before' && <p className="note">Меню начинается {dayMonth(start)}, через {daysCount(daysBetween(today, start))}.</p>}
        {place.state === 'ended' && <p className="note">Это меню закончилось {dayMonth(addDays(start, report.days.length - 1))}. Соберите новое, оно начнётся с сегодняшнего дня.</p>}
        <WeekTabs weeks={settings.weeks} week={week} onChange={(w) => onDay(w * 7 + (day % 7))} />
        <div className="days" role="group" aria-label="День">
          {Array.from({ length: 7 }, (_, i) => {
            const d = week * 7 + i
            const iso = addDays(start, d)
            return (
              <button key={d} type="button" aria-pressed={d === day} aria-label={`${weekday(iso)}, ${dayMonth(iso)}`}
                aria-current={iso === today ? 'date' : undefined} onClick={() => transition(() => onDay(d))}>
                {weekdayShort(iso)}<b>{dayNumber(iso)}</b>
              </button>
            )
          })}
        </div>
      </header>
      <ul className={cascade ? 'meals cascade' : 'meals'} aria-label="Блюда дня">
        {SLOTS.map((slot, i) => (
          <DishField key={slot} slot={slot} dish={menu.dishes[i]!} href={dishHash(blockIndex, slot)} note={day === block.cookDay ? undefined : portionNote(menu.dishes[i]!, block, day)} big={slot === 'lunch'} now={slot === now} cooked={plan.cooked?.includes(cookedKey(blockIndex, slot))} />
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
                  <span>до {c.minutes} минут<GoIcon /></span>
                </a>
              </li>
            )
          })}
        </ul>
      </section>
      <section className="week-note">
        {report.shortage > 0 && (
          <p className="warn">Не хватает {rub(report.shortage)} до бюджета {rub(settings.budget!)}.{!plan.edited && ' Это самое дешёвое найденное меню.'}</p>
        )}
        <Warnings report={report} edited={plan.edited ?? false} />
      </section>
      <section className="rebuild">
        <p className="hint">Не нравится меню? Ответьте на пару вопросов и соберите новое, прошлое можно будет вернуть.</p>
        <button type="button" className="link shuffle" onClick={onShuffle} disabled={busy} aria-busy={busy}>
          <Dices aria-hidden="true" />{busy ? 'Собираю меню…' : 'Собрать меню заново'}
        </button>
      </section>
    </>
  )
}
