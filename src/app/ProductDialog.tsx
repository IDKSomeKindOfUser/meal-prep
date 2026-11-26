import { useEffect, useRef, useState } from 'react'
import { ALLERGENS } from '../data/types'
import { Checks, Choice, Field } from './fields'
import { ALLERGEN } from './labels'
import { EMPTY_PRODUCT, newId, productDraft, readProduct, type OwnProduct, type ProductDraft } from './own'

interface Props {
  /** `null`: a new product. */
  product: OwnProduct | null
  onSave: (product: OwnProduct) => void
  onClose: () => void
}

const ALLERGEN_OPTIONS = ALLERGENS.map((a) => [a, ALLERGEN[a]] as const)

/** Opens when mounted. The focus returns to the opening control by itself. */
export function ProductDialog({ product, onSave, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null)
  const start = product ? productDraft(product) : EMPTY_PRODUCT
  const [draft, setDraft] = useState<ProductDraft>(start)
  const [submitted, setSubmitted] = useState(false)
  useEffect(() => {
    const dialog = ref.current
    if (dialog && !dialog.open) dialog.showModal()
  }, [])

  const read = readProduct(draft, product?.id ?? '')
  const errors = submitted && !read.ok ? read.errors : {}
  const set = <K extends keyof ProductDraft>(key: K) => (value: ProductDraft[K]) => setDraft((d) => ({ ...d, [key]: value }))
  const typed = (key: 'name' | 'kcal' | 'protein' | 'fat' | 'carbs' | 'price' | 'packGrams') => ({
    value: draft[key], error: errors[key], inputMode: (key === 'name' ? 'text' : 'decimal') as 'text' | 'decimal',
    onChange: (e: { target: { value: string } }) => set(key)(e.target.value),
  })
  const mayLeave = () => JSON.stringify(draft) === JSON.stringify(start) || confirm('Закрыть без сохранения? Введённое пропадёт.')

  return (
    <dialog ref={ref} className="product" aria-labelledby="product-title" onClose={onClose}
      onCancel={(e) => { if (!mayLeave()) e.preventDefault() }}>
      <form noValidate onSubmit={(e) => {
        e.preventDefault()
        setSubmitted(true)
        if (read.ok) {
          onSave({ ...read.value, id: product?.id ?? newId() })
          ref.current?.close()
        } else requestAnimationFrame(() => ref.current?.querySelector<HTMLElement>('[aria-invalid]')?.focus())
      }}>
        <h2 id="product-title">{product ? 'Изменить продукт' : 'Новый продукт'}</h2>
        <Field label="Название" {...typed('name')} />
        <fieldset>
          <legend>На 100 г сырого продукта</legend>
          <div className="fields">
            <Field label="Калории" unit="ккал" {...typed('kcal')} />
            <Field label="Белки" unit="г" {...typed('protein')} />
            <Field label="Жиры" unit="г" {...typed('fat')} />
            <Field label="Углеводы" unit="г" {...typed('carbs')} />
          </div>
        </fieldset>
        <Choice name="place" legend="Где покупаете" value={draft.place} error={errors.place} onChange={set('place')}
          options={[['store', 'Магазин'], ['market', 'Рынок']]} />
        <Choice name="buyBy" legend="Как продаётся" value={draft.buyBy} error={errors.buyBy} onChange={set('buyBy')}
          options={[['pack', 'Пачкой'], ['weight', 'На вес']]} />
        <div className="fields">
          <Field label="Цена" unit={draft.buyBy === 'weight' ? '₽ за кг' : '₽ за пачку'} {...typed('price')} />
          {draft.buyBy !== 'weight' && <Field label="Вес пачки" unit="г" {...typed('packGrams')} />}
        </div>
        <Checks name="contains" legend="Аллергены в составе" value={draft.allergens} error={errors.allergens} onChange={set('allergens')} options={ALLERGEN_OPTIONS} />
        <Checks legend="Может содержать следы" value={draft.mayContain} onChange={set('mayContain')} options={ALLERGEN_OPTIONS}
          hint="Проверьте состав на упаковке. Следы считаются так же строго, как сам аллерген." />
        <Checks legend="Если ничего из списка нет" value={draft.noAllergens ? ['none'] : []} onChange={(v) => set('noAllergens')(v.length > 0)}
          options={[['none', 'Аллергенов нет']]} />
        <Choice name="productLactose" legend="Лактоза" value={draft.lactose} error={errors.lactose} onChange={set('lactose')}
          options={[['none', 'Нет'], ['low', 'Немного'], ['yes', 'Есть']]} />
        {submitted && !read.ok && <p className="warn" role="alert">Исправьте отмеченные поля.</p>}
        <button type="submit" className="go">Сохранить продукт</button>
        <button type="button" className="textbtn" onClick={() => { if (mayLeave()) ref.current?.close() }}>Отмена</button>
      </form>
    </dialog>
  )
}
