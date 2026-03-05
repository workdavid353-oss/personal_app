import { useState, useEffect, useCallback } from 'react'
import styles from './Weather.module.css'

// ─── Types ────────────────────────────────────────────────────
interface WeatherData {
  location: { name: string; country: string; localtime: string }
  current: {
    temp_c: number
    feelslike_c: number
    humidity: number
    wind_kph: number
    wind_dir: string
    condition: { text: string; icon: string; code: number }
    uv: number
    vis_km: number
    pressure_mb: number
  }
  forecast: {
    forecastday: ForecastDay[]
  }
}

interface ForecastDay {
  date: string
  day: {
    maxtemp_c: number
    mintemp_c: number
    avghumidity: number
    maxwind_kph: number
    condition: { text: string; icon: string }
    daily_chance_of_rain: number
  }
  astro: { sunrise: string; sunset: string }
}

interface SavedLocation {
  name: string
  label: string  // שם תצוגה
}

// ─── Constants ───────────────────────────────────────────────
const API_KEY = import.meta.env.VITE_WEATHER_API_KEY as string

const DAYS_HE = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

const WIND_DIR_HE: Record<string, string> = {
  N:'צפון', NNE:'צפון-מזרח', NE:'צפון-מזרח', ENE:'מזרח-צפון',
  E:'מזרח', ESE:'מזרח-דרום', SE:'דרום-מזרח', SSE:'דרום-מזרח',
  S:'דרום', SSW:'דרום-מערב', SW:'דרום-מערב', WSW:'מערב-דרום',
  W:'מערב', WNW:'מערב-צפון', NW:'צפון-מערב', NNW:'צפון-מערב',
}

// הערכת מצב הים לפי מהירות רוח (בופורט מפושט)
function seaState(wind_kph: number): { label: string; color: string } {
  if (wind_kph < 6)  return { label: 'ים שקט', color: '#22c55e' }
  if (wind_kph < 12) return { label: 'ים קל', color: '#86efac' }
  if (wind_kph < 20) return { label: 'ים קל-בינוני', color: '#fde047' }
  if (wind_kph < 30) return { label: 'ים בינוני', color: '#fb923c' }
  if (wind_kph < 40) return { label: 'ים סוער', color: '#f87171' }
  return { label: 'ים סוער מאוד', color: '#dc2626' }
}

function getDayName(dateStr: string, index: number): string {
  if (index === 0) return 'היום'
  if (index === 1) return 'מחר'
  const d = new Date(dateStr)
  return DAYS_HE[d.getDay()]
}

// ─── Main Component ───────────────────────────────────────────
export default function Weather() {
  const [data, setData] = useState<WeatherData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [activeLocation, setActiveLocation] = useState<string>('')
  const [favorites, setFavorites] = useState<SavedLocation[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('weather_favorites') || '[]')
    } catch { return [] }
  })
  const [showAddForm, setShowAddForm] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [geoLoading, setGeoLoading] = useState(false)

  // ── fetch weather ──
  const fetchWeather = useCallback(async (locationQuery: string) => {
    if (!locationQuery.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(
        `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${encodeURIComponent(locationQuery)}&days=5&lang=he`
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message || 'שגיאה בטעינת נתונים')
      }
      const json: WeatherData = await res.json()
      setData(json)
      setActiveLocation(locationQuery)
    } catch (e: any) {
      setError(e.message)
      setData(null)
    } finally {
      setLoading(false)
    }
  }, [])

  // ── geolocation ──
  function fetchByLocation() {
    if (!navigator.geolocation) {
      setError('הדפדפן לא תומך במיקום')
      return
    }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      pos => {
        const q = `${pos.coords.latitude},${pos.coords.longitude}`
        fetchWeather(q)
        setGeoLoading(false)
      },
      () => {
        setError('לא ניתן לקבל מיקום — נסה ידנית')
        setGeoLoading(false)
      }
    )
  }

  // ── load on mount ──
  useEffect(() => {
    if (favorites.length > 0) {
      fetchWeather(favorites[0].name)
    } else {
      fetchByLocation()
    }
  }, [])

  // ── save favorites ──
  function saveFavorites(list: SavedLocation[]) {
    setFavorites(list)
    localStorage.setItem('weather_favorites', JSON.stringify(list))
  }

  function addFavorite() {
    if (!data) return
    const loc: SavedLocation = {
      name: activeLocation,
      label: newLabel.trim() || data.location.name,
    }
    const updated = [...favorites.filter(f => f.name !== loc.name), loc]
    saveFavorites(updated)
    setShowAddForm(false)
    setNewLabel('')
  }

  function removeFavorite(name: string) {
    saveFavorites(favorites.filter(f => f.name !== name))
  }

  const isCurrentFavorite = favorites.some(f => f.name === activeLocation)
  const sea = data ? seaState(data.current.wind_kph) : null

  return (
    <div className={styles.container}>
      {/* ── Header ── */}
      <div className={styles.header}>
        <h2 className={styles.title}>Weather</h2>
        <button
          className={styles.geoBtn}
          onClick={fetchByLocation}
          title="מיקום נוכחי"
          disabled={geoLoading}
        >
          {geoLoading ? '...' : '📍'}
        </button>
      </div>

      {/* ── Search ── */}
      <div className={styles.searchRow}>
        <input
          className={styles.input}
          placeholder="חפש עיר..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') fetchWeather(query) }}
        />
        <button className={styles.searchBtn} onClick={() => fetchWeather(query)}>חפש</button>
      </div>

      {/* ── Favorites ── */}
      {favorites.length > 0 && (
        <div className={styles.favorites}>
          {favorites.map(fav => (
            <div key={fav.name} className={styles.favGroup}>
              <button
                className={`${styles.favBtn} ${activeLocation === fav.name ? styles.activeFav : ''}`}
                onClick={() => fetchWeather(fav.name)}
              >
                {fav.label}
              </button>
              <button
                className={styles.removeFav}
                onClick={() => removeFavorite(fav.name)}
                title="הסר מועדף"
              >×</button>
            </div>
          ))}
        </div>
      )}

      {/* ── Add favorite ── */}
      {data && !isCurrentFavorite && (
        <div className={styles.addFavRow}>
          {showAddForm ? (
            <>
              <input
                className={styles.input}
                placeholder={`שם תצוגה (ברירת מחדל: ${data.location.name})`}
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addFavorite() }}
                autoFocus
              />
              <button className={styles.searchBtn} onClick={addFavorite}>שמור</button>
              <button className={styles.cancelBtn} onClick={() => setShowAddForm(false)}>ביטול</button>
            </>
          ) : (
            <button className={styles.addFavBtn} onClick={() => setShowAddForm(true)}>
              ☆ הוסף למועדפים
            </button>
          )}
        </div>
      )}

      {/* ── States ── */}
      {loading && <div className={styles.empty}>טוען...</div>}
      {error && <div className={styles.errorMsg}>{error}</div>}

      {/* ── Main Weather ── */}
      {data && !loading && (
        <>
          {/* Current */}
          <div className={styles.current}>
            <div className={styles.currentTop}>
              <div>
                <div className={styles.cityName}>{data.location.name}</div>
                <div className={styles.conditionText}>{data.current.condition.text}</div>
              </div>
              <img
                src={`https:${data.current.condition.icon}`}
                alt={data.current.condition.text}
                className={styles.weatherIcon}
              />
            </div>

            <div className={styles.tempRow}>
              <span className={styles.temp}>{Math.round(data.current.temp_c)}°</span>
              <span className={styles.feels}>מרגיש כמו {Math.round(data.current.feelslike_c)}°</span>
            </div>

            {/* Stats grid */}
            <div className={styles.statsGrid}>
              <div className={styles.stat}>
                <span className={styles.statIcon}>💧</span>
                <span className={styles.statVal}>{data.current.humidity}%</span>
                <span className={styles.statLabel}>לחות</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statIcon}>💨</span>
                <span className={styles.statVal}>{Math.round(data.current.wind_kph)} קמ"ש</span>
                <span className={styles.statLabel}>{WIND_DIR_HE[data.current.wind_dir] || data.current.wind_dir}</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statIcon}>👁</span>
                <span className={styles.statVal}>{data.current.vis_km} ק"מ</span>
                <span className={styles.statLabel}>ראות</span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statIcon}>☀️</span>
                <span className={styles.statVal}>UV {data.current.uv}</span>
                <span className={styles.statLabel}>קרינה</span>
              </div>
            </div>

            {/* Sea state */}
            {sea && (
              <div className={styles.seaRow} style={{ '--sea-color': sea.color } as React.CSSProperties}>
                <span>🌊</span>
                <span className={styles.seaLabel}>{sea.label}</span>
                <span className={styles.seaNote}>(לפי מהירות רוח)</span>
              </div>
            )}
          </div>

          {/* ── 5-day forecast ── */}
          <div className={styles.forecastTitle}>תחזית 5 ימים</div>
          <div className={styles.forecast}>
            {data.forecast.forecastday.map((day, i) => (
              <div key={day.date} className={styles.forecastDay}>
                <span className={styles.dayName}>{getDayName(day.date, i)}</span>
                <img
                  src={`https:${day.day.condition.icon}`}
                  alt={day.day.condition.text}
                  className={styles.forecastIcon}
                />
                <div className={styles.forecastTemps}>
                  <span className={styles.maxTemp}>{Math.round(day.day.maxtemp_c)}°</span>
                  <span className={styles.minTemp}>{Math.round(day.day.mintemp_c)}°</span>
                </div>
                {day.day.daily_chance_of_rain > 20 && (
                  <span className={styles.rain}>🌧 {day.day.daily_chance_of_rain}%</span>
                )}
              </div>
            ))}
          </div>

          {/* Sunrise / Sunset */}
          <div className={styles.astro}>
            <span>🌅 {data.forecast.forecastday[0].astro.sunrise}</span>
            <span>🌇 {data.forecast.forecastday[0].astro.sunset}</span>
          </div>
        </>
      )}
    </div>
  )
}
