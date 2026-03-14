import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import { useTranslation } from 'react-i18next'
import styles from './ThemeToggle.module.css'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  const { t } = useTranslation()

  return (
    <button
      onClick={toggle}
      className={styles.toggle}
      title={theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
      aria-label={t('theme.toggle')}
    >
      <span className={styles.icon}>
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </span>
    </button>
  )
}