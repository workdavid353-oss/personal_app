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

const DEFAULT_COLLAPSED: Record<WidgetKey, boolean> = {
  todos: false, weather: false, news: false, notes: false,
  stocks: false, newsDigest: false, bankRates: false, wiki: false, spanishReader: false,
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
  widgetCollapsed: Record<WidgetKey, boolean>
  toggleCollapse: (key: WidgetKey) => Promise<void>
}

const Ctx = createContext<WidgetSettingsCtx>({
  widgets: DEFAULTS, toggle: () => {},
  widgetLayout: DEFAULT_LAYOUT, updateLayout: () => {},
  widgetPrefs: {}, prefsLoaded: false, updateWidgetPref: async () => {},
  widgetCollapsed: DEFAULT_COLLAPSED, toggleCollapse: async () => {},
})

export function WidgetSettingsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [widgets, setWidgets]               = useState<WidgetMap>(DEFAULTS)
  const [widgetLayout, setWidgetLayout]     = useState<WidgetLayout>(DEFAULT_LAYOUT)
  const [widgetPrefs, setWidgetPrefs]       = useState<WidgetPrefs>({})
  const [prefsLoaded, setPrefsLoaded]       = useState(false)
  const [widgetCollapsed, setWidgetCollapsed] = useState<Record<WidgetKey, boolean>>(DEFAULT_COLLAPSED)

  useEffect(() => {
    if (!user) { setPrefsLoaded(true); return }
    const uid = user.id

    async function load() {
      try {
        const { data, error } = await supabase
          .from('user_settings')
          .select('*')
          .eq('user_id', uid)
          .maybeSingle()

        if (error) {
          console.error('Failed to load widget settings:', error.message)
        } else {
          if (data?.widgets)       setWidgets({ ...DEFAULTS, ...data.widgets })
          if (data?.widget_layout) setWidgetLayout(normalizeLayout(data.widget_layout))
          if (data?.widget_prefs) {
            const prefs = data.widget_prefs as WidgetPrefs
            setWidgetPrefs(prefs)
            if (prefs._collapsed) {
              const parsed: Partial<Record<WidgetKey, boolean>> = {}
              for (const [k, v] of Object.entries(prefs._collapsed)) {
                parsed[k as WidgetKey] = v === 'true'
              }
              setWidgetCollapsed({ ...DEFAULT_COLLAPSED, ...parsed })
            }
          }
        }
      } catch {
        // network failure — proceed with defaults
      } finally {
        setPrefsLoaded(true)
      }
    }

    load()
  }, [user])

  async function toggle(key: WidgetKey) {
    const previous = widgets
    const updated = { ...widgets, [key]: !widgets[key] }
    setWidgets(updated)
    if (user) {
      const { error } = await supabase.from('user_settings')
        .upsert({ user_id: user.id, widgets: updated }, { onConflict: 'user_id' })
      if (error) { console.error('Failed to save widget visibility:', error.message); setWidgets(previous) }
    }
  }

  async function updateLayout(layout: WidgetLayout) {
    const previous = widgetLayout
    setWidgetLayout(layout)
    if (user) {
      const { error } = await supabase.from('user_settings')
        .upsert({ user_id: user.id, widget_layout: layout }, { onConflict: 'user_id' })
      if (error) { console.error('Failed to save widget layout:', error.message); setWidgetLayout(previous) }
    }
  }

  async function updateWidgetPref(widgetKey: string, prefs: Record<string, string>) {
    const previous = widgetPrefs
    const updated = { ...widgetPrefs, [widgetKey]: prefs }
    setWidgetPrefs(updated)
    if (user) {
      const { error } = await supabase.from('user_settings')
        .upsert({ user_id: user.id, widget_prefs: updated }, { onConflict: 'user_id' })
      if (error) { console.error('Failed to save widget prefs:', error.message); setWidgetPrefs(previous) }
    }
  }

  async function toggleCollapse(key: WidgetKey) {
    const previousCollapsed = widgetCollapsed
    const previousPrefs = widgetPrefs
    const updated = { ...widgetCollapsed, [key]: !widgetCollapsed[key] }
    setWidgetCollapsed(updated)
    if (user) {
      const collapsedStrings: Record<string, string> = {}
      for (const [k, v] of Object.entries(updated)) collapsedStrings[k] = String(v)
      const updatedPrefs = { ...widgetPrefs, _collapsed: collapsedStrings }
      setWidgetPrefs(updatedPrefs)
      const { error } = await supabase.from('user_settings')
        .upsert({ user_id: user.id, widget_prefs: updatedPrefs }, { onConflict: 'user_id' })
      if (error) {
        console.error('Failed to save widget collapse state:', error.message)
        setWidgetCollapsed(previousCollapsed)
        setWidgetPrefs(previousPrefs)
      }
    }
  }

  return (
    <Ctx.Provider value={{ widgets, toggle, widgetLayout, updateLayout, widgetPrefs, prefsLoaded, updateWidgetPref, widgetCollapsed, toggleCollapse }}>
      {children}
    </Ctx.Provider>
  )
}

export function useWidgetSettings() { return useContext(Ctx) }
