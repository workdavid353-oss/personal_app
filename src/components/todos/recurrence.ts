// src/components/todos/recurrence.ts
export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly'

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

function stripTime(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

function addMonths(d: Date, n: number): Date {
  const year = d.getFullYear()
  const month = d.getMonth() + n
  const day = Math.min(d.getDate(), daysInMonth(year, month))
  return new Date(year, month, day)
}

function addYears(d: Date, n: number): Date {
  const year = d.getFullYear() + n
  const month = d.getMonth()
  const day = Math.min(d.getDate(), daysInMonth(year, month))
  return new Date(year, month, day)
}

/**
 * Given a task's last due_date and its recurrence rule, returns the next
 * occurrence on or after `from` (defaults to today) as a 'YYYY-MM-DD' string.
 * Returns null if the recurrence type is 'none'.
 */
export function getNextOccurrence(
  dueDateStr: string | null,
  type: RecurrenceType,
  weekdays: number[] | null,
  from: Date = new Date()
): string | null {
  if (type === 'none') return null
  const today = stripTime(from)
  let d = parseDateStr(dueDateStr ?? '') ?? today

  if (type === 'daily') {
    while (d < today) d = addDays(d, 1)
    return toDateStr(d)
  }

  if (type === 'weekly') {
    if (weekdays && weekdays.length > 0) {
      let cur = d < today ? today : d
      for (let i = 0; i < 14; i++) {
        if (weekdays.includes(cur.getDay())) return toDateStr(cur)
        cur = addDays(cur, 1)
      }
      return toDateStr(today)
    }
    while (d < today) d = addDays(d, 7)
    return toDateStr(d)
  }

  if (type === 'monthly') {
    while (d < today) d = addMonths(d, 1)
    return toDateStr(d)
  }

  // yearly
  while (d < today) d = addYears(d, 1)
  return toDateStr(d)
}

/** True if a recurring task's due date has passed and it needs to roll over to its next occurrence. */
export function needsRollover(dueDate: string | null, type: RecurrenceType): boolean {
  if (type === 'none' || !dueDate) return false
  const today = toDateStr(new Date())
  return dueDate < today
}

export const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const
