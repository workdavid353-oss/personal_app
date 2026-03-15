import { Eye, EyeOff } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useWidgetSettings } from '../../context/WidgetSettingsContext'
import type { WidgetKey } from '../../context/WidgetSettingsContext'
import styles from './WidgetSettings.module.css'

const WIDGETS: WidgetKey[] = ['todos', 'weather', 'news', 'newsDigest', 'notes', 'stocks']

export function WidgetSettings() {
  const { widgets, toggle } = useWidgetSettings()
  const { t } = useTranslation()

  return (
    <div className={styles.container}>
      <div className={styles.title}>{t('widgets.title')}</div>
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
    </div>
  )
}
