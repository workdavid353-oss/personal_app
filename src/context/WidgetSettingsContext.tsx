import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

export type WidgetKey = 'todos' | 'weather' | 'news' | 'notes' | 'stocks' | 'newsDigest' | 'bankRates'

type WidgetMap = Record<WidgetKey, boolean>

const DEFAULTS: WidgetMap = {
  todos: true,
  weather: true,
  news: true,
  notes: true,
  stocks: true,
  newsDigest: true,
  bankRates: true,
}

interface WidgetSettingsCtx {
  widgets: WidgetMap
  toggle: (key: WidgetKey) => void
}

const Ctx = createContext<WidgetSettingsCtx>({ widgets: DEFAULTS, toggle: () => {} })

export function WidgetSettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [widgets, setWidgets] = useState<WidgetMap>(DEFAULTS)

  useEffect(() => {
    if (!user) return
    supabase
      .from('user_settings')
      .select('widgets')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.widgets) setWidgets({ ...DEFAULTS, ...data.widgets })
      })
  }, [user])

  async function toggle(key: WidgetKey) {
    const updated = { ...widgets, [key]: !widgets[key] }
    setWidgets(updated)
    if (user) {
      await supabase
        .from('user_settings')
        .upsert({ user_id: user.id, widgets: updated }, { onConflict: 'user_id' })
    }
  }

  return <Ctx.Provider value={{ widgets, toggle }}>{children}</Ctx.Provider>
}

export function useWidgetSettings() {
  return useContext(Ctx)
}
