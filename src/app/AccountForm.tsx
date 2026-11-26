import { useRef, useState } from 'react'
import type { Cloud } from './cloud'
import { Field } from './fields'

const STATUS: Record<Cloud['status'], string> = {
  idle: '', syncing: 'Сохраняем в облако…', synced: 'Всё сохранено в облаке.',
  error: 'Облако не отвечает. Правки сохранены в этом браузере и отправятся позже.',
  'other-account': 'В этом браузере лежат данные другого аккаунта, поэтому они не отправляются. Выйдите и войдите под прежней почтой.',
}

export function AccountForm({ cloud, unsent }: { cloud: Cloud; unsent: boolean }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)

  async function run(action: () => Promise<string | null>) {
    setBusy(true)
    setError(null)
    const problem = await action()
    setError(problem)
    setBusy(false)
    return problem === null
  }

  if (cloud.email === undefined) return <p>Проверяем вход…</p>
  if (cloud.email !== null) {
    const status = unsent && cloud.status === 'synced' ? STATUS.syncing : STATUS[cloud.status]
    return (
      <>
        <p>Вы вошли как {cloud.email}.</p>
        <p role="status" className={cloud.status === 'other-account' || cloud.status === 'error' ? 'warn' : 'hint'}>{status}</p>
        {cloud.status === 'error' && <button type="button" className="textbtn" onClick={cloud.syncNow}>Отправить сейчас</button>}
        <button type="button" className="textbtn" disabled={busy} onClick={() => run(cloud.signOut)}>Выйти</button>
        <p className="hint">После выхода данные останутся в этом браузере.</p>
        {error && <p className="warn" role="alert">{error}</p>}
      </>
    )
  }
  return (
    <form ref={formRef} noValidate onSubmit={async (e) => {
      e.preventDefault()
      if (!email.trim() || !password) {
        setError('Введите почту и пароль.')
        formRef.current?.querySelector<HTMLInputElement>(email.trim() ? '[type=password]' : '[type=email]')?.focus()
        return
      }
      if (await run(() => cloud.signIn(email.trim(), password))) setPassword('')
    }}>
      <p>Войдите, чтобы меню и рецепты были на всех ваших устройствах. Без входа всё хранится только в этом браузере.</p>
      <Field label="Почта" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Field label="Пароль" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
      {error && <p className="warn" role="alert">{error}</p>}
      <button type="submit" className="textbtn" disabled={busy}>{busy ? 'Входим…' : 'Войти'}</button>
    </form>
  )
}
