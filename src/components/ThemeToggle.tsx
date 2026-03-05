import { Sun, Moon } from 'lucide-react'
import { useTheme } from '../context/ThemeContext'
import styles from './ThemeToggle.module.css'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()

  return (
    <button
      onClick={toggle}
      className={styles.toggle}
      title={theme === 'dark' ? 'מצב יום' : 'מצב לילה'}
      aria-label="החלף תמה"
    >
      <span className={styles.icon}>
        {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
      </span>
    </button>
  )
}