// src/components/Notes/Notes.tsx
import { useRef } from 'react'
import { Plus, Loader2, FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNotes } from './useNotes'
import NoteItem from './NoteItem'
import styles from './Notes.module.css'

export default function Notes() {
  const { t } = useTranslation()
  const { notes, loading, error, addNote, updateNote, reorderNotes, deleteNote } = useNotes()
  const dragIndex = useRef<number | null>(null)

  const handleDragStart = (index: number) => { dragIndex.current = index }
  const handleDragEnter = (index: number) => {
    if (dragIndex.current === null || dragIndex.current === index) return
    reorderNotes(dragIndex.current, index)
    dragIndex.current = index
  }
  const handleDragEnd = () => { dragIndex.current = null }

  return (
    <div
      className="card card-accent"
      style={{ '--accent': 'var(--sun)', '--accent-soft': 'var(--sun-soft)' } as React.CSSProperties}
    >
      <div className="card-head">
        <span className="card-tag"><FileText size={16} /></span>
        <span className="card-title">{t('notes.title', 'Notes')}</span>
        <span className="card-subtitle">scratch pad</span>
        <div className="card-tools">
          {error && <span style={{ fontSize: 11, color: 'var(--coral)' }}>{t('common.error')}</span>}
          <button className="tool" onClick={addNote} disabled={loading} title={t('notes.new')}>
            {loading ? <Loader2 size={13} className={styles.spin} /> : <Plus size={13} />}
          </button>
        </div>
      </div>

      <div className={styles.notesList}>
        {notes.map((note, index) => (
          <NoteItem
            key={note.id}
            note={note}
            index={index}
            onUpdate={updateNote}
            onDelete={deleteNote}
            onDragStart={handleDragStart}
            onDragEnter={handleDragEnter}
            onDragEnd={handleDragEnd}
          />
        ))}

        {notes.length === 0 && !loading && (
          <div className={styles.emptyState}>
            <span>{t('notes.empty')}</span>
            <button onClick={addNote}>{t('notes.createFirst')}</button>
          </div>
        )}
      </div>
    </div>
  )
}
