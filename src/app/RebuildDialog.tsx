import { useEffect, useRef, useState } from 'react'
import type { Kind, Meat } from '../planner/prefer'
import { Checks, Choice, options } from './fields'
import { dayMonth, weekdayShort } from './dates'
import { answersFrom, SIMPLE_MINUTES, type Answers } from './questions'

const MEAT: Record<Meat, string> = {
  chicken: 'Курица', turkey: 'Индейка', beef: 'Говядина', pork: 'Свинина', fish: 'Рыба и креветки', none: 'Без мяса',
}
const KIND: Record<Kind, string> = {
  porridge: 'Каши', soup: 'Супы', pasta: 'Паста и лапша', rice: 'С рисом', buckwheat: 'С гречкой',
  potato: 'С картошкой', legumes: 'Чечевица и бобовые', wrap: 'Лаваш и тортильи', bake: 'Запеканки и выпечка',
}
const EFFORT: Record<Answers['effort'], string> = { keep: 'Как сейчас', simple: `Попроще, до ${SIMPLE_MINUTES} минут`, any: 'Можно сложнее' }
const DAIRY: Record<Answers['dairy'], string> = { keep: 'Как сейчас', none: 'Без молочного' }

interface Props {
  /** `banned`: milk is already off in the settings; `impossible`: no breakfast would be left without it. */
  milk: 'ok' | 'banned' | 'impossible'
  /** A budget is set: the cheapest dishes may win over the wishes. */
  budget: boolean
  /** ISO date of the only cooking that changes; `undefined` when the whole menu does. */
  cookDay?: string
  onBuild: (answers: Answers) => void
  onClose: () => void
}

const EMPTY = answersFrom(undefined)
const isEmpty = (a: Answers) => a.meats.length === 0 && a.kinds.length === 0 && a.effort === 'keep' && a.dairy === 'keep'

/** Opens when mounted, every time with nothing chosen. Esc, «Отмена» and a click outside close it without building. */
export function RebuildDialog({ milk, budget, cookDay, onBuild, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const [answers, setAnswers] = useState(EMPTY)
  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])
  const set = <K extends keyof Answers>(key: K) => (value: Answers[K]) => setAnswers((a) => ({ ...a, [key]: value }))

  return (
    <dialog ref={ref} className="product" aria-labelledby="rebuild-title" onClose={onClose}
      onClick={(e) => {
        // A click on the backdrop lands on the dialog itself, but outside its box.
        const r = e.currentTarget.getBoundingClientRect()
        const outside = e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom
        if (e.target === e.currentTarget && outside) e.currentTarget.close()
      }}>
      <form noValidate onSubmit={(e) => {
        e.preventDefault()
        onBuild(answers)
        ref.current?.close()
      }}>
        <h2 id="rebuild-title">Каким будет новое меню?</h2>
        {cookDay && <p className="hint">Поменяются блюда только готовки {weekdayShort(cookDay)}, {dayMonth(cookDay)}. Остальные готовки останутся как есть.</p>}
        <p className="hint">Отмеченное попадётся чаще, остальное тоже может быть. Ничего не отмечать — оставить как есть.</p>
        {budget && <p className="hint">Бюджет задан, поэтому дешёвые блюда важнее пожеланий: отмеченное может и не попасться.</p>}
        <Checks legend="Что из мяса и рыбы хочется" options={options(MEAT)} value={answers.meats} onChange={set('meats')} />
        <Checks legend="Какие блюда хочется" options={options(KIND)} value={answers.kinds} onChange={set('kinds')} />
        <Choice name="effort" legend="Сложность блюд" options={options(EFFORT)} value={answers.effort} onChange={set('effort')} />
        {milk === 'banned' ? <p className="hint">Молочное: уже исключено в настройках.</p>
          : milk === 'impossible' ? <p className="hint">Молочное: без него пока не собрать, во всех завтраках есть молоко.</p>
          : <Choice name="dairy" legend="Молочное" options={options(DAIRY)} value={answers.dairy} onChange={set('dairy')}
              hint="«Без молочного» добавит молоко в аллергены. Вернуть можно в настройках." />}
        <div className="actions">
          <button type="submit" className="go">Собрать меню</button>
          <button type="button" className="textbtn" onClick={() => ref.current?.close()}>Отмена</button>
          {!isEmpty(answers) && <button type="button" className="textbtn" onClick={() => setAnswers(EMPTY)}>Сбросить</button>}
        </div>
      </form>
    </dialog>
  )
}
