import { useState, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckSquare, Plus, Filter, Repeat } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import type { Todo } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import DatePicker from './DatePicker'
import { getNextOccurrence, needsRollover, WEEKDAY_KEYS } from './recurrence'
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
  const [recurrenceType, setRecurrenceType] = useState<Todo['recurrence_type']>('none')
  const [recurrenceWeekdays, setRecurrenceWeekdays] = useState<number[]>([])
  const [loading, setLoading] = useState(false)
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => { titleRef.current?.focus() }, [])

  function addTag(value: string) {
    const tag = value.trim().toLowerCase()
    if (tag && !tags.includes(tag)) setTags(prev => [...prev, tag])
    setTagInput('')
  }

  function toggleWeekday(day: number) {
    setRecurrenceWeekdays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort())
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) return
    setLoading(true)
    await onAdd({
      title: title.trim(),
      content: content.trim() || null,
      priority,
      due_date: dueDate || (recurrenceType !== 'none' ? new Date().toISOString().slice(0, 10) : null),
      tags: tags.length ? tags : null,
      recurrence_type: recurrenceType,
      recurrence_weekdays: recurrenceType === 'weekly' && recurrenceWeekdays.length ? recurrenceWeekdays : null,
    })
    setLoading(false)
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <form className={styles.modal} onClick={e => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>{t('todos.newTask')}</span>
          <button type="button" className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
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
            rows={4}
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
              <DatePicker value={dueDate} onChange={setDueDate} />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>{t('todos.repeat')}</label>
            <select
              className={styles.sortSelect}
              style={{ marginLeft: 0, width: 'fit-content' }}
              value={recurrenceType}
              onChange={e => setRecurrenceType(e.target.value as Todo['recurrence_type'])}
            >
              <option value="none">{t('todos.repeatNone')}</option>
              <option value="daily">{t('todos.repeatDaily')}</option>
              <option value="weekly">{t('todos.repeatWeekly')}</option>
              <option value="monthly">{t('todos.repeatMonthly')}</option>
              <option value="yearly">{t('todos.repeatYearly')}</option>
            </select>
            {recurrenceType === 'weekly' && (
              <div className={styles.priorityBtns}>
                {WEEKDAY_KEYS.map((key, i) => (
                  <button
                    key={key}
                    type="button"
                    className={`${styles.priorityBtn} ${recurrenceWeekdays.includes(i) ? styles.active : ''}`}
                    onClick={() => toggleWeekday(i)}
                  >
                    {t('todos.weekday.' + key)}
                  </button>
                ))}
              </div>
            )}
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
        </div>

        <div className={styles.modalActions} style={{ justifyContent: 'flex-end' }}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>{t('common.cancel')}</button>
          <button type="submit" className={styles.submitBtn} disabled={loading || !title.trim()}>
            {loading ? '...' : t('todos.addTask')}
          </button>
        </div>
      </form>
    </div>
  )
}

// ─── EditTodoModal ─────────────────────────────────────────────
interface EditTodoModalProps {
  todo: Todo
  existingTags: string[]
  onSave: (id: number, changes: Partial<Todo>) => void
  onDelete: (id: number) => void
  onClose: () => void
}

function EditTodoModal({ todo, existingTags, onSave, onDelete, onClose }: EditTodoModalProps) {
  const { t } = useTranslation()
  const [title, setTitle] = useState(todo.title)
  const [content, setContent] = useState(todo.content ?? '')
  const [priority, setPriority] = useState<Todo['priority']>(todo.priority)
  const [dueDate, setDueDate] = useState(todo.due_date ?? '')
  const [tagInput, setTagInput] = useState('')
  const [tags, setTags] = useState<string[]>(todo.tags ?? [])
  const [recurrenceType, setRecurrenceType] = useState<Todo['recurrence_type']>(todo.recurrence_type)
  const [recurrenceWeekdays, setRecurrenceWeekdays] = useState<number[]>(todo.recurrence_weekdays ?? [])
  const titleRef = useRef<HTMLInputElement>(null)

  useEffect(() => { titleRef.current?.focus() }, [])

  function addTag(value: string) {
    const tag = value.trim().toLowerCase()
    if (tag && !tags.includes(tag)) setTags(prev => [...prev, tag])
    setTagInput('')
  }

  function toggleWeekday(day: number) {
    setRecurrenceWeekdays(prev => prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day].sort())
  }

  function handleSave() {
    if (!title.trim()) return
    onSave(todo.id, {
      title: title.trim(),
      content: content.trim() || null,
      priority,
      due_date: dueDate || (recurrenceType !== 'none' ? new Date().toISOString().slice(0, 10) : null),
      tags: tags.length ? tags : null,
      recurrence_type: recurrenceType,
      recurrence_weekdays: recurrenceType === 'weekly' && recurrenceWeekdays.length ? recurrenceWeekdays : null,
    })
    onClose()
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <span className={styles.modalTitle}>{t('todos.editTask')}</span>
          <button className={styles.modalClose} onClick={onClose}>✕</button>
        </div>

        <div className={styles.modalBody}>
          <input
            ref={titleRef}
            className={styles.input}
            placeholder={t('todos.titlePlaceholder')}
            value={title}
            onChange={e => setTitle(e.target.value)}
          />

          <textarea
            className={styles.textarea}
            placeholder={t('todos.contentPlaceholder')}
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={4}
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
              <DatePicker value={dueDate} onChange={setDueDate} />
            </div>
          </div>

          <div className={styles.formGroup}>
            <label className={styles.label}>{t('todos.repeat')}</label>
            <select
              className={styles.sortSelect}
              style={{ marginLeft: 0, width: 'fit-content' }}
              value={recurrenceType}
              onChange={e => setRecurrenceType(e.target.value as Todo['recurrence_type'])}
            >
              <option value="none">{t('todos.repeatNone')}</option>
              <option value="daily">{t('todos.repeatDaily')}</option>
              <option value="weekly">{t('todos.repeatWeekly')}</option>
              <option value="monthly">{t('todos.repeatMonthly')}</option>
              <option value="yearly">{t('todos.repeatYearly')}</option>
            </select>
            {recurrenceType === 'weekly' && (
              <div className={styles.priorityBtns}>
                {WEEKDAY_KEYS.map((key, i) => (
                  <button
                    key={key}
                    type="button"
                    className={`${styles.priorityBtn} ${recurrenceWeekdays.includes(i) ? styles.active : ''}`}
                    onClick={() => toggleWeekday(i)}
                  >
                    {t('todos.weekday.' + key)}
                  </button>
                ))}
              </div>
            )}
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
                list="edit-existing-tags"
              />
              <datalist id="edit-existing-tags">
                {existingTags.map(tg => <option key={tg} value={tg} />)}
              </datalist>
              <button type="button" className={styles.addTagBtn} onClick={() => addTag(tagInput)}>+</button>
            </div>
            {tags.length > 0 && (
              <div className={styles.tagsList}>
                {tags.map(tg => (
                  <span key={tg} className={styles.tag}>
                    {tg}
                    <button type="button" onClick={() => setTags(prev => prev.filter(x => x !== tg))}>×</button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className={styles.modalActions}>
          <button type="button" className={styles.dangerBtn} onClick={() => { onDelete(todo.id); onClose() }}>
            {t('todos.deleteTask')}
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className={styles.cancelBtn} onClick={onClose}>{t('common.cancel')}</button>
            <button type="button" className={styles.submitBtn} onClick={handleSave} disabled={!title.trim()}>
              {t('common.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── TodoItem ─────────────────────────────────────────────────
interface TodoItemProps {
  todo: Todo
  onToggle: (id: number, completed: boolean) => void
  onDelete: (id: number) => void
  onOpen: (todo: Todo) => void
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

function TodoItem({ todo, onToggle, onDelete, onOpen, dragHandleProps, isDragOver, locale }: TodoItemProps) {
  const { t } = useTranslation()
  const overdue = isOverdue(todo.due_date) && !todo.completed

  return (
    <div
      className={`${styles.item} ${isDragOver ? styles.dragOver : ''}`}
      data-done={todo.completed}
      {...dragHandleProps}
    >
      <div className={styles.itemMain}>
        <div className={styles.dragHandle} title={t('todos.dragSort')}>⠿</div>

        <button
          className={styles.checkbox}
          onClick={() => onToggle(todo.id, todo.completed)}
          aria-label={t('todos.markComplete')}
        >
          {todo.completed && '✓'}
        </button>

        <div className={styles.itemContent} onClick={() => onOpen(todo)} title={t('todos.editTask')}>
          <span className={styles.itemTitle}>{todo.title}</span>

          <div className={styles.itemMeta}>
            <span className={`${styles.priorityDot} ${styles[todo.priority]}`} title={t('todos.priority') + ' ' + t('todos.' + todo.priority)} />
            {todo.due_date && (
              <span className={`${styles.dueDate} ${overdue ? styles.overdue : ''}`}>
                {overdue ? '⚠ ' : '📅 '}{formatDate(todo.due_date, locale)}
              </span>
            )}
            {todo.recurrence_type !== 'none' && (
              <span className={styles.dueDate} title={t('todos.repeat' + todo.recurrence_type[0].toUpperCase() + todo.recurrence_type.slice(1))}>
                <Repeat size={10} style={{ verticalAlign: '-1px' }} />
              </span>
            )}
            {todo.tags?.map(t => (
              <span key={t} className={styles.tagSmall}>{t}</span>
            ))}
          </div>
        </div>

        <div className={styles.itemActions}>
          <button className={styles.deleteBtn} onClick={() => onDelete(todo.id)} title={t('todos.deleteTask')}>✕</button>
        </div>
      </div>
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
  const [draft, setDraft] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('active')
  const [filterTag, setFilterTag] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'order' | 'priority' | 'due'>('order')
  const dragId = useRef<number | null>(null)
  const [dragOverId, setDragOverId] = useState<number | null>(null)
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null)

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
    if (error) { setError(error.message); setLoading(false); return }

    const fetched: Todo[] = (data ?? []).map((t: Todo) => ({
      ...t,
      recurrence_type: t.recurrence_type ?? 'none',
      recurrence_weekdays: t.recurrence_weekdays ?? null,
    }))
    const rolled = await Promise.all(
      fetched.map(async t => {
        if (!needsRollover(t.due_date, t.recurrence_type)) return t
        const nextDate = getNextOccurrence(t.due_date, t.recurrence_type, t.recurrence_weekdays, new Date())
        if (!nextDate) return t
        const changes = { due_date: nextDate, completed: false, updated_at: new Date().toISOString() }
        await supabase.from('table_todos').update(changes).eq('id', t.id)
        return { ...t, ...changes }
      })
    )
    setTodos(rolled)
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

  async function handleQuickAdd() {
    const title = draft.trim()
    if (!title) return
    setDraft('')
    await handleAdd({ title, content: null, priority: 'medium', due_date: null, tags: null, recurrence_type: 'none', recurrence_weekdays: null })
  }

  return (
    <div
      className="card card-accent"
      style={{ '--accent': 'var(--coral)', '--accent-soft': 'var(--coral-soft)' } as React.CSSProperties}
    >
      <div className="card-head">
        <span className="card-tag"><CheckSquare size={16} /></span>
        <span className="card-title">{t('todos.title', 'Today')}</span>
        <span className="card-subtitle">{activeCount} left</span>
        <div className="card-tools">
          <button className="tool" onClick={() => setShowForm(x => !x)} title={t('todos.addNew')}><Plus size={14} /></button>
          <button className="tool" title="Filter"><Filter size={14} /></button>
        </div>
      </div>

      {/* Full add form */}
      {showForm && (
        <AddTodoForm
          onAdd={handleAdd}
          existingTags={allTags}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Tabs */}
      <div className={styles.todoTabs}>
        {(['active', 'completed', 'all'] as const).map(f => (
          <button
            key={f}
            className={styles.todoTab}
            data-active={filter === f}
            onClick={() => setFilter(f)}
          >
            {f === 'active' ? t('todos.active', 'Active') : f === 'all' ? t('common.all', 'All') : t('todos.completed', 'Done')}
          </button>
        ))}
        <select
          className={styles.sortSelect}
          value={sortBy}
          onChange={e => setSortBy(e.target.value as typeof sortBy)}
        >
          <option value="order">{t('todos.manualOrder', 'Manual')}</option>
          <option value="priority">{t('todos.byPriority', 'Priority')}</option>
          <option value="due">{t('todos.byDueDate', 'Due date')}</option>
        </select>
      </div>

      {/* Tag filter */}
      {allTags.length > 0 && (
        <div className={styles.tagFilter}>
          <button className={`${styles.tagFilterBtn} ${!filterTag ? styles.activeTag : ''}`} onClick={() => setFilterTag(null)}>
            {t('common.all', 'All')}
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              className={`${styles.tagFilterBtn} ${filterTag === tag ? styles.activeTag : ''}`}
              onClick={() => setFilterTag(filterTag === tag ? null : tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <div className={styles.todoList}>
        {loading && <div className={styles.empty}>{t('common.loading')}</div>}
        {!loading && !error && visible.length === 0 && (
          <div className={styles.empty}>
            {filter === 'completed' ? t('todos.noCompleted', 'No completed tasks') : t('todos.noTasks', 'No tasks')}
          </div>
        )}
        {visible.map(todo => (
          <TodoItem
            key={todo.id}
            todo={todo}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onOpen={setEditingTodo}
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

      {/* Quick add */}
      <div className={styles.todoInput}>
        <Plus size={14} color="var(--ink-4)" />
        <input
          placeholder={t('todos.addPlaceholder', 'Add a task…')}
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleQuickAdd() }}
        />
      </div>

      {editingTodo && (
        <EditTodoModal
          todo={editingTodo}
          existingTags={allTags}
          onSave={handleUpdate}
          onDelete={handleDelete}
          onClose={() => setEditingTodo(null)}
        />
      )}
    </div>
  )
}
