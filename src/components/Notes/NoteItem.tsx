// src/components/Notes/NoteItem.tsx
import { useState, useRef, useCallback } from 'react'
import { X, Copy, Check, GripVertical, ChevronDown, ChevronUp } from 'lucide-react'
import type { Note } from '../../lib/supabase'
import { NOTE_COLORS } from './useNotes'
import styles from './Notes.module.css'

interface Props {
  note: Note
  index: number
  onUpdate: (id: number, changes: Partial<Pick<Note, 'content' | 'title' | 'color'>>) => void
  onDelete: (id: number) => void
  onDragStart: (index: number) => void
  onDragEnter: (index: number) => void
  onDragEnd: () => void
}

export default function NoteItem({
  note, index, onUpdate, onDelete, onDragStart, onDragEnter, onDragEnd,
}: Props) {
  const [copied, setCopied] = useState(false)
  const [expanded, setExpanded] = useState(true)
  const [showColors, setShowColors] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ─── Debounced save ───────────────────────────────────────────────────────
  const scheduleUpdate = useCallback(
    (changes: Partial<Pick<Note, 'content' | 'title'>>) => {
      if (saveTimer.current) clearTimeout(saveTimer.current)
      saveTimer.current = setTimeout(() => onUpdate(note.id, changes), 600)
    },
    [note.id, onUpdate]
  )

  // ─── Copy title ───────────────────────────────────────────────────────────
  const copyTitle = useCallback(() => {
    if (!note.title) return
    navigator.clipboard.writeText(note.title).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }, [note.title])

  return (
    <div
      className={styles.noteItem}
      style={{ borderLeftColor: note.color, backgroundColor: `${note.color}22` }}
      draggable
      onDragStart={() => onDragStart(index)}
      onDragEnter={() => onDragEnter(index)}
      onDragEnd={onDragEnd}
      onDragOver={e => e.preventDefault()}
    >
      {/* ── Header ── */}
      <div className={styles.noteItemHeader}>
        <div className={styles.noteItemLeft}>
          <GripVertical size={14} className={styles.grip} />

          {/* Color dot */}
          <div className={styles.colorDotWrap}>
            <button
              className={styles.colorDot}
              style={{ backgroundColor: note.color }}
              onClick={() => setShowColors(v => !v)}
              title="שנה צבע"
            />
            {showColors && (
              <div className={styles.colorDropdown}>
                {NOTE_COLORS.map(c => (
                  <button
                    key={c}
                    className={`${styles.colorOption} ${note.color === c ? styles.activeColor : ''}`}
                    style={{ backgroundColor: c }}
                    onClick={() => { onUpdate(note.id, { color: c }); setShowColors(false) }}
                  />
                ))}
              </div>
            )}
          </div>

          <input
            className={styles.noteTitleInput}
            defaultValue={note.title ?? ''}
            placeholder="כותרת..."
            onChange={e => scheduleUpdate({ title: e.target.value || null })}
            dir="auto"
          />
        </div>

        <div className={styles.noteItemRight}>
          {/* Copy title button */}
          <button
            className={`${styles.iconBtn} ${copied ? styles.copied : ''}`}
            onClick={copyTitle}
            title="העתק כותרת"
            disabled={!note.title}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>

          {/* Expand / collapse */}
          <button
            className={styles.iconBtn}
            onClick={() => setExpanded(v => !v)}
            title={expanded ? 'כווץ' : 'הרחב'}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>

          {/* Delete */}
          <button
            className={`${styles.iconBtn} ${styles.deleteBtn}`}
            onClick={() => onDelete(note.id)}
            title="מחק"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      {expanded && (
        <textarea
          className={styles.noteTextarea}
          defaultValue={note.content}
          placeholder="תוכן הפתק..."
          onChange={e => scheduleUpdate({ content: e.target.value })}
          dir="auto"
        />
      )}
    </div>
  )
}
