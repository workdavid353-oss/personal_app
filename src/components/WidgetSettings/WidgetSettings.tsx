import { useState } from 'react'
import { Eye, EyeOff, ChevronDown } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useWidgetSettings } from '../../context/WidgetSettingsContext'
import type { WidgetKey } from '../../context/WidgetSettingsContext'
import styles from './WidgetSettings.module.css'

const WIDGETS: WidgetKey[] = ['todos', 'weather', 'news', 'newsDigest', 'notes', 'stocks', 'bankRates']

export function WidgetSettings() {
  const { widgets, toggle } = useWidgetSettings()
  const { t } = useTranslation()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <div className={styles.container}>
      <button className={styles.titleRow} onClick={() => setCollapsed(c => !c)}>
        <span className={styles.title}>{t('widgets.title')}</span>
        <ChevronDown size={12} className={`${styles.chevron} ${collapsed ? styles.chevronCollapsed : ''}`} />
      </button>
      {!collapsed && (
        <div className={styles.list}>
          {WIDGETS.map(key => (
            <div key={key} className={styles.row}>
              <span className={`${styles.name} ${!widgets[key] ? styles.inactive : ''}`}>
                {t(`widgets.${key}`)}
              </span>
              <button
                className={`${styles.btn} ${!widgets[key] ? styles.btnOff : ''}`}
                onClick={() => toggle(key)}
                title={widgets[key] ? t('common.hide') : t('common.show')}
              >
                {widgets[key] ? <Eye size={13} /> : <EyeOff size={13} />}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
