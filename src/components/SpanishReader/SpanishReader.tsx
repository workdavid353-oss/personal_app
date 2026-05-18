import { useState, useEffect, useCallback, useRef } from 'react'
import type { ReactElement } from 'react'
import { RefreshCw, BookOpen, Play, Pause, Square } from 'lucide-react'
import { useWidgetSettings } from '../../context/WidgetSettingsContext'
import styles from './SpanishReader.module.css'

type TransLang  = 'en' | 'he'
type AudioState = 'idle' | 'playing' | 'paused'
type Difficulty = 'beginner' | 'intermediate' | 'advanced'

interface Article {
  title: string
  extract: string
}

interface TooltipState {
  text: string | null
  loading: boolean
  x: number
  y: number
}

// ── Curated A1-A2 texts ────────────────────────────────────────
const BEGINNER_TEXTS: Article[] = [
  { title: 'Mi familia', extract: 'Tengo una familia pequeña. Mi mamá se llama Ana y mi papá se llama Carlos. Tengo una hermana. Ella se llama María. Vivimos en una casa grande con un jardín.' },
  { title: 'El desayuno', extract: 'Cada mañana como el desayuno. Me gusta el pan con mantequilla. También tomo un vaso de leche o zumo de naranja. El desayuno es muy importante para empezar bien el día.' },
  { title: 'Mi perro', extract: 'Tengo un perro. Se llama Toby. Toby es pequeño y marrón. Le gusta jugar en el jardín y correr. Cada tarde salimos a caminar juntos por el parque.' },
  { title: 'El tiempo', extract: 'Hoy hace sol y calor. El cielo es azul y no hay nubes. En verano hace mucho calor en España. Me gusta el sol pero también me gusta la lluvia cuando estoy en casa.' },
  { title: 'La escuela', extract: 'Voy a la escuela todos los días. Tengo muchos amigos allí. Mi clase favorita es matemáticas. El profesor se llama señor García. Aprendo muchas cosas nuevas cada día.' },
  { title: 'La comida española', extract: 'Me gusta mucho la comida española. La paella es mi plato favorito. También me gustan las tapas y el gazpacho. Los domingos comemos todos juntos en familia.' },
  { title: 'Mi habitación', extract: 'Mi habitación es pequeña pero muy cómoda. Tengo una cama, un escritorio y una silla. En la pared hay un póster de mi cantante favorito. Por las noches leo un libro antes de dormir.' },
  { title: 'El mercado', extract: 'Los sábados voy al mercado con mi madre. Compramos frutas y verduras frescas. Hay tomates, cebollas, manzanas y naranjas. El mercado es muy animado y lleno de colores.' },
  { title: 'Los animales del campo', extract: 'En el campo hay muchos animales. Las vacas comen hierba verde. Los caballos corren muy rápido. Las gallinas ponen huevos por las mañanas. Me gustan mucho los animales.' },
  { title: 'Mi ciudad', extract: 'Vivo en una ciudad bonita. Hay muchas tiendas y restaurantes. En el centro hay una plaza grande con una fuente. Los domingos la gente pasea por el parque y toma el sol.' },
  { title: 'Las estaciones', extract: 'Hay cuatro estaciones en el año: primavera, verano, otoño e invierno. En primavera las flores son bonitas. En verano hace calor. En otoño las hojas caen. En invierno hace frío.' },
  { title: 'El fin de semana', extract: 'Los fines de semana descanso y me divierto. El sábado salgo con mis amigos al cine o a comer pizza. El domingo me quedo en casa, leo un libro y ayudo en casa.' },
  { title: 'El transporte', extract: 'Para ir al trabajo, mi padre toma el autobús. Mi madre prefiere caminar porque vive cerca. Yo voy a la escuela en bicicleta. El metro es muy rápido y puntual.' },
  { title: 'Los colores', extract: 'Me gustan mucho los colores. Mi color favorito es el azul. El cielo es azul y el mar también. Las manzanas son rojas o verdes. Los limones son amarillos y las naranjas son... naranjas.' },
  { title: 'La música', extract: 'Me gusta mucho escuchar música. Mi estilo favorito es el pop en español. Toco la guitarra un poco, pero no muy bien. La música me hace feliz cuando estoy triste.' },
]

// ── B1-B2 Wikipedia topics ─────────────────────────────────────
const INTERMEDIATE_TOPICS = [
  'España', 'México', 'Argentina', 'Colombia', 'Chile',
  'Fútbol', 'Tenis', 'Natación', 'Ciclismo', 'Atletismo',
  'Flamenco', 'Tango', 'Salsa', 'Guitarra', 'Ópera',
  'Océano_Atlántico', 'Mediterráneo', 'Amazonas', 'Andes', 'Sahara',
  'Café', 'Chocolate', 'Arroz', 'Tomate', 'Maíz',
  'Perro', 'Gato', 'Delfín', 'Águila', 'Jaguar',
]

function cleanWord(w: string): string {
  return w.replace(/[^a-záéíóúüñ]/gi, '').toLowerCase()
}

function randomFrom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]
}

const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner:     'A1–A2',
  intermediate: 'B1–B2',
  advanced:     'C1–C2',
}

export default function SpanishReader(): ReactElement {
  const { widgetPrefs, prefsLoaded, updateWidgetPref } = useWidgetSettings()

  // Read saved prefs immediately so initial state is correct on first render
  const saved = widgetPrefs['spanishReader'] as { difficulty?: Difficulty; transLang?: TransLang } | undefined

  const [difficulty, setDifficulty]   = useState<Difficulty>(saved?.difficulty ?? 'intermediate')
  const [transLang, setTransLang]     = useState<TransLang>(saved?.transLang   ?? 'en')
  const [article, setArticle]         = useState<Article | null>(null)
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [tooltip, setTooltip]         = useState<TooltipState | null>(null)
  const [audioState, setAudioState]   = useState<AudioState>('idle')
  const [speakingIdx, setSpeakingIdx] = useState<number | null>(null)

  const cache          = useRef<Map<string, string>>(new Map())
  const hoverTimer     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const leaveTimer     = useRef<ReturnType<typeof setTimeout> | null>(null)
  const chunksRef      = useRef<string[]>([])
  const offsetsRef     = useRef<number[]>([])
  const prefsApplied   = useRef(saved != null) // true if we got prefs on first render

  // ── Audio stop (defined before effects that call it) ──────────

  function stopAudio() {
    window.speechSynthesis.cancel()
    setAudioState('idle')
    setSpeakingIdx(null)
  }

  // ── Precompute word offsets; stop audio on new article ────────

  useEffect(() => {
    if (!article) { chunksRef.current = []; offsetsRef.current = []; return }
    const parts = article.extract.split(/(\s+)/)
    chunksRef.current = parts
    let pos = 0
    offsetsRef.current = parts.map(p => { const s = pos; pos += p.length; return s })
    stopAudio()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [article])

  // ── Fetch ─────────────────────────────────────────────────────

  const fetchArticle = useCallback(async () => {
    setLoading(true)
    setError(null)
    setArticle(null)
    setTooltip(null)

    if (difficulty === 'beginner') {
      await new Promise(r => setTimeout(r, 200))
      setArticle(randomFrom(BEGINNER_TEXTS))
      setLoading(false)
      return
    }

    try {
      const url = difficulty === 'intermediate'
        ? `https://es.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(randomFrom(INTERMEDIATE_TOPICS))}`
        : 'https://es.wikipedia.org/api/rest_v1/page/random/summary'

      const res = await fetch(url)
      if (!res.ok) throw new Error('fetch failed')
      const data = await res.json() as Article
      setArticle(data)
    } catch {
      setError('Could not load article')
    } finally {
      setLoading(false)
    }
  }, [difficulty])

  // Wait for prefs to load before fetching the first article
  useEffect(() => {
    if (!prefsLoaded) return
    fetchArticle()
  // fetchArticle changes when difficulty changes, so this also re-fetches on difficulty change
  }, [fetchArticle, prefsLoaded])

  // If prefs weren't ready on first render, apply them once they arrive
  useEffect(() => {
    if (prefsApplied.current || !prefsLoaded) return
    prefsApplied.current = true
    const late = widgetPrefs['spanishReader'] as { difficulty?: Difficulty; transLang?: TransLang } | undefined
    if (late?.difficulty) setDifficulty(late.difficulty)
    if (late?.transLang)  setTransLang(late.transLang)
  }, [prefsLoaded, widgetPrefs])

  useEffect(() => {
    return () => {
      if (hoverTimer.current) clearTimeout(hoverTimer.current)
      if (leaveTimer.current) clearTimeout(leaveTimer.current)
      window.speechSynthesis.cancel()
    }
  }, [])

  useEffect(() => { cache.current.clear(); setTooltip(null) }, [transLang])

  function savePref(d: Difficulty, tl: TransLang) {
    updateWidgetPref('spanishReader', { difficulty: d, transLang: tl })
  }

  // ── Audio ─────────────────────────────────────────────────────

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
    if (audioState === 'playing') { window.speechSynthesis.pause(); setAudioState('paused'); return }
    if (audioState === 'paused')  { window.speechSynthesis.resume(); setAudioState('playing'); return }

    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(article.extract)
    u.lang  = 'es-ES'
    u.rate  = difficulty === 'beginner' ? 0.78 : difficulty === 'intermediate' ? 0.88 : 0.94
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

  // ── Translation ───────────────────────────────────────────────

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

  function switchDifficulty(d: Difficulty) {
    if (d === difficulty) return
    setDifficulty(d)
    savePref(d, transLang)
  }

  function switchTransLang(tl: TransLang) {
    if (tl === transLang) return
    setTransLang(tl)
    savePref(difficulty, tl)
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
            <button className="tool" onClick={stopAudio} title="Stop"><Square size={11} /></button>
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
            onClick={() => switchTransLang('en')}
            title="Translate to English"
          >EN</button>
          <button
            className={`tool ${styles.langBtn} ${transLang === 'he' ? styles.langBtnActive : ''}`}
            onClick={() => switchTransLang('he')}
            title="Translate to Hebrew"
          >HE</button>
          <button className="tool" onClick={fetchArticle} disabled={loading} title="New article">
            <RefreshCw size={13} className={loading ? styles.spin : ''} />
          </button>
        </div>
      </div>

      {/* Difficulty selector */}
      <div className={styles.difficultyRow}>
        {(['beginner', 'intermediate', 'advanced'] as Difficulty[]).map(d => (
          <button
            key={d}
            className={`${styles.diffBtn} ${difficulty === d ? styles.diffBtnActive : ''} ${styles[`diff_${d}`]}`}
            onClick={() => switchDifficulty(d)}
          >
            {DIFFICULTY_LABELS[d]}
          </button>
        ))}
      </div>

      <div className={styles.body}>
        {loading && <div className={styles.placeholder}>Loading article...</div>}
        {error   && <div className={styles.errorMsg}>{error}</div>}
        {article && !error && (
          <>
            <div className={styles.titleRow}>
              <span className={styles.articleTitle}>{article.title}</span>
              <span className={`${styles.diffBadge} ${styles[`badge_${difficulty}`]}`}>
                {DIFFICULTY_LABELS[difficulty]}
              </span>
            </div>
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
