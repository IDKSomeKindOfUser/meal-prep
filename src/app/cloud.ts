import type { SupabaseClient } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { SavedState } from './storage'
import { adopt, claim, outgoing, pending, tooBig, type Row } from './sync'

const { VITE_SUPABASE_URL: url, VITE_SUPABASE_KEY: key } = import.meta.env
/** Without the keys the app works with this browser only. */
export const cloudReady = Boolean(url && key)

let client: Promise<SupabaseClient> | undefined
const getClient = () => {
  client ??= import('@supabase/supabase-js').then(({ createClient }) => createClient(url, key, {
    // The address after # belongs to the screens of the app.
    auth: { detectSessionInUrl: false },
  }))
  client.catch(() => { client = undefined })
  return client
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'too-big' | 'error' | 'other-account'
export interface Cloud {
  /** `undefined` until known. */
  email: string | null | undefined
  status: SyncStatus
  /** Returns what to tell the user when it did not work. */
  signIn: (email: string, password: string) => Promise<string | null>
  signOut: () => Promise<string | null>
  syncNow: () => void
}

const NO_CONNECTION = 'Облако не отвечает. Проверьте сеть и попробуйте ещё раз.'
/** After the last edit. */
const DELAY = 1500
const POLL = 60_000

export function useCloud(state: SavedState, setState: (change: (s: SavedState) => SavedState) => void): Cloud {
  const [user, setUser] = useState<{ id: string; email: string } | null | undefined>(undefined)
  const [status, setStatus] = useState<SyncStatus>('idle')
  const latest = useRef(state)
  latest.current = state
  const running = useRef(false)
  const again = useRef(false)
  const active = useRef<string | null>(null)
  const userId = user?.id ?? null
  active.current = userId

  useEffect(() => {
    if (!cloudReady) return
    let stop = () => {}
    let gone = false
    const listen = () => getClient().then((c) => {
      if (gone) return
      const { data } = c.auth.onAuthStateChange((_, session) => {
        setUser((u) => {
          if (!session) return null
          return u?.id === session.user.id ? u : { id: session.user.id, email: session.user.email ?? '' }
        })
      })
      stop = () => data.subscription.unsubscribe()
    }, () => {
      if (gone) return
      setUser(null)
      // The code of the cloud did not load: try again when the network is back.
      addEventListener('online', listen, { once: true })
      stop = () => removeEventListener('online', listen)
    })
    void listen()
    return () => { gone = true; stop() }
  }, [])

  const syncNow = useCallback(async () => {
    const id = active.current
    if (!id) return
    if (running.current) { again.current = true; return }
    running.current = true
    setStatus('syncing')
    try {
      const claimed = claim(latest.current, id)
      if (!claimed) { setStatus('other-account'); return }
      const sent = outgoing(claimed)
      const c = await getClient()
      const { data, error } = await c.rpc('sync_entries', { changes: sent, since: claimed.sync?.seen ?? 0 }).abortSignal(AbortSignal.timeout(20_000))
      if (error) throw error
      // Signed out or changed the account while waiting.
      if (active.current !== id) return
      const { rows, seen } = data as { rows: Row[]; seen: number }
      setState((s) => { const mine = claim(s, id); return mine ? adopt(mine, sent, rows, seen) : s })
      setStatus(tooBig(claimed).length > 0 ? 'too-big' : 'synced')
    } catch {
      setStatus('error')
    } finally {
      running.current = false
      if (again.current) { again.current = false; setTimeout(() => void syncNow(), DELAY) }
    }
  }, [setState])

  useEffect(() => {
    if (!userId) { setStatus('idle'); return }
    void syncNow()
    const visible = () => { if (document.visibilityState === 'visible') void syncNow() }
    const timer = setInterval(visible, POLL)
    addEventListener('online', visible)
    document.addEventListener('visibilitychange', visible)
    return () => { clearInterval(timer); removeEventListener('online', visible); document.removeEventListener('visibilitychange', visible) }
  }, [userId, syncNow])

  const dirty = pending(state)
  useEffect(() => {
    if (!userId || !dirty) return
    const timer = setTimeout(() => void syncNow(), DELAY)
    return () => clearTimeout(timer)
  }, [userId, dirty, state.sync, syncNow])

  return {
    email: cloudReady ? user === undefined ? undefined : user?.email ?? null : null,
    status,
    syncNow: () => void syncNow(),
    async signIn(email, password) {
      try {
        const { error } = await (await getClient()).auth.signInWithPassword({ email, password })
        if (!error) return null
        if (error.code === 'invalid_credentials') return 'Почта или пароль не подходят.'
        if (error.code === 'email_not_confirmed') return 'Почта не подтверждена. Откройте письмо со ссылкой и подтвердите её.'
        if (error.status === 429) return 'Слишком много попыток. Подождите несколько минут.'
        // The cloud answered, so the network is fine.
        return error.status && error.status < 500 ? 'Войти не получилось. Если ошибка повторяется, напишите владельцу сайта.' : NO_CONNECTION
      } catch {
        return NO_CONNECTION
      }
    },
    async signOut() {
      try {
        const { error } = await (await getClient()).auth.signOut({ scope: 'local' })
        return error ? 'Выйти не получилось. Проверьте сеть и попробуйте ещё раз.' : null
      } catch {
        return NO_CONNECTION
      }
    },
  }
}
