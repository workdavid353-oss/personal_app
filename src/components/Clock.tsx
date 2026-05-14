import { useState, useEffect } from 'react'
import { useLang } from '../context/LangContext'
import styles from './Clock.module.css'

export function Clock() {
  const [now, setNow] = useState(new Date())
  const { lang } = useLang()

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')

  const dateStr = now.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })

  return (
    <div className={styles.root}>
      <div className={styles.time}>
        {hh}:{mm}
        <span className={styles.seconds}>:{ss}</span>
      </div>
      <div className={styles.date}>{dateStr}</div>
    </div>
  )
}
