import { useState, useEffect } from 'react'
import styles from './Clock.module.css'

export function Clock() {
  const [time, setTime] = useState(new Date())

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])

  const hh = time.getHours().toString().padStart(2, '0')
  const mm = time.getMinutes().toString().padStart(2, '0')
  const ss = time.getSeconds().toString().padStart(2, '0')

const dateStr = time.toLocaleDateString('he-IL', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
})

const dateStrEn = time.toLocaleDateString('en-US', {
  weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
})

  return (
    <div className={styles.clock}>
      <div className={styles.time}>
        <span>{hh}</span>
        <span className={styles.colon}>:</span>
        <span>{mm}</span>
        <span className={styles.seconds}>{ss}</span>
      </div><span></span>
      <div className={styles.dates}>
          <div className={styles.date}>{dateStr}</div>
          <div className={styles.date}>{dateStrEn}</div>
    </div>
    </div>
  )
}
