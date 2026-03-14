import { createClient } from '@supabase/supabase-js'

//const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string
const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY as string

export const supabase = createClient(supabaseUrl, supabaseKey)

export interface table_links_group {
  id: number
  created_at: string
  group_name: string
  category: string
  group_description: string
  user_id: number
}

export interface table_links {
  id: number
  created_at: string
  link: string
  group_link_id: number
  user_id: number
  link_name: string
}

export interface Todo {
  id: number
  created_at: string
  updated_at: string
  title: string
  content: string | null
  completed: boolean
  priority: 'high' | 'medium' | 'low'
  due_date: string | null   // 'YYYY-MM-DD'
  tags: string[] | null
  sort_order: number
  user_id: number | null
}

export interface UserStock {
  id: number
  created_at: string
  user_id: string
  symbol: string
  sort_order: number
}

export interface Note {
  id: number
  created_at: string
  updated_at: string
  title: string | null
  content: string
  color: string
  sort_order: number
  user_id: number | null
}