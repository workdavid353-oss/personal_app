// src/components/Notes/Notes.tsx
import { useRef, useState } from 'react'
import { Plus, Loader2, FileText } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { useNotes } from './useNotes'
import { useNoteCategories } from './useNoteCategories'
import NoteItem from './NoteItem'
import CategoryBar, { type CategoryFilter } from './CategoryBar'
import styles from './Notes.module.css'

export default function Notes() {
  const { t } = useTranslation()
  const { notes, loading, error, addNote, updateNote, reorderNotes, deleteNote } = useNotes()
  const { categories, addCategory, updateCategory, deleteCategory } = useNoteCategories()
  const [activeFilter, setActiveFilter] = useState<CategoryFilter>('all')
  const dragIndex = useRef<number | null>(null)

  const handleDragStart = (index: number) => { dragIndex.current = index }
  const handleDragEnter = (index: number) => {
    if (dragIndex.current === null || dragIndex.current === index) return
    reorderNotes(dragIndex.current, index)
    dragIndex.current = index
  }
  const handleDragEnd = () => { dragIndex.current = null }

  const handleAddNote = () => addNote(typeof activeFilter === 'number' ? activeFilter : null)

  const handleDeleteCategory = (id: number) => {
    deleteCategory(id)
    notes.forEach(n => { if (n.category_id === id) updateNote(n.id, { category_id: null }) })
    if (activeFilter === id) setActiveFilter('all')
  }

  const visibleNotes = notes.filter(n => {
    if (activeFilter === 'all') return true
    if (activeFilter === 'none') return n.category_id == null
    return n.category_id === activeFilter
  })

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
          <button className="tool" onClick={handleAddNote} disabled={loading} title={t('notes.new')}>
            {loading ? <Loader2 size={13} className={styles.spin} /> : <Plus size={13} />}
          </button>
        </div>
      </div>

      <CategoryBar
        categories={categories}
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onAddCategory={addCategory}
        onRenameCategory={(id, name) => updateCategory(id, { name })}
        onRecolorCategory={(id, color) => updateCategory(id, { color })}
        onDeleteCategory={handleDeleteCategory}
      />

      <div className={styles.notesList}>
        {visibleNotes.map((note) => (
          <NoteItem
            key={note.id}
            note={note}
            index={notes.findIndex(n => n.id === note.id)}
            categories={categories}
            onUpdate={updateNote}
            onCreateCategory={addCategory}
            onDelete={deleteNote}
            onDragStart={handleDragStart}
            onDragEnter={handleDragEnter}
            onDragEnd={handleDragEnd}
          />
        ))}

        {visibleNotes.length === 0 && !loading && (
          <div className={styles.emptyState}>
            <span>{t('notes.empty')}</span>
            <button onClick={handleAddNote}>{t('notes.createFirst')}</button>
          </div>
        )}
      </div>
    </div>
  )
}
