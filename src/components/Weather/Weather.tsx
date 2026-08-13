import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { CloudSun, MapPin } from 'lucide-react'
import { useWidgetSettings } from '../../context/WidgetSettingsContext'
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
const HEBREW_RE = new RegExp('[֐-׿]')

// WeatherAPI.com's location search doesn't understand Hebrew place names,
// so Hebrew queries are geocoded to lat/lon first (which WeatherAPI does accept).
async function resolveLocationQuery(input: string): Promise<string> {
  if (!HEBREW_RE.test(input)) return input
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(input)}&format=json&limit=1&accept-language=he`
    )
    if (!res.ok) return input
    const results: { lat: string; lon: string }[] = await res.json()
    if (results.length === 0) return input
    return `${results[0].lat},${results[0].lon}`
  } catch {
    return input
  }
}

// ─── Main Component ───────────────────────────────────────────
export default function Weather() {
  const { t } = useTranslation()
  const { widgetPrefs, prefsLoaded } = useWidgetSettings()

  const DAYS = t('weather.days', { returnObjects: true }) as string[]


  // הערכת מצב הים לפי מהירות רוח (בופורט מפושט)
  function seaState(wind_kph: number): { label: string; color: string } {
    if (wind_kph < 6)  return { label: t('weather.calmSea'), color: '#22c55e' }
    if (wind_kph < 12) return { label: t('weather.lightSea'), color: '#86efac' }
    if (wind_kph < 20) return { label: t('weather.lightModerateSea'), color: '#fde047' }
    if (wind_kph < 30) return { label: t('weather.moderateSea'), color: '#fb923c' }
    if (wind_kph < 40) return { label: t('weather.roughSea'), color: '#f87171' }
    return { label: t('weather.veryRoughSea'), color: '#dc2626' }
  }

  function getDayName(dateStr: string, index: number): string {
    if (index === 0) return t('weather.today')
    if (index === 1) return t('weather.tomorrow')
    const d = new Date(dateStr)
    return DAYS[d.getDay()]
  }

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
      const resolvedQuery = await resolveLocationQuery(locationQuery)
      const res = await fetch(
        `https://api.weatherapi.com/v1/forecast.json?key=${API_KEY}&q=${encodeURIComponent(resolvedQuery)}&days=5&lang=he`
      )
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error?.message || t('weather.errorLoading'))
      }
      const json: WeatherData = await res.json()
      setData(json)
      setActiveLocation(resolvedQuery)
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
      setError(t('weather.noGeolocation'))
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
        setError(t('weather.cannotGetLocation'))
        setGeoLoading(false)
      }
    )
  }

  // ── load on mount ──
  useEffect(() => {
    if (!prefsLoaded) return
    const defaultLocation = widgetPrefs.weather?.defaultLocation?.trim()
    if (defaultLocation) {
      fetchWeather(defaultLocation)
    } else if (favorites.length > 0) {
      fetchWeather(favorites[0].name)
    } else {
      fetchByLocation()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefsLoaded])

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

  const subtitle = data ? data.location.name : 'today'

  return (
    <div
      className="card card-accent"
      style={{ '--accent': 'var(--sky)', '--accent-soft': 'var(--sky-soft)' } as React.CSSProperties}
    >
      <div className="card-head">
        <span className="card-tag"><CloudSun size={16} /></span>
        <span className="card-title">{t('weather.title', 'Weather')}</span>
        <span className="card-subtitle">{subtitle}</span>
        <div className="card-tools">
          <button className="tool" onClick={fetchByLocation} disabled={geoLoading} title={t('weather.currentLocation')}>
            <MapPin size={14} />
          </button>
        </div>
      </div>

      {/* ── Search ── */}
      <div className={styles.searchRow}>
        <input
          className={styles.input}
          placeholder={t('weather.searchPlaceholder')}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') fetchWeather(query) }}
        />
        <button className={styles.searchBtn} onClick={() => fetchWeather(query)}>{t('common.search')}</button>
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
                title={t('weather.removeFavorite')}
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
                placeholder={t('weather.displayNamePlaceholder', { name: data.location.name })}
                value={newLabel}
                onChange={e => setNewLabel(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') addFavorite() }}
                autoFocus
              />
              <button className={styles.searchBtn} onClick={addFavorite}>{t('common.save')}</button>
              <button className={styles.cancelBtn} onClick={() => setShowAddForm(false)}>{t('common.cancel')}</button>
            </>
          ) : (
            <button className={styles.addFavBtn} onClick={() => setShowAddForm(true)}>
              {t('weather.addFavorite')}
            </button>
          )}
        </div>
      )}

      {/* ── States ── */}
      {loading && <div className={styles.empty}>{t('common.loading')}</div>}
      {error && <div className={styles.errorMsg}>{error}</div>}

      {/* Main weather */}
      {data && !loading && (
        <>
          <div className={styles.hero}>
            <div className={styles.temp}>
              {Math.round(data.current.temp_c)}<sup>°</sup>
            </div>
            <div className={styles.meta}>
              <div className={styles.cityName}>{data.location.name}</div>
              <div className={styles.conditionText}>{data.current.condition.text} · {t('weather.feelsLike', { temp: Math.round(data.current.feelslike_c) })}</div>
            </div>
          </div>

          <div className={styles.forecast}>
            {data.forecast.forecastday.map((day, i) => (
              <div key={day.date} className={styles.forecastDay} data-today={i === 0}>
                <span className={styles.dayName}>{getDayName(day.date, i)}</span>
                <img src={`https:${day.day.condition.icon}`} alt={day.day.condition.text} className={styles.forecastIcon} />
                <div className={styles.forecastTemps}>
                  <span className={styles.maxTemp}>{Math.round(day.day.maxtemp_c)}°</span>
                  <span className={styles.minTemp}>{Math.round(day.day.mintemp_c)}°</span>
                </div>
              </div>
            ))}
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.stat}>
              <span className={styles.statLabel}>{t('weather.wind', 'Wind')}</span>
              <span className={styles.statVal}>{Math.round(data.current.wind_kph)} {t('weather.kmh', 'km/h')}</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>{t('weather.humidity', 'Humidity')}</span>
              <span className={styles.statVal}>{data.current.humidity}%</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statLabel}>UV</span>
              <span className={styles.statVal}>{data.current.uv}</span>
            </div>
          </div>

          {sea && (
            <div className={styles.seaRow} style={{ '--sea-color': sea.color } as React.CSSProperties}>
              <span>🌊</span>
              <span className={styles.seaLabel}>{sea.label}</span>
              <span className={styles.seaNote}>{t('weather.seaByWind')}</span>
            </div>
          )}
        </>
      )}

    </div>
  )
}
