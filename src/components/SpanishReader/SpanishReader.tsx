import { useState, useEffect, useCallback, useRef } from 'react'
import type { ReactElement } from 'react'
import { RefreshCw, BookOpen, Play, Pause, Square } from 'lucide-react'
import styles from './SpanishReader.module.css'

type TransLang  = 'en' | 'he'
type AudioState = 'idle' | 'playing' | 'paused'

interface WikiSummary {
  title: string
  extract: string
}

interface TooltipState {
  text: string | null
  loading: boolean
  x: number
  y: number
}

function cleanWord(w: string): string {
  return w.replace(/[^a-záéíóúüñ]/gi, '').toLowerCase()
}

export default function SpanishReader(): ReactElement {
  const [transLang, setTransLang]     = useState<TransLang>('en')
  const [article, setArticle]         = useState<WikiSummary | null>(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [tooltip, setTooltip]         = useState<TooltipState | null>(null)
  const [audioState, setAudioState]   = useState<AudioState>('idle')
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null)

  const cache       = useRef<Map<string, string>>(new Map())
  const hoverTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chunksRef   = useRef<string[]>([])
  const offsetsRef  = useRef<number[]>([])

  // ── Audio helpers (defined before effects that reference them) ──

  function stopAudio() {
    window.speechSynthesis.cancel()
    setAudioState('idle')
    setSpeakingIdx(null)
  }

  // ── Effects ────────────────────────────────────────────────────

  // Precompute word offsets for boundary tracking; stop audio on new article
  useEffect(() => {
    if (!article) { chunksRef.current = []; offsetsRef.current = []; return }
    const parts = article.extract.split(/(\s+)/)
    chunksRef.current = parts
    let pos = 0
    offsetsRef.current = parts.map(p => { const s = pos; pos += p.length; return s })
    stopAudio()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article])

  const fetchArticle = useCallback(async () => {
    setLoading(true)
    setError(null)
    setArticle(null)
    setTooltip(null)
    try {
      const res = await fetch('https://es.wikipedia.org/api/rest_v1/page/random/summary')
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json() as WikiSummary
      setArticle(data)
    } catch {
      setError('Could not load article')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchArticle() }, [fetchArticle])

  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current)
      if (leaveTimer.current) clearTimeout(leaveTimer.current)
      window.speechSynthesis.cancel()
    }
  }, [])

  useEffect(() => { cache.current.clear(); setTooltip(null) }, [transLang])

  // ── Audio ──────────────────────────────────────────────────────

  function speakWord(word: string) {
    const clean = cleanWord(word)
    if (!clean) return
    window.speechSynthesis.cancel()
    setSpeakingIdx(null)
    const u = new SpeechSynthesisUtterance(clean)
    u.lang = 'es-ES'
    u.rate = 0.82
    window.speechSynthesis.speak(u)
  }

  function togglePlay() {
    if (!article) return

    if (audioState === 'playing') {
      window.speechSynthesis.pause()
      setAudioState('paused')
      return
    }
    if (audioState === 'paused') {
      window.speechSynthesis.resume()
      setAudioState('playing')
      return
    }

    // idle → start reading
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(article.extract)
    u.lang  = 'es-ES'
    u.rate  = 0.88
    u.pitch = 1

    u.onboundary = (e: SpeechSynthesisEvent) => {
      if (e.name !== 'word') return
      const offsets = offsetsRef.current
      const parts   = chunksRef.current
      for (let i = offsets.length - 1; i >= 0; i--) {
        if (offsets[i] <= e.charIndex && !/^\s+$/.test(parts[i] ?? '')) {
          setSpeakingIdx(i)
          return
        }
      }
    }

    u.onend   = () => { setAudioState('idle'); setSpeakingIdx(null) }
    u.onerror = () => { setAudioState('idle'); setSpeakingIdx(null) }

    window.speechSynthesis.speak(u)
    setAudioState('playing')
  }

  // ── Translation ────────────────────────────────────────────────

  async function translateWord(clean: string, x: number, y: number) {
    const key = `${transLang}:${clean}`
    if (cache.current.has(key)) {
      setTooltip({ text: cache.current.get(key)!, loading: false, x, y })
      return
    }
    setTooltip({ text: null, loading: true, x, y })
    try {
      const res = await fetch(
        `https://api.mymemory.translated.net/get?q=${encodeURIComponent(clean)}&langpair=es|${transLang}`
      )
      const data = await res.json() as { responseData: { translatedText: string } }
      const translation = data.responseData.translatedText
      cache.current.set(key, translation)
      setTooltip(prev => prev ? { ...prev, text: translation, loading: false } : null)
    } catch {
      setTooltip(prev => prev ? { ...prev, text: '—', loading: false } : null)
    }
  }

  function handleWordEnter(word: string, e: React.MouseEvent<HTMLSpanElement>) {
    if (leaveTimer.current) { clearTimeout(leaveTimer.current); leaveTimer.current = null }
    const clean = cleanWord(word)
    if (!clean || clean.length < 2) return
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    const x = rect.left + rect.width / 2
    const y = rect.top
    if (hoverTimer.current) clearTimeout(hoverTimer.current)
    hoverTimer.current = setTimeout(() => translateWord(clean, x, y), 260)
  }

  function handleWordLeave() {
    if (hoverTimer.current) { clearTimeout(hoverTimer.current); hoverTimer.current = null }
    leaveTimer.current = setTimeout(() => setTooltip(null), 180)
  }

  function switchLang(next: TransLang) {
    if (next === transLang) return
    setTransLang(next)
  }

  const chunks = chunksRef.current.length ? chunksRef.current : (article?.extract.split(/(\s+)/) ?? [])

  return (
    <div
      className="card card-accent"
      style={{ '--accent': 'var(--tangerine)', '--accent-soft': 'var(--tangerine-soft)' } as React.CSSProperties}
    >
      <div className="card-head">
        <span className="card-tag"><BookOpen size={16} /></span>
        <span className="card-title">Spanish Reader</span>
        <span className="card-subtitle">hover · click to hear</span>
        <div className="card-tools">
          {audioState !== 'idle' && (
            <button className="tool" onClick={stopAudio} title="Stop">
              <Square size={11} />
            </button>
          )}
          <button
            className={`tool ${audioState === 'playing' ? styles.playingBtn : ''}`}
            onClick={togglePlay}
            disabled={!article || loading}
            title={audioState === 'playing' ? 'Pause' : audioState === 'paused' ? 'Resume' : 'Read aloud'}
          >
            {audioState === 'playing' ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button
            className={`tool ${styles.langBtn} ${transLang === 'en' ? styles.langBtnActive : ''}`}
            onClick={() => switchLang('en')}
            title="Translate to English"
          >EN</button>
          <button
            className={`tool ${styles.langBtn} ${transLang === 'he' ? styles.langBtnActive : ''}`}
            onClick={() => switchLang('he')}
            title="Translate to Hebrew"
          >HE</button>
          <button
            className="tool"
            onClick={fetchArticle}
            disabled={loading}
            title="New article"
          >
            <RefreshCw size={13} className={loading ? styles.spin : ''} />
          </button>
        </div>
      </div>

      <div className={styles.body}>
        {loading && <div className={styles.placeholder}>Loading article...</div>}
        {error   && <div className={styles.errorMsg}>{error}</div>}
        {article && !error && (
          <>
            <div className={styles.articleTitle}>{article.title}</div>
            <p className={styles.paragraph}>
              {chunks.map((chunk, i) => {
                if (/^\s+$/.test(chunk)) return <span key={i}>{chunk}</span>
                return (
                  <span
                    key={i}
                    className={`${styles.word} ${speakingIdx === i ? styles.wordSpeaking : ''}`}
                    onMouseEnter={e => handleWordEnter(chunk, e)}
                    onMouseLeave={handleWordLeave}
                    onClick={() => speakWord(chunk)}
                  >
                    {chunk}
                  </span>
                )
              })}
            </p>
          </>
        )}
      </div>

      {tooltip && (
        <div
          className={styles.tooltip}
          style={{ left: tooltip.x, top: tooltip.y }}
          dir={transLang === 'he' ? 'rtl' : 'ltr'}
        >
          {tooltip.loading ? '...' : tooltip.text}
        </div>
      )}
    </div>
  )
}
