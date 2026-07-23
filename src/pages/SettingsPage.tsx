// src/pages/SettingsPage.tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Languages, ChevronRight, Check,
  CheckSquare, CloudSun, Newspaper, Sparkles, FileText, TrendingUp, Globe, BookOpen, MapPin,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useLang } from '../context/LangContext'
import { useWidgetSettings } from '../context/WidgetSettingsContext'
import type { WidgetKey } from '../context/WidgetSettingsContext'
import styles from './SettingsPage.module.css'

const WIDGET_META: Record<WidgetKey, { icon: LucideIcon; accentSoft: string }> = {
  todos:         { icon: CheckSquare, accentSoft: 'var(--coral-soft)' },
  weather:       { icon: CloudSun,    accentSoft: 'var(--sky-soft)' },
  news:          { icon: Newspaper,   accentSoft: 'var(--magenta-soft)' },
  newsDigest:    { icon: Sparkles,    accentSoft: 'var(--lavender-soft)' },
  notes:         { icon: FileText,    accentSoft: 'var(--sun-soft)' },
  stocks:        { icon: TrendingUp,  accentSoft: 'var(--tangerine-soft)' },
  bankRates:     { icon: Globe,       accentSoft: 'var(--sage-soft)' },
  wiki:          { icon: BookOpen,    accentSoft: 'var(--sky-soft)' },
  spanishReader: { icon: BookOpen,    accentSoft: 'var(--tangerine-soft)' },
}
const WIDGET_KEYS = Object.keys(WIDGET_META) as WidgetKey[]

function Switch({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`${styles.switch} ${checked ? styles.switchOn : ''}`}
      onClick={onChange}
    >
      <span className={styles.switchThumb} />
    </button>
  )
}

function RowIcon({ icon: Icon, accentSoft }: { icon: LucideIcon; accentSoft: string }) {
  return (
    <span className={styles.rowIcon} style={{ '--row-accent-soft': accentSoft } as React.CSSProperties}>
      <Icon size={16} />
    </span>
  )
}

export default function SettingsPage() {
  const { t } = useTranslation()
  const { lang, toggleLang } = useLang()
  const { widgets, toggle, widgetPrefs, updateWidgetPref } = useWidgetSettings()

  const [location, setLocation] = useState(widgetPrefs.weather?.defaultLocation ?? '')
  const [saved, setSaved] = useState(false)

  async function saveLocation() {
    await updateWidgetPref('weather', { ...widgetPrefs.weather, defaultLocation: location.trim() })
    setSaved(true)
    setTimeout(() => setSaved(false), 1800)
  }

  return (
    <div className={styles.page}>
      <h1 className={styles.pageTitle}>{t('settings.title')}</h1>

      {/* General */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>{t('settings.general')}</div>
        <div className={styles.group}>
          <button className={styles.row} onClick={toggleLang}>
            <RowIcon icon={Languages} accentSoft="var(--lavender-soft)" />
            <span className={styles.rowText}>
              <span className={styles.rowTitle}>{t('settings.language')}</span>
              <span className={styles.rowSub}>{t('settings.languageDesc')}</span>
            </span>
            <span className={styles.rowValue}>{lang === 'he' ? t('settings.hebrew') : t('settings.english')}</span>
            <ChevronRight size={16} className={styles.rowChevron} />
          </button>
        </div>
      </div>

      {/* Widgets */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>{t('settings.widgets')}</div>
        <div className={styles.group}>
          {WIDGET_KEYS.map(key => {
            const meta = WIDGET_META[key]
            return (
              <div className={styles.row} key={key}>
                <RowIcon icon={meta.icon} accentSoft={meta.accentSoft} />
                <span className={styles.rowText}>
                  <span className={styles.rowTitle}>{t(`widgets.${key}`)}</span>
                </span>
                <Switch checked={widgets[key]} onChange={() => toggle(key)} label={t(`widgets.${key}`)} />
              </div>
            )
          })}
        </div>
      </div>

      {/* Weather */}
      <div className={styles.section}>
        <div className={styles.sectionLabel}>{t('settings.weather')}</div>
        <div className={styles.group}>
          <div className={styles.rowStacked}>
            <div className={styles.rowStackedHead}>
              <RowIcon icon={MapPin} accentSoft="var(--tangerine-soft)" />
              <span className={styles.rowText}>
                <span className={styles.rowTitle}>{t('settings.weatherLocation')}</span>
                <span className={styles.rowSub}>{t('settings.weatherLocationDesc')}</span>
              </span>
            </div>
            <div className={styles.locationRow}>
              <input
                className={styles.input}
                value={location}
                onChange={e => setLocation(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveLocation()}
                placeholder={t('settings.weatherLocationPlaceholder')}
              />
              <button className={styles.saveBtn} onClick={saveLocation}>
                {saved ? <Check size={14} /> : t('common.save')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
