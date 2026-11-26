import type { SupabaseClient } from '@supabase/supabase-js'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { SavedState } from './storage'
import { adopt, claim, outgoing, pending, type Row } from './sync'

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

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error' | 'other-account'
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
    getClient().then((c) => {
      if (gone) return
      const { data } = c.auth.onAuthStateChange((_, session) => {
        setUser((u) => {
          if (!session) return null
          return u?.id === session.user.id ? u : { id: session.user.id, email: session.user.email ?? '' }
        })
      })
      stop = () => data.subscription.unsubscribe()
    }, () => { if (!gone) setUser(null) })
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
      const { data, error } = await c.rpc('sync_entries', { changes: sent }).abortSignal(AbortSignal.timeout(20_000))
      if (error) throw error
      // Signed out or changed the account while waiting.
      if (active.current !== id) return
      setState((s) => { const mine = claim(s, id); return mine ? adopt(mine, sent, data as Row[]) : s })
      setStatus('synced')
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
        return error.status === 429 ? 'Слишком много попыток. Подождите несколько минут.' : NO_CONNECTION
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
