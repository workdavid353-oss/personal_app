import { useState, useEffect, useCallback } from 'react'
import type { ReactElement } from 'react'
import { RefreshCw, BookOpen, ExternalLink } from 'lucide-react'
import styles from './WikiWidget.module.css'

type WikiLang = 'en' | 'he'

interface WikiSummary {
  title: string
  description?: string
  extract: string
  thumbnail?: { source: string }
  content_urls: { desktop: { page: string } }
}

export default function WikiWidget(): ReactElement {
  const [lang, setLang] = useState<WikiLang>('en')
  const [article, setArticle] = useState<WikiSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchRandom = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/random/summary`)
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json() as WikiSummary
      setArticle(data)
    } catch {
      setError('Could not load article')
    } finally {
      setLoading(false)
    }
  }, [lang])

  useEffect(() => { fetchRandom() }, [fetchRandom])

  function switchLang(next: WikiLang) {
    if (next === lang) return
    setArticle(null)
    setLang(next)
  }

  return (
    <div
      className="card card-accent"
      style={{ '--accent': 'var(--sky)', '--accent-soft': 'var(--sky-soft)' } as React.CSSProperties}
    >
      <div className="card-head">
        <span className="card-tag"><BookOpen size={16} /></span>
        <span className="card-title">Wikipedia</span>
        <span className="card-subtitle">random</span>
        <div className="card-tools">
          <button
            className={`tool ${styles.langBtn} ${lang === 'en' ? styles.langBtnActive : ''}`}
            onClick={() => switchLang('en')}
          >
            EN
          </button>
          <button
            className={`tool ${styles.langBtn} ${lang === 'he' ? styles.langBtnActive : ''}`}
            onClick={() => switchLang('he')}
          >
            HE
          </button>
          <button
            className="tool"
            onClick={fetchRandom}
            disabled={loading}
            title="Next article"
          >
            <RefreshCw size={13} className={loading ? styles.spin : ''} />
          </button>
        </div>
      </div>

      <div className={styles.body} dir={lang === 'he' ? 'rtl' : 'ltr'}>
        {loading && !article && (
          <div className={styles.placeholder}>Loading...</div>
        )}
        {error && (
          <div className={styles.errorMsg}>{error}</div>
        )}
        {article && !error && (
          <>
            {article.thumbnail && (
              <img
                className={styles.thumb}
                src={article.thumbnail.source}
                alt={article.title}
              />
            )}
            <div className={styles.articleTitle}>{article.title}</div>
            {article.description && (
              <div className={styles.desc}>{article.description}</div>
            )}
            <p className={styles.extract}>{article.extract}</p>
            <a
              className={styles.readMore}
              href={article.content_urls.desktop.page}
              target="_blank"
              rel="noopener noreferrer"
            >
              Read on Wikipedia <ExternalLink size={11} />
            </a>
          </>
        )}
      </div>
    </div>
  )
}
