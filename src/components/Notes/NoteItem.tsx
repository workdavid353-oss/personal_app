// src/components/Notes/NoteItem.tsx
import { useState, useRef, useCallback, useEffect } from 'react'
import { X, Copy, Check, GripVertical, CheckCircle2, Circle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Note } from '../../lib/supabase'
import { NOTE_COLORS } from './useNotes'
import styles from './Notes.module.css'

interface Props {
  note: Note
  index: number
  onUpdate: (id: number, changes: Partial<Pick<Note, 'content' | 'title' | 'color' | 'completed'>>) => void
  onDelete: (id: number) => void
  onDragStart: (index: number) => void
  onDragEnter: (index: number) => void
  onDragEnd: () => void
}

export default function NoteItem({
  note, index, onUpdate, onDelete, onDragStart, onDragEnter, onDragEnd,
}: Props) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const [showColors, setShowColors] = useState(false)
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = el.scrollHeight + 'px'
  }

  useEffect(() => { autoResize() }, [])

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
      className={`${styles.noteItem} ${note.completed ? styles.noteCompleted : ''}`}
      style={{ backgroundColor: note.color }}
      draggable={!note.completed}
      onDragStart={() => !note.completed && onDragStart(index)}
      onDragEnter={() => !note.completed && onDragEnter(index)}
      onDragEnd={onDragEnd}
      onDragOver={e => e.preventDefault()}
    >
      {/* ── Header ── */}
      <div className={styles.noteItemHeader}>
        <div className={styles.noteItemLeft}>
          <GripVertical size={14} className={styles.grip} />

          {/* Complete toggle */}
          <button
            className={`${styles.iconBtn} ${note.completed ? styles.completedBtn : ''}`}
            onClick={() => onUpdate(note.id, { completed: !note.completed })}
            title={note.completed ? t('notes.markIncomplete') : t('notes.markComplete')}
          >
            {note.completed ? <CheckCircle2 size={14} /> : <Circle size={14} />}
          </button>

          {/* Color dot — only when not completed */}
          {!note.completed && (
            <div className={styles.colorDotWrap}>
              <button
                className={styles.colorDot}
                style={{ backgroundColor: note.color }}
                onClick={() => setShowColors(v => !v)}
                title={t('notes.changeColor')}
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
          )}

          <input
            className={`${styles.noteTitleInput} ${note.completed ? styles.completedText : ''}`}
            defaultValue={note.title ?? ''}
            placeholder={t('notes.titlePlaceholder')}
            onChange={e => scheduleUpdate({ title: e.target.value || null })}
            readOnly={note.completed}
            dir="auto"
          />
        </div>

        <div className={styles.noteItemRight}>
          {/* Copy title button */}
          <button
            className={`${styles.iconBtn} ${copied ? styles.copied : ''}`}
            onClick={copyTitle}
            title={t('notes.copyTitle')}
            disabled={!note.title}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
          </button>

          {/* Delete */}
          <button
            className={`${styles.iconBtn} ${styles.deleteBtn}`}
            onClick={() => onDelete(note.id)}
            title={t('notes.delete')}
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* ── Content ── */}
      <textarea
        ref={textareaRef}
        className={styles.noteTextarea}
        defaultValue={note.content}
        placeholder={t('notes.contentPlaceholder')}
        onChange={e => { autoResize(); scheduleUpdate({ content: e.target.value }) }}
        readOnly={note.completed}
        dir="auto"
      />
    </div>
  )
}
