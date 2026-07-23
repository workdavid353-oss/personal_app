// src/components/Notes/CategoryBar.tsx
import { useState, useRef, useEffect } from 'react'
import { Plus, Settings2, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import type { NoteCategory } from '../../lib/supabase'
import { CATEGORY_COLORS } from './colors'
import styles from './Notes.module.css'

export type CategoryFilter = 'all' | 'none' | number

interface Props {
  categories: NoteCategory[]
  activeFilter: CategoryFilter
  onFilterChange: (filter: CategoryFilter) => void
  onAddCategory: (name: string, color: string) => void
  onRenameCategory: (id: number, name: string) => void
  onRecolorCategory: (id: number, color: string) => void
  onDeleteCategory: (id: number) => void
}

function CategoryRow({
  category, onRename, onRecolor, onDelete,
}: {
  category: NoteCategory
  onRename: (id: number, name: string) => void
  onRecolor: (id: number, color: string) => void
  onDelete: (id: number) => void
}) {
  const [name, setName] = useState(category.name)
  const [showSwatches, setShowSwatches] = useState(false)

  return (
    <div className={styles.categoryRow}>
      <div className={styles.categorySwatchWrap}>
        <button
          className={styles.colorDot}
          style={{ backgroundColor: category.color }}
          onClick={() => setShowSwatches(v => !v)}
        />
        {showSwatches && (
          <div className={styles.categoryRowSwatches}>
            {CATEGORY_COLORS.map(c => (
              <button
                key={c}
                className={`${styles.colorOption} ${category.color === c ? styles.activeColor : ''}`}
                style={{ backgroundColor: c }}
                onClick={() => { onRecolor(category.id, c); setShowSwatches(false) }}
              />
            ))}
          </div>
        )}
      </div>
      <input
        className={styles.categoryRowInput}
        value={name}
        onChange={e => setName(e.target.value)}
        onBlur={() => { if (name.trim() && name.trim() !== category.name) onRename(category.id, name.trim()) }}
        dir="auto"
      />
      <button className={styles.categoryRowDelete} onClick={() => onDelete(category.id)}>
        <X size={12} />
      </button>
    </div>
  )
}

export default function CategoryBar({
  categories, activeFilter, onFilterChange,
  onAddCategory, onRenameCategory, onRecolorCategory, onDeleteCategory,
}: Props) {
  const { t } = useTranslation()
  const [managing, setManaging] = useState(false)
  const [newName, setNewName] = useState('')
  const [newColor, setNewColor] = useState(CATEGORY_COLORS[0])
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!managing) return
    function handlePointerDown(e: MouseEvent) {
      if (wrapRef.current?.contains(e.target as Node)) return
      setManaging(false)
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [managing])

  function handleAdd() {
    const name = newName.trim()
    if (!name) return
    onAddCategory(name, newColor)
    setNewName('')
  }

  return (
    <div className={styles.categoryBar} ref={wrapRef}>
      <div className={styles.categoryChips}>
        <button
          className={`${styles.categoryChip} ${activeFilter === 'all' ? styles.categoryChipActive : ''}`}
          onClick={() => onFilterChange('all')}
        >
          {t('notes.allCategories')}
        </button>
        {categories.map(c => (
          <button
            key={c.id}
            className={`${styles.categoryChip} ${activeFilter === c.id ? styles.categoryChipActive : ''}`}
            onClick={() => onFilterChange(c.id)}
          >
            <span className={styles.categoryChipDot} style={{ backgroundColor: c.color }} />
            {c.name}
          </button>
        ))}
        <button
          className={`${styles.categoryChip} ${activeFilter === 'none' ? styles.categoryChipActive : ''}`}
          onClick={() => onFilterChange('none')}
        >
          {t('notes.noCategory')}
        </button>
        <button className={styles.categoryManageBtn} onClick={() => setManaging(v => !v)} title={t('notes.manageCategories')}>
          <Settings2 size={13} />
        </button>
      </div>

      {managing && (
        <div className={styles.categoryManager}>
          <div className={styles.categoryManagerList}>
            {categories.map(c => (
              <CategoryRow
                key={c.id}
                category={c}
                onRename={onRenameCategory}
                onRecolor={onRecolorCategory}
                onDelete={onDeleteCategory}
              />
            ))}
          </div>
          <div className={styles.categoryManagerAdd}>
            <div className={styles.categorySwatches}>
              {CATEGORY_COLORS.map(c => (
                <button
                  key={c}
                  className={`${styles.colorOption} ${newColor === c ? styles.activeColor : ''}`}
                  style={{ backgroundColor: c }}
                  onClick={() => setNewColor(c)}
                />
              ))}
            </div>
            <input
              className={styles.categoryRowInput}
              placeholder={t('notes.newCategoryPlaceholder')}
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
              dir="auto"
            />
            <button className={styles.categoryAddBtn} onClick={handleAdd} disabled={!newName.trim()}>
              <Plus size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
