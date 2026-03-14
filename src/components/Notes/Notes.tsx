// src/components/Notes/Notes.tsx
import { useRef } from 'react'
import { Plus, Loader2 } from 'lucide-react'
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
    <div className={styles.notesContainer}>
      {/* Toolbar */}
      <div className={styles.notesToolbar}>
        <span className={styles.notesLabel}>Note</span>
        {error && <span className={styles.errorBadge}>{t('common.error')}</span>}
        <button className={styles.addNoteBtn} onClick={addNote} disabled={loading}>
          {loading
            ? <Loader2 size={14} className={styles.spin} />
            : <Plus size={14} />}
          <span>{t('notes.new')}</span>
        </button>
      </div>

      {/* List */}
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
