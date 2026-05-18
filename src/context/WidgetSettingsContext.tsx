import { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

export type WidgetKey = 'todos' | 'weather' | 'news' | 'notes' | 'stocks' | 'newsDigest' | 'bankRates' | 'wiki' | 'spanishReader'
export type ColKey = 'col1' | 'col2' | 'col3'
export type WidgetLayout = Record<ColKey, WidgetKey[]>

type WidgetMap  = Record<WidgetKey, boolean>
type WidgetPrefs = Record<string, Record<string, string>>

const DEFAULTS: WidgetMap = {
  todos: true, weather: true, news: true, notes: true,
  stocks: true, newsDigest: true, bankRates: true, wiki: true, spanishReader: true,
}

export const DEFAULT_LAYOUT: WidgetLayout = {
  col1: ['todos', 'bankRates', 'spanishReader'],
  col2: ['weather', 'newsDigest', 'wiki'],
  col3: ['notes', 'stocks', 'news'],
}

function normalizeLayout(raw: Partial<WidgetLayout>): WidgetLayout {
  const all = new Set(Object.keys(DEFAULTS) as WidgetKey[])
  const seen = new Set<WidgetKey>()
  const out: WidgetLayout = { col1: [], col2: [], col3: [] }

  for (const col of ['col1', 'col2', 'col3'] as ColKey[]) {
    for (const key of raw[col] ?? []) {
      if (all.has(key) && !seen.has(key)) { out[col].push(key); seen.add(key) }
    }
  }
  for (const key of all) {
    if (!seen.has(key)) out.col3.push(key)
  }
  return out
}

interface WidgetSettingsCtx {
  widgets: WidgetMap
  toggle: (key: WidgetKey) => void
  widgetLayout: WidgetLayout
  updateLayout: (layout: WidgetLayout) => void
  widgetPrefs: WidgetPrefs
  prefsLoaded: boolean
  updateWidgetPref: (widgetKey: string, prefs: Record<string, string>) => Promise<void>
}

const Ctx = createContext<WidgetSettingsCtx>({
  widgets: DEFAULTS, toggle: () => {},
  widgetLayout: DEFAULT_LAYOUT, updateLayout: () => {},
  widgetPrefs: {}, prefsLoaded: false, updateWidgetPref: async () => {},
})

export function WidgetSettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [widgets, setWidgets]           = useState<WidgetMap>(DEFAULTS)
  const [widgetLayout, setWidgetLayout] = useState<WidgetLayout>(DEFAULT_LAYOUT)
  const [widgetPrefs, setWidgetPrefs]   = useState<WidgetPrefs>({})
  const [prefsLoaded, setPrefsLoaded]   = useState(false)

  useEffect(() => {
    if (!user) { setPrefsLoaded(true); return }
    supabase
      .from('user_settings')
      .select('widgets, widget_layout, widget_prefs')
      .eq('user_id', user.id)
      .single()
      .then(({ data }) => {
        if (data?.widgets)       setWidgets({ ...DEFAULTS, ...data.widgets })
        if (data?.widget_layout) setWidgetLayout(normalizeLayout(data.widget_layout))
        if (data?.widget_prefs)  setWidgetPrefs(data.widget_prefs as WidgetPrefs)
        setPrefsLoaded(true)
      })
  }, [user])

  async function toggle(key: WidgetKey) {
    const updated = { ...widgets, [key]: !widgets[key] }
    setWidgets(updated)
    if (user) {
      await supabase.from('user_settings')
        .upsert({ user_id: user.id, widgets: updated }, { onConflict: 'user_id' })
    }
  }

  async function updateLayout(layout: WidgetLayout) {
    setWidgetLayout(layout)
    if (user) {
      await supabase.from('user_settings')
        .upsert({ user_id: user.id, widget_layout: layout }, { onConflict: 'user_id' })
    }
  }

  async function updateWidgetPref(widgetKey: string, prefs: Record<string, string>) {
    const updated = { ...widgetPrefs, [widgetKey]: prefs }
    setWidgetPrefs(updated)
    if (user) {
      await supabase.from('user_settings')
        .upsert({ user_id: user.id, widget_prefs: updated }, { onConflict: 'user_id' })
    }
  }

  return (
    <Ctx.Provider value={{ widgets, toggle, widgetLayout, updateLayout, widgetPrefs, prefsLoaded, updateWidgetPref }}>
      {children}
    </Ctx.Provider>
  )
}

export function useWidgetSettings() { return useContext(Ctx) }
