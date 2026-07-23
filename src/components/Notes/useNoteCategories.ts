// src/components/Notes/useNoteCategories.ts
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import type { NoteCategory } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'

export function useNoteCategories() {
  const { user } = useAuth()
  const [categories, setCategories] = useState<NoteCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ─── Fetch ────────────────────────────────────────────────────────────────
  const fetchCategories = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('note_categories')
      .select('*')
      .order('sort_order', { ascending: true })

    if (error) setError(error.message)
    else setCategories(data as NoteCategory[])
    setLoading(false)
  }, [])

  useEffect(() => { fetchCategories() }, [fetchCategories])

  // ─── Create ───────────────────────────────────────────────────────────────
  const addCategory = useCallback(
    async (name: string, color: string) => {
      const maxOrder = categories.reduce((m, c) => Math.max(m, c.sort_order), 0)

      const { data, error } = await supabase
        .from('note_categories')
        .insert({ name, color, sort_order: maxOrder + 1, user_id: user?.id ?? null })
        .select()
        .single()

      if (error) { setError(error.message); return null }
      setCategories(prev => [...prev, data as NoteCategory])
      return data as NoteCategory
    },
    [categories, user]
  )

  // ─── Update (rename / recolor) ─────────────────────────────────────────────
  const updateCategory = useCallback(
    async (id: number, changes: Partial<Pick<NoteCategory, 'name' | 'color'>>) => {
      setCategories(prev => prev.map(c => (c.id === id ? { ...c, ...changes } : c)))
      const { error } = await supabase.from('note_categories').update(changes).eq('id', id)
      if (error) setError(error.message)
    },
    []
  )

  // ─── Delete ───────────────────────────────────────────────────────────────
  const deleteCategory = useCallback(async (id: number) => {
    setCategories(prev => prev.filter(c => c.id !== id))
    const { error } = await supabase.from('note_categories').delete().eq('id', id)
    if (error) setError(error.message)
  }, [])

  return { categories, loading, error, addCategory, updateCategory, deleteCategory }
}
