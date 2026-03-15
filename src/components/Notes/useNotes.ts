// src/components/Notes/useNotes.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { Note } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export const NOTE_COLORS = [
  '#fef9c3', // yellow
  '#dcfce7', // green
  '#dbeafe', // blue
  '#fce7f3', // pink
  '#ede9fe', // purple
  '#ffedd5', // orange
  '#f1f5f9', // slate
]

export function useNotes() {
  const { user } = useAuth()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ─── Fetch ────────────────────────────────────────────────────────────────
  const fetchNotes = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('table_notes')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) setError(error.message)
    else setNotes(data as Note[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchNotes() }, [fetchNotes])

  // ─── Create ───────────────────────────────────────────────────────────────
  const addNote = useCallback(async () => {
    const colorIndex = Math.floor(Math.random() * NOTE_COLORS.length)
    const maxOrder = notes.reduce((m, n) => Math.max(m, n.sort_order), 0)

    const { data, error } = await supabase
      .from('table_notes')
      .insert({
        content: '',
        title: null,
        color: NOTE_COLORS[colorIndex],
        sort_order: maxOrder + 1,
        user_id: user?.id ?? null,
      })
      .select()
      .single()

    if (error) setError(error.message)
    else setNotes(prev => [...prev, data as Note])
  }, [notes])

  // ─── Update content / title / color / completed ──────────────────────────
  const updateNote = useCallback(
    async (id: number, changes: Partial<Pick<Note, 'content' | 'title' | 'color' | 'completed'>>) => {
      setNotes(prev => prev.map(n => (n.id === id ? { ...n, ...changes } : n)))
      const { error } = await supabase.from('table_notes').update(changes).eq('id', id)
      if (error) setError(error.message)
    },
    []
  )

  // ─── Reorder (drag & drop) ────────────────────────────────────────────────
  const reorderNotes = useCallback(
    async (fromIndex: number, toIndex: number) => {
      const reordered = [...notes]
      const [moved] = reordered.splice(fromIndex, 1)
      reordered.splice(toIndex, 0, moved)

      // Assign new sort_order values
      const updated = reordered.map((n, i) => ({ ...n, sort_order: i }))
      setNotes(updated)

      // Persist all changed sort_orders
      const promises = updated.map(n =>
        supabase.from('table_notes').update({ sort_order: n.sort_order }).eq('id', n.id)
      )
      await Promise.all(promises)
    },
    [notes]
  )

  // ─── Delete ───────────────────────────────────────────────────────────────
  const deleteNote = useCallback(async (id: number) => {
    setNotes(prev => prev.filter(n => n.id !== id))
    const { error } = await supabase.from('table_notes').delete().eq('id', id)
    if (error) setError(error.message)
  }, [])

  return { notes, loading, error, addNote, updateNote, reorderNotes, deleteNote }
}
