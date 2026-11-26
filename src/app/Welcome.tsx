import { recipes } from '../data'
import { SLOTS } from '../planner/types'
import { DishPicture } from './DishPicture'
import { SLOT } from './labels'

const EXAMPLE = {
  breakfast: recipes.find((r) => r.type === 'breakfast')!,
  lunch: recipes.filter((r) => r.type === 'main')[0]!,
  dinner: recipes.filter((r) => r.type === 'main')[1]!,
  snack: recipes.find((r) => r.type === 'snack')!,
}

export function Welcome() {
  return (
    <>
      <header>
        <h1 tabIndex={-1}>Что есть на этой неделе</h1>
        <p className="sub">Укажите норму, ограничения и бюджет. Меню соберётся из блюд, которые можно приготовить заранее.</p>
        <a className="go" href="#settings">Заполнить настройки</a>
        <p className="sub">Пример дня:</p>
      </header>
      <ul className="meals" aria-label="Пример дня">
        {SLOTS.map((slot) => (
          <li key={slot} className={`dish${slot === 'lunch' ? ' big' : ''}`} data-slot={slot}>
            <h3>{EXAMPLE[slot].name}</h3>
            <p>{SLOT[slot]}</p>
            <DishPicture recipe={EXAMPLE[slot]} />
          </li>
        ))}
      </ul>
    </>
  )
}
