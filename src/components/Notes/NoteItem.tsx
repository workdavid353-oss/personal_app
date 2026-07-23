// src/components/Notes/NoteItem.tsx
import { useState, useRef, useCallback, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Copy, Check, GripVertical, CheckCircle2, Circle, Ban, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { Note, NoteCategory } from '../../lib/supabase'
import { CATEGORY_COLORS, DEFAULT_NOTE_COLOR } from './colors'
import styles from './Notes.module.css'

const COLOR_DROPDOWN_WIDTH = 140

type CreateCategory = (name: string, color: string) => Promise<NoteCategory | null>

interface Props {
  note: Note
  index: number
  categories: NoteCategory[]
  onUpdate: (id: number, changes: Partial<Pick<Note, 'content' | 'title' | 'category_id' | 'completed'>>) => void
  onCreateCategory: CreateCategory
  onDelete: (id: number) => void
  onDragStart: (index: number) => void
  onDragEnter: (index: number) => void
  onDragEnd: () => void
}

// ─── CategoryPicker ────────────────────────────────────────────
// Reused both in the header's floating dropdown and inline in the edit modal.
interface CategoryPickerProps {
  categories: NoteCategory[]
  selectedId: number | null
  onSelect: (id: number | null) => void
  onCreate: CreateCategory
  onAfterSelect?: () => void
}

function CategoryPicker({ categories, selectedId, onSelect, onCreate, onAfterSelect }: CategoryPickerProps) {
  const { t } = useTranslation()
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [color, setColor] = useState(CATEGORY_COLORS[0])

  async function handleCreate() {
    const trimmed = name.trim()
    if (!trimmed) return
    const created = await onCreate(trimmed, color)
    if (created) {
      onSelect(created.id)
      setName('')
      setAdding(false)
      onAfterSelect?.()
    }
  }

  return (
    <div className={styles.categoryPicker}>
      <div className={styles.categoryPickerSwatches}>
        <button
          className={`${styles.colorOption} ${styles.noColorOption} ${selectedId === null ? styles.activeColor : ''}`}
          title={t('notes.noCategory')}
          onClick={() => { onSelect(null); onAfterSelect?.() }}
        >
          <Ban size={11} />
        </button>
        {categories.map(c => (
          <button
            key={c.id}
            className={`${styles.colorOption} ${selectedId === c.id ? styles.activeColor : ''}`}
            style={{ backgroundColor: c.color }}
            title={c.name}
            onClick={() => { onSelect(c.id); onAfterSelect?.() }}
          />
        ))}
        <button
          className={`${styles.colorOption} ${styles.addColorOption} ${adding ? styles.activeColor : ''}`}
          title={t('notes.newCategoryPlaceholder')}
          onClick={() => setAdding(v => !v)}
        >
          <Plus size={11} />
        </button>
      </div>
      {adding && (
        <div className={styles.categoryPickerAdd}>
          <div className={styles.categorySwatches}>
            {CATEGORY_COLORS.map(c => (
              <button
                key={c}
                className={`${styles.colorOption} ${color === c ? styles.activeColor : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => setColor(c)}
              />
            ))}
          </div>
          <input
            className={styles.categoryPickerInput}
            placeholder={t('notes.newCategoryPlaceholder')}
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
            autoFocus
            dir="auto"
          />
          <button className={styles.categoryAddBtn} onClick={handleCreate} disabled={!name.trim()}>
            <Check size={12} />
          </button>
        </div>
      )}
    </div>
  )
}

// ─── EditNoteModal ─────────────────────────────────────────────
interface EditNoteModalProps {
  note: Note
  categories: NoteCategory[]
  onSave: (id: number, changes: Partial<Pick<Note, 'title' | 'content' | 'category_id'>>) => void
  onCreateCategory: CreateCategory
  onClose: () => void
}

function EditNoteModal({ note, categories, onSave, onCreateCategory, onClose }: EditNoteModalProps) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(note.title ?? '')
  const [content, setContent] = useState(note.content)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => { if (!note.completed) titleRef.current?.focus() }, [note.completed])

  function handleSave() {
    onSave(note.id, { title: title.trim() || null, content })
    onClose()
  }

  return createPortal(
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>{t('notes.editNote')}</span>
          <button type="button" className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          <input
            ref={titleRef}
            className={styles.modalInput}
            placeholder={t('notes.titlePlaceholder')}
            value={title}
            onChange={e => setTitle(e.target.value)}
            readOnly={note.completed}
            dir="auto"
          />
          <textarea
            className={styles.modalTextarea}
            placeholder={t('notes.contentPlaceholder')}
            value={content}
            onChange={e => setContent(e.target.value)}
            readOnly={note.completed}
            rows={8}
            dir="auto"
          />
          {!note.completed && (
            <div className={styles.modalField}>
              <span className={styles.modalFieldLabel}>{t('notes.category')}</span>
              <CategoryPicker
                categories={categories}
                selectedId={note.category_id}
                onSelect={id => onSave(note.id, { category_id: id })}
                onCreate={onCreateCategory}
              />
            </div>
          )}
        </div>

        <div className={styles.modalActions}>
          <button type="button" className={styles.modalCancelBtn} onClick={onClose}>{t('common.cancel')}</button>
          {!note.completed && (
            <button type="button" className={styles.modalSaveBtn} onClick={handleSave}>{t('common.save')}</button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function NoteItem({
  note, index, categories, onUpdate, onCreateCategory, onDelete, onDragStart, onDragEnter, onDragEnd,
}: Props) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const [showColors, setShowColors] = useState(false)
  const category = categories.find(c => c.id === note.category_id) ?? null
  const noteColor = category?.color ?? DEFAULT_NOTE_COLOR
  const [editing, setEditing] = useState(false)
  const [colorCoords, setColorCoords] = useState({ top: 0, left: 0 })
  const colorDotRef = useRef<HTMLButtonElement>(null)
  const colorPanelRef = useRef<HTMLDivElement>(null)

  function repositionColorDropdown() {
    const rect = colorDotRef.current?.getBoundingClientRect()
    if (!rect) return
    const panelWidth = colorPanelRef.current?.getBoundingClientRect().width ?? COLOR_DROPDOWN_WIDTH
    const left = Math.min(Math.max(rect.left, 8), window.innerWidth - panelWidth - 8)
    setColorCoords({ top: rect.bottom + 6, left })
  }

  useLayoutEffect(() => {
    if (!showColors) return
    repositionColorDropdown()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showColors])

  useEffect(() => {
    if (!showColors) return
    function handlePointerDown(e: MouseEvent) {
      const target = e.target as Node
      if (colorDotRef.current?.contains(target) || colorPanelRef.current?.contains(target)) return
      setShowColors(false)
    }
    function handleReposition() { repositionColorDropdown() }
    document.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('scroll', handleReposition, true)
    window.addEventListener('resize', handleReposition)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('scroll', handleReposition, true)
      window.removeEventListener('resize', handleReposition)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showColors])

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
      style={{ backgroundColor: noteColor }}
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

          {/* Category dot — only when not completed */}
          {!note.completed && (
            <>
              <button
                ref={colorDotRef}
                className={styles.colorDot}
                style={{ backgroundColor: noteColor }}
                onClick={() => setShowColors(v => !v)}
                title={category ? category.name : t('notes.noCategory')}
              />
              {showColors && createPortal(
                <div
                  ref={colorPanelRef}
                  className={styles.colorDropdown}
                  style={{ position: 'fixed', top: colorCoords.top, left: colorCoords.left }}
                >
                  <CategoryPicker
                    categories={categories}
                    selectedId={note.category_id}
                    onSelect={id => onUpdate(note.id, { category_id: id })}
                    onCreate={onCreateCategory}
                    onAfterSelect={() => setShowColors(false)}
                  />
                </div>,
                document.body
              )}
            </>
          )}

          <span
            className={`${styles.noteTitle} ${note.completed ? styles.completedText : ''} ${!note.title ? styles.notePlaceholder : ''}`}
            onClick={() => setEditing(true)}
            dir="auto"
          >
            {note.title || t('notes.titlePlaceholder')}
          </span>
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

      {/* ── Content preview ── */}
      <div
        className={`${styles.notePreview} ${note.completed ? styles.completedText : ''} ${!note.content ? styles.notePlaceholder : ''}`}
        onClick={() => setEditing(true)}
        dir="auto"
      >
        {note.content || t('notes.noContent')}
      </div>

      {editing && (
        <EditNoteModal
          note={note}
          categories={categories}
          onSave={onUpdate}
          onCreateCategory={onCreateCategory}
          onClose={() => setEditing(false)}
        />
      )}
    </div>
  )
}
