import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import styles from './News.module.css'

interface NewsItem {
  id: number
  channel: string
  channel_title: string | null
  text: string | null
  image_url: string | null
  telegram_link: string
  published_at: string
}

function timeAgo(dateStr: string, t: (key: string, opts?: any) => string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000 / 60)
  if (diff < 1) return t('news.now')
  if (diff < 60) return t('news.minutesAgo', { n: diff })
  if (diff < 1440) return t('news.hoursAgo', { n: Math.floor(diff / 60) })
  return t('news.daysAgo', { n: Math.floor(diff / 1440) })
}

function channelInitial(title: string | null, channel: string): string {
  const name = title || channel
  return name.charAt(0).toUpperCase()
}

export default function News() {
  const { t } = useTranslation()
  const [items, setItems] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filterChannel, setFilterChannel] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<number | null>(null)

  useEffect(() => {
    fetchNews()

    // realtime — מתעדכן אוטומטית כשהסקריפט מוסיף חדשות
    const channel = supabase
      .channel('news-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'table_news' }, payload => {
        setItems(prev => [payload.new as NewsItem, ...prev])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function fetchNews() {
    setLoading(true)
    const { data, error } = await supabase
      .from('table_news')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(100)
    if (error) setError(error.message)
    else setItems(data ?? [])
    setLoading(false)
  }

  // ערוצים ייחודיים לפילטר
  const channels = Array.from(
    new Map(items.map(i => [i.channel, i.channel_title || i.channel])).entries()
  )

  const visible = filterChannel ? items.filter(i => i.channel === filterChannel) : items

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <h2 className={styles.title}>Telegram News</h2>
        <button className={styles.refreshBtn} onClick={fetchNews} title={t('news.refresh')}>↻</button>
      </div>

      {/* Channel filter */}
      {channels.length > 1 && (
        <div className={styles.channelFilter}>
          <button
            className={`${styles.channelBtn} ${!filterChannel ? styles.activeChannel : ''}`}
            onClick={() => setFilterChannel(null)}
          >
            {t('news.all')}
          </button>
          {channels.map(([ch, title]) => (
            <button
              key={ch}
              className={`${styles.channelBtn} ${filterChannel === ch ? styles.activeChannel : ''}`}
              onClick={() => setFilterChannel(filterChannel === ch ? null : ch)}
            >
              {title}
            </button>
          ))}
        </div>
      )}

      {/* List */}
      <div className={styles.list}>
        {loading && <div className={styles.empty}>{t('news.loading')}</div>}
        {error && <div className={styles.errorMsg}>{error}</div>}
        {!loading && !error && visible.length === 0 && (
          <div className={styles.empty}>
            {t('news.noNews')}<br />
            <span className={styles.emptyHint}>{t('news.runScript')}</span>
          </div>
        )}

        {visible.map(item => {
          const isExpanded = expandedId === item.id
          const isLong = (item.text?.length ?? 0) > 160

          return (
            <article key={item.id} className={styles.item}>
              {/* Image */}
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt=""
                  className={styles.image}
                  loading="lazy"
                />
              )}

              {/* Body */}
              <div className={styles.body}>
                {/* Channel name */}
                <div className={styles.channelRow}>
                  <span className={styles.channelAvatar}>
                    {channelInitial(item.channel_title, item.channel)}
                  </span>
                  <span className={styles.channelName}>
                    {item.channel_title || item.channel}
                  </span>
                  <span className={styles.time}>{timeAgo(item.published_at, t)}</span>
                </div>

                {/* Text */}
                {item.text && (
                  <p className={`${styles.text} ${!isExpanded && isLong ? styles.truncated : ''}`}>
                    {item.text}
                  </p>
                )}

                {/* Show more / less */}
                {isLong && (
                  <button
                    className={styles.expandBtn}
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  >
                    {isExpanded ? t('news.readLess') : t('news.readMore')}
                  </button>
                )}

                {/* Link to Telegram */}
                <a
                  href={item.telegram_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.link}
                >
                  {t('news.openTelegram')}
                </a>
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
