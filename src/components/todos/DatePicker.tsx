import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from 'lucide-react'
import styles from './DatePicker.module.css'

interface DatePickerProps {
  value: string // 'YYYY-MM-DD' or ''
  onChange: (value: string) => void
  placeholder?: string
}

const PANEL_WIDTH = 240

function toDateStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function parseDateStr(s: string): Date | null {
  if (!s) return null
  const [y, m, d] = s.split('-').map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

function isSameDay(a: Date, b: Date | null): boolean {
  return !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export default function DatePicker({ value, onChange, placeholder }: DatePickerProps) {
  const { t, i18n } = useTranslation()
  const isRtl = i18n.language === 'he'
  const locale = isRtl ? 'he-IL' : 'en-US'
  const selected = parseDateStr(value)
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState(() => selected ?? new Date())
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  function reposition() {
    const rect = triggerRef.current?.getBoundingClientRect()
    if (!rect) return
    let left = isRtl ? rect.right - PANEL_WIDTH : rect.left
    left = Math.min(Math.max(left, 8), window.innerWidth - PANEL_WIDTH - 8)
    setCoords({ top: rect.bottom + 6, left })
  }

  useLayoutEffect(() => {
    if (!open) return
    reposition()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  useEffect(() => {
    if (!open) return
    setViewDate(selected ?? new Date())

    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }
    function handleReposition() { reposition() }

    document.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('scroll', handleReposition, true)
    window.addEventListener('resize', handleReposition)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('scroll', handleReposition, true)
      window.removeEventListener('resize', handleReposition)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const monthLabel = viewDate.toLocaleDateString(locale, { month: 'long', year: 'numeric' })

  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Date(2024, 0, 7 + i).toLocaleDateString(locale, { weekday: 'narrow' })
  )

  const firstOfMonth = new Date(year, month, 1)
  const startWeekday = firstOfMonth.getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrevMonth = new Date(year, month, 0).getDate()

  const cells: { date: Date; inMonth: boolean }[] = []
  for (let i = 0; i < startWeekday; i++) {
    cells.push({ date: new Date(year, month - 1, daysInPrevMonth - startWeekday + 1 + i), inMonth: false })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ date: new Date(year, month, d), inMonth: true })
  }
  let nextDay = 1
  while (cells.length < 42) {
    cells.push({ date: new Date(year, month + 1, nextDay), inMonth: false })
    nextDay++
  }

  const today = new Date()

  function selectDay(d: Date) {
    onChange(toDateStr(d))
    setOpen(false)
  }

  function shiftMonth(delta: number) {
    setViewDate(new Date(year, month + delta, 1))
  }

  return (
    <>
      <button type="button" ref={triggerRef} className={styles.trigger} onClick={() => setOpen(o => !o)}>
        <CalendarIcon size={14} className={styles.triggerIcon} />
        <span className={selected ? styles.triggerValue : styles.triggerPlaceholder}>
          {selected
            ? selected.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
            : (placeholder ?? t('todos.selectDate'))}
        </span>
        {selected && (
          <span
            role="button"
            tabIndex={0}
            className={styles.clearBtn}
            onClick={e => { e.stopPropagation(); onChange('') }}
            aria-label={t('common.clear')}
          >
            <X size={12} />
          </span>
        )}
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          className={styles.panel}
          style={{ position: 'fixed', top: coords.top, left: coords.left, width: PANEL_WIDTH }}
        >
          <div className={styles.panelHeader}>
            <button type="button" className={styles.navBtn} onClick={() => shiftMonth(-1)}>
              {isRtl ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
            </button>
            <span className={styles.monthLabel}>{monthLabel}</span>
            <button type="button" className={styles.navBtn} onClick={() => shiftMonth(1)}>
              {isRtl ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>
          </div>

          <div className={styles.weekRow}>
            {weekdays.map((w, i) => <span key={i} className={styles.weekday}>{w}</span>)}
          </div>

          <div className={styles.grid}>
            {cells.map(({ date, inMonth }, i) => (
              <button
                type="button"
                key={i}
                className={styles.day}
                data-in-month={inMonth}
                data-today={isSameDay(date, today)}
                data-selected={isSameDay(date, selected)}
                onClick={() => selectDay(date)}
              >
                {date.getDate()}
              </button>
            ))}
          </div>

          <button type="button" className={styles.todayBtn} onClick={() => selectDay(new Date())}>
            {t('todos.today')}
          </button>
        </div>,
        document.body
      )}
    </>
  )
}
