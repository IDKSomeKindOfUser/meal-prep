import type { CSSProperties, ReactNode } from 'react'
import { ArrowLeft, ChevronRight, Clock, Drumstick, Flame } from 'lucide-react'
import type { PortionedDish } from '../planner/portions'
import type { Block } from '../planner/schedule'
import { frozenDays } from '../planner/schedule'
import type { Slot } from '../planner/types'
import type { Report } from '../planner'
import { DishPicture } from './DishPicture'
import { num, SLOT } from './labels'
import { swap } from './transition'
import { dishTints, type Tint } from './tints'

export function BackLink({ href, onClick, children }: { href: string; onClick?: (e: import("react").MouseEvent) => void; children: ReactNode }) {
  return <a className="back" href={href} onClick={onClick}><ArrowLeft aria-hidden="true" />{children}</a>
}

export const GoIcon = () => <ChevronRight className="go-icon" aria-hidden="true" />

/** Calories, protein and time as chips of a `.facts` list, each with its own colored icon. */
export function MacroFacts({ kcal, protein, minutes }: { kcal: number; protein: number; minutes: number }) {
  return (
    <>
      <li className="ico kcal"><Flame aria-hidden="true" />{num(kcal)} ккал</li>
      <li className="ico protein"><Drumstick aria-hidden="true" />{num(protein)} г белка</li>
      <li className="ico mins"><Clock aria-hidden="true" />{minutes} мин</li>
    </>
  )
}

/** The extra colors of a dish card; app.css blends them with the meal color. */
export const tintProps = (tints: Tint[]) => tints.length === 0 ? {} : {
  'data-tinted': true,
  style: { '--tint-1': `var(--t-${tints[0]})`, '--tint-2': `var(--t-${tints[1] ?? tints[0]})` } as CSSProperties,
}

export function DishField({ slot, dish, href, note, big, now, cooked }: { slot: Slot; dish: PortionedDish; href: string; note?: string; big?: boolean; now?: boolean; cooked?: boolean }) {
  return (
    <li className={`dish${big ? ' big' : ''}`} data-slot={slot} data-now={now || undefined} {...tintProps(dishTints(dish.recipe))}>
      <div>
        <h2><a href={href}>{dish.recipe.name}<GoIcon /></a></h2>
        <ul className="facts">
          <li>{SLOT[slot]}{now && ' · сейчас'}</li>
          <MacroFacts kcal={dish.kcal} protein={dish.protein} minutes={dish.recipe.minutes} />
          {cooked && <li className="cooked">Приготовлено</li>}
        </ul>
        {note && <p className="from">{note}</p>}
      </div>
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
        <button key={i} type="button" aria-pressed={i === week} aria-label={`Неделя ${i + 1}`} onClick={() => swap(() => onChange(i))}>
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
