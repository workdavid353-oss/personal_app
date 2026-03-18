import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import styles from './NewsDigest.module.css'

interface DigestItem {
  id: number
  run_at: string
  title: string
  category: string
  summary: string
  sources: string
  msg_count: number
  created_at: string
}

interface Source {
  channel: string
  link: string
}

function timeAgo(dateStr: string, t: (key: string, opts?: Record<string, unknown>) => string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000 / 60)
  if (diff < 1) return t('news.now')
  if (diff < 60) return t('news.minutesAgo', { n: diff })
  if (diff < 1440) return t('news.hoursAgo', { n: Math.floor(diff / 60) })
  return t('news.daysAgo', { n: Math.floor(diff / 1440) })
}

function parseSources(raw: string): Source[] {
  try { return JSON.parse(raw) } catch { return [] }
}


export default function NewsDigest() {
  const { t } = useTranslation()
  const [items, setItems] = useState<DigestItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set())
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)

  function toggleExpanded(id: number) {
    setExpandedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const fetchDigest = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('table_news_digest')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10)

    if (error) setError(error.message)
    else {
      const items = data as DigestItem[]
      setItems(items)
      setExpandedIds(new Set(items.map(i => i.id)))
      setLastRefreshed(new Date())
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchDigest() }, [fetchDigest])

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <span className={styles.title}>{t('newsDigest.title')}</span>
          {lastRefreshed && (
            <span className={styles.lastRefreshed}>
              {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          )}
        </div>
        <button
          className={styles.refreshBtn}
          onClick={fetchDigest}
          disabled={loading}
          title={t('common.refresh')}
        >
          <RefreshCw size={13} className={loading ? styles.spin : ''} />
        </button>
      </div>

      {/* List */}
      <div className={styles.list}>
        {error && <div className={styles.error}>{t('common.error')}</div>}

        {!error && items.length === 0 && !loading && (
          <div className={styles.empty}>{t('newsDigest.empty')}</div>
        )}

        {items.map(item => {
          const sources = parseSources(item.sources)
          const expanded = expandedIds.has(item.id)

          return (
            <div key={item.id} className={styles.card}>
              {/* Card header */}
              <div
                className={styles.cardHeader}
                onClick={() => toggleExpanded(item.id)}
              >
                <div className={styles.cardTop}>
                  <span className={styles.categoryBadge}>{item.category}</span>
                  <span className={styles.time}>{timeAgo(item.created_at, t)}</span>
                </div>
                <div className={styles.cardTitleRow}>
                  <span className={styles.cardTitle}>{item.title}</span>
                  <button className={styles.expandBtn}>
                    {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>

              {/* Expanded: summary + sources */}
              {expanded && (
                <div className={styles.cardBody}>
                  <p className={styles.summary}>{item.summary}</p>
                  {sources.length > 0 && (
                    <div className={styles.sources}>
                      {sources.map((s, i) => (
                        <a
                          key={i}
                          href={s.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.sourceLink}
                        >
                          <ExternalLink size={11} />
                          {s.channel}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
