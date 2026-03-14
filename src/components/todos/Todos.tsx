import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import type { Todo } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import styles from './Todos.module.css'

// ─── helpers ────────────────────────────────────────────────
const PRIORITY_ORDER: Record<Todo['priority'], number> = {
  high: 0,
  medium: 1,
  low: 2,
}

function formatDate(dateStr: string | null, locale: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })
}

function isOverdue(dateStr: string | null): boolean {
  if (!dateStr) return false
  return new Date(dateStr) < new Date(new Date().toDateString())
}

// ─── AddTodoForm ─────────────────────────────────────────────
interface AddTodoFormProps {
  onAdd: (todo: Omit<Todo, 'id' | 'created_at' | 'updated_at' | 'completed' | 'sort_order' | 'user_id'>) => Promise<void>
  existingTags: string[]
  onClose: () => void
}

function AddTodoForm({ onAdd, existingTags, onClose }: AddTodoFormProps) {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [priority, setPriority] = useState<Todo['priority']>('medium')
  const [dueDate, setDueDate] = useState('')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => { titleRef.current?.focus() }, [])

  function addTag(value: string) {
    const tag = value.trim().toLowerCase()
    if (tag && !tags.includes(tag)) setTags(prev => [...prev, tag])
    setTagInput('')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    await onAdd({
      title: title.trim(),
      content: content.trim() || null,
      priority,
      due_date: dueDate || null,
      tags: tags.length ? tags : null,
    })
    setLoading(false)
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.formHeader}>
        <span className={styles.formTitle}>{t('todos.newTask')}</span>
        <button type="button" className={styles.closeBtn} onClick={onClose}>✕</button>
      </div>

      <input
        ref={titleRef}
        className={styles.input}
        placeholder={t('todos.titlePlaceholder')}
        value={title}
        onChange={e => setTitle(e.target.value)}
        required
      />

      <textarea
        className={styles.textarea}
        placeholder={t('todos.contentPlaceholder')}
        value={content}
        onChange={e => setContent(e.target.value)}
        rows={3}
      />

      <div className={styles.formRow}>
        <div className={styles.formGroup}>
          <label className={styles.label}>{t('todos.priority')}</label>
          <div className={styles.priorityBtns}>
            {(['high', 'medium', 'low'] as Todo['priority'][]).map(p => (
              <button
                key={p}
                type="button"
                className={`${styles.priorityBtn} ${styles[p]} ${priority === p ? styles.active : ''}`}
                onClick={() => setPriority(p)}
              >
                {t('todos.' + p)}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>{t('todos.dueDate')}</label>
          <input
            type="date"
            className={styles.input}
            value={dueDate}
            onChange={e => setDueDate(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.formGroup}>
        <label className={styles.label}>{t('todos.tags')}</label>
        <div className={styles.tagInputRow}>
          <input
            className={styles.input}
            placeholder={t('todos.tagPlaceholder')}
            value={tagInput}
            onChange={e => setTagInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); addTag(tagInput) }
            }}
            list="existing-tags"
          />
          <datalist id="existing-tags">
            {existingTags.map(t => <option key={t} value={t} />)}
          </datalist>
          <button type="button" className={styles.addTagBtn} onClick={() => addTag(tagInput)}>+</button>
        </div>
        {tags.length > 0 && (
          <div className={styles.tagsList}>
            {tags.map(t => (
              <span key={t} className={styles.tag}>
                {t}
                <button type="button" onClick={() => setTags(prev => prev.filter(x => x !== t))}>×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className={styles.formActions}>
        <button type="button" className={styles.cancelBtn} onClick={onClose}>{t('common.cancel')}</button>
        <button type="submit" className={styles.submitBtn} disabled={loading || !title.trim()}>
          {loading ? '...' : t('todos.addTask')}
        </button>
      </div>
    </form>
  )
}

// ─── TodoItem ─────────────────────────────────────────────────
interface TodoItemProps {
  todo: Todo
  onToggle: (id: number, completed: boolean) => void
  onDelete: (id: number) => void
  onUpdate: (id: number, changes: Partial<Todo>) => void
  dragHandleProps: {
    draggable: boolean
    onDragStart: (e: React.DragEvent) => void
    onDragOver: (e: React.DragEvent) => void
    onDrop: (e: React.DragEvent) => void
    onDragEnd: () => void
  }
  isDragOver: boolean
  locale: string
}

function TodoItem({ todo, onToggle, onDelete, onUpdate, dragHandleProps, isDragOver, locale }: TodoItemProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(todo.title)

  function saveTitle() {
    if (editTitle.trim() && editTitle.trim() !== todo.title) {
      onUpdate(todo.id, { title: editTitle.trim() })
    } else {
      setEditTitle(todo.title)
    }
    setEditing(false)
  }

  const overdue = isOverdue(todo.due_date) && !todo.completed

  return (
    <div
      className={`${styles.item} ${todo.completed ? styles.completed : ''} ${isDragOver ? styles.dragOver : ''}`}
      {...dragHandleProps}
    >
      <div className={styles.itemMain}>
        <div className={`${styles.dragHandle}`} title={t('todos.dragSort')}>⠿</div>

        <button
          className={`${styles.checkbox} ${todo.completed ? styles.checked : ''}`}
          onClick={() => onToggle(todo.id, todo.completed)}
          aria-label={t('todos.markComplete')}
        >
          {todo.completed && '✓'}
        </button>

        <div className={styles.itemContent}>
          {editing ? (
            <input
              className={styles.editInput}
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') { setEditTitle(todo.title); setEditing(false) } }}
              autoFocus
            />
          ) : (
            <span className={styles.itemTitle} onDoubleClick={() => setEditing(true)} title={t('todos.doubleClickEdit')}>
              {todo.title}
            </span>
          )}

          <div className={styles.itemMeta}>
            <span className={`${styles.priorityDot} ${styles[todo.priority]}`} title={t('todos.priority') + ' ' + t('todos.' + todo.priority)} />
            {todo.due_date && (
              <span className={`${styles.dueDate} ${overdue ? styles.overdue : ''}`}>
                {overdue ? '⚠ ' : '📅 '}{formatDate(todo.due_date, locale)}
              </span>
            )}
            {todo.tags?.map(t => (
              <span key={t} className={styles.tagSmall}>{t}</span>
            ))}
          </div>
        </div>

        <div className={styles.itemActions}>
          {todo.content && (
            <button className={styles.expandBtn} onClick={() => setExpanded(x => !x)} title={expanded ? t('todos.closeTask') : t('todos.expandTask')}>
              {expanded ? '▲' : '▼'}
            </button>
          )}
          <button className={styles.deleteBtn} onClick={() => onDelete(todo.id)} title={t('todos.deleteTask')}>✕</button>
        </div>
      </div>

      {expanded && todo.content && (
        <div className={styles.itemBody}>{todo.content}</div>
      )}
    </div>
  )
}

// ─── Main Todos Component ─────────────────────────────────────
export default function Todos() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active')
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'order' | 'priority' | 'due'>('order')
  const dragId = useRef<number | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)

  const locale = i18n.language === 'he' ? 'he-IL' : 'en-US'

  // ── fetch ──
  useEffect(() => {
    if (user) fetchTodos()
  }, [user])

  async function fetchTodos() {
    setLoading(true)
    const { data, error } = await supabase
      .from('table_todos')
      .select('*')
      .eq('user_id', user!.id)
      .order('sort_order', { ascending: true })
    if (error) setError(error.message)
    else setTodos(data ?? [])
    setLoading(false)
  }

  // ── add ──
  async function handleAdd(todo: Omit<Todo, 'id' | 'created_at' | 'updated_at' | 'completed' | 'sort_order' | 'user_id'>) {
    const maxOrder = todos.length ? Math.max(...todos.map(t => t.sort_order)) + 1 : 0
    const { data, error } = await supabase
      .from('table_todos')
      .insert([{ ...todo, completed: false, sort_order: maxOrder, user_id: user?.id ?? null }])
      .select()
      .single()
    if (error) { alert('שגיאה: ' + error.message); return }
    setTodos(prev => [...prev, data])
    setShowForm(false)
  }

  // ── toggle ──
  async function handleToggle(id: number, current: boolean) {
    const { error } = await supabase
      .from('table_todos')
      .update({ completed: !current, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !current } : t))
  }

  // ── delete ──
  async function handleDelete(id: number) {
    const { error } = await supabase.from('table_todos').delete().eq('id', id)
    if (error) return
    setTodos(prev => prev.filter(t => t.id !== id))
  }

  // ── update ──
  async function handleUpdate(id: number, changes: Partial<Todo>) {
    const { error } = await supabase
      .from('table_todos')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) return
    setTodos(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t))
  }

  // ── drag & drop ──
  function handleDragStart(id: number) {
    dragId.current = id
  }

  function handleDragOver(e: React.DragEvent, overId: number) {
    e.preventDefault()
    setDragOverId(overId)
  }

  async function handleDrop(overId: number) {
    if (dragId.current === null || dragId.current === overId) {
      setDragOverId(null)
      return
    }
    const from = todos.findIndex(t => t.id === dragId.current)
    const to = todos.findIndex(t => t.id === overId)
    const reordered = [...todos]
    const [moved] = reordered.splice(from, 1)
    reordered.splice(to, 0, moved)
    const updated = reordered.map((t, i) => ({ ...t, sort_order: i }))
    setTodos(updated)

    // persist in batch
    await Promise.all(
      updated.map(t => supabase.from('table_todos').update({ sort_order: t.sort_order }).eq('id', t.id))
    )
    dragId.current = null
    setDragOverId(null)
  }

  // ── derived data ──
  const allTags = Array.from(new Set(todos.flatMap(t => t.tags ?? [])))

  const visible = todos
    .filter(t => {
      if (filter === 'active') return !t.completed
      if (filter === 'completed') return t.completed
      return true
    })
    .filter(t => !filterTag || t.tags?.includes(filterTag))
    .sort((a, b) => {
      if (sortBy === 'priority') return PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
      if (sortBy === 'due') {
        if (!a.due_date && !b.due_date) return 0
        if (!a.due_date) return 1
        if (!b.due_date) return -1
        return a.due_date.localeCompare(b.due_date)
      }
      return a.sort_order - b.sort_order
    })

  const activeCount = todos.filter(t => !t.completed).length

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <h2 className={styles.title}>Todos</h2>
          {activeCount > 0 && (
            <span className={styles.badge}>{activeCount}</span>
          )}
        </div>
        <button className={styles.addBtn} onClick={() => setShowForm(x => !x)}>
          {showForm ? '✕' : t('todos.addNew')}
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <AddTodoForm
          onAdd={handleAdd}
          existingTags={allTags}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.filterTabs}>
          {(['active', 'all', 'completed'] as const).map(f => (
            <button
              key={f}
              className={`${styles.filterTab} ${filter === f ? styles.activeTab : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'active' ? t('todos.active') : f === 'all' ? t('common.all') : t('todos.completed')}
            </button>
          ))}
        </div>

        <select
          className={styles.sortSelect}
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
        >
          <option value="order">{t('todos.manualOrder')}</option>
          <option value="priority">{t('todos.byPriority')}</option>
          <option value="due">{t('todos.byDueDate')}</option>
        </select>
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className={styles.tagFilter}>
          <button
            className={`${styles.tagFilterBtn} ${!filterTag ? styles.activeTag : ''}`}
            onClick={() => setFilterTag(null)}
          >
            {t('common.all')}
          </button>
          {allTags.map(t => (
            <button
              key={t}
              className={`${styles.tagFilterBtn} ${filterTag === t ? styles.activeTag : ''}`}
              onClick={() => setFilterTag(filterTag === t ? null : t)}
            >
              {t}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <div className={styles.list}>
        {loading && <div className={styles.empty}>{t('common.loading')}</div>}
        {error && <div className={styles.errorMsg}>{error}</div>}
        {!loading && !error && visible.length === 0 && (
          <div className={styles.empty}>
            {filter === 'completed' ? t('todos.noCompleted') : t('todos.noTasks')}
          </div>
        )}
        {visible.map(todo => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onUpdate={handleUpdate}
            isDragOver={dragOverId === todo.id}
            locale={locale}
            dragHandleProps={{
              draggable: sortBy === 'order',
              onDragStart: () => handleDragStart(todo.id),
              onDragOver: (e) => handleDragOver(e, todo.id),
              onDrop: () => handleDrop(todo.id),
              onDragEnd: () => setDragOverId(null),
            }}
          />
        ))}
      </div>

      {/* Footer */}
      {todos.length > 0 && (
        <div className={styles.footer}>
          <span>{activeCount} {t('todos.remaining')}</span>
          {todos.some(t => t.completed) && (
            <button
              className={styles.clearBtn}
              onClick={async () => {
                const completedIds = todos.filter(t => t.completed).map(t => t.id)
                await supabase.from('table_todos').delete().in('id', completedIds)
                setTodos(prev => prev.filter(t => !t.completed))
              }}
            >
              {t('todos.clearCompleted')}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
