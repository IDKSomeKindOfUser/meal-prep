import type { ReactNode } from 'react'
import type { PortionedDish } from '../planner/portions'
import type { Block } from '../planner/schedule'
import { frozenDays } from '../planner/schedule'
import type { Slot } from '../planner/types'
import type { Report } from '../planner'
import { DishPicture } from './DishPicture'
import { num, SLOT } from './labels'

export function DishField({ slot, dish, href, note, big }: { slot: Slot; dish: PortionedDish; href: string; note?: string; big?: boolean }) {
  return (
    <li className={`dish${big ? ' big' : ''}`} data-slot={slot}>
      <h3><a href={href}>{dish.recipe.name}</a></h3>
      <p>{[SLOT[slot], `${num(dish.kcal)} ккал`, note].filter(Boolean).join(', ')}</p>
      <DishPicture recipe={dish.recipe} />
    </li>
  )
}

/** Where the portion of this day comes from. */
export function portionNote(dish: PortionedDish, block: Block, day: number): string {
  if (day === block.cookDay) return 'готовим в этот день'
  return frozenDays(dish.recipe, block).includes(day) ? 'из морозилки' : 'из холодильника'
}

export function WeekTabs({ weeks, week, onChange }: { weeks: number; week: number; onChange: (week: number) => void }) {
  if (weeks === 1) return null
  return (
    <div className="tabs" role="group" aria-label="Неделя">
      {Array.from({ length: weeks }, (_, i) => (
        <button key={i} type="button" aria-pressed={i === week} onClick={() => onChange(i)}>
          <span className="wide">Неделя</span><span className="short">Нед.</span> {i + 1}
        </button>
      ))}
    </div>
  )
}

export function Warnings({ report, edited, children }: { report: Report; edited: boolean; children?: ReactNode }) {
  return (
    <>
      {report.warnings.includes('kcal') && (
        <p className="note">В части дней калории отличаются от нормы больше чем на 5%{edited ? '' : ': точнее при этих ограничениях не вышло'}.</p>
      )}
      {report.warnings.includes('protein') && (
        <p className="note">В части дней белка меньше 90% цели{edited ? '' : ': больше при этих ограничениях не вышло'}.</p>
      )}
      {children}
    </>
  )
}
