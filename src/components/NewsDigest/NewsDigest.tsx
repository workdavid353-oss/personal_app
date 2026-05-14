import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { RefreshCw, Sparkles, ExternalLink } from 'lucide-react'
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
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchDigest() }, [fetchDigest])

  return (
    <div
      className="card card-accent"
      style={{ '--accent': 'var(--lavender)', '--accent-soft': 'var(--lavender-soft)' } as React.CSSProperties}
    >
      <div className="card-head">
        <span className="card-tag"><Sparkles size={16} /></span>
        <span className="card-title">{t('newsDigest.title', 'Daily digest')}</span>
        <span className="card-subtitle">by AI</span>
        <div className="card-tools">
          <button className={`tool ${styles.refreshBtn}`} onClick={fetchDigest} disabled={loading} title={t('common.refresh')}>
            <RefreshCw size={13} className={loading ? styles.spin : ''} />
          </button>
        </div>
      </div>

      <div className={styles.digestList}>
        {error && <div className={styles.error}>{t('common.error')}</div>}
        {!error && items.length === 0 && !loading && (
          <div className={styles.empty}>{t('newsDigest.empty', 'No digest yet')}</div>
        )}
        {loading && items.length === 0 && <div className={styles.empty}>{t('common.loading')}</div>}

        {items.map((item, i) => {
          const sources = parseSources(item.sources)
          return (
            <div key={item.id} className={styles.digestItem}>
              <span className={styles.digestNum}>{String(i + 1).padStart(2, '0')}</span>
              <div className={styles.digestBody}>
                <div className={styles.digestHeadline}>{item.title}</div>
                <div className={styles.digestSummary}>{item.summary}</div>
                <div className={styles.digestMeta}>
                  <span className={styles.digestSource}>{item.category}</span>
                  <span className={styles.digestTime}>· {timeAgo(item.created_at, t)}</span>
                </div>
                {sources.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                    {sources.map((s, j) => (
                      <a key={j} href={s.link} target="_blank" rel="noopener noreferrer" className={styles.digestLink}>
                        <ExternalLink size={10} /> {s.channel}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
