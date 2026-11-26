import type { CSSProperties } from 'react'
import { addDays, weekday, weekdayShort } from './dates'
import { num } from './labels'

interface Props {
  start: string
  /** Calories of each day of the week, in order. */
  days: number[]
  firstDay: number
  goal: number
  day: number
  onDay: (day: number) => void
}

/** Calories by day as thin bars with the daily goal as a dashed line. Each bar picks its day. */
export function DayChart({ start, days, firstDay, goal, day, onDay }: Props) {
  const top = Math.max(goal * 1.15, ...days)
  return (
    <div className="daychart" style={{ '--goal': goal / top } as CSSProperties}>
      <ol aria-label="Калории по дням недели">
        {days.map((kcal, i) => {
          const d = firstDay + i
          const iso = addDays(start, d)
          return (
            <li key={d}>
              <button type="button" aria-pressed={d === day} onClick={() => onDay(d)}
                aria-label={`${weekday(iso)}: ${num(kcal)} ккал`} data-tip={`${num(kcal)} ккал`}>
                <i style={{ blockSize: `${(kcal / top) * 100}%` }} />
                <span aria-hidden="true">{weekdayShort(iso)}</span>
              </button>
            </li>
          )
        })}
      </ol>
      <p className="hint">Пунктир — норма {num(goal)} ккал.</p>
    </div>
  )
}
