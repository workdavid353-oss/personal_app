import { useState, useRef } from 'react'
import type { ReactElement } from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ThemeProvider, useTheme } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { LangProvider, useLang } from './context/LangContext'
import { WidgetSettingsProvider, useWidgetSettings } from './context/WidgetSettingsContext'
import type { WidgetKey, ColKey, WidgetLayout } from './context/WidgetSettingsContext'
import { MasterPasswordProvider } from './context/MasterPasswordContext'
import { Sidebar } from './components/Sidebar/Sidebar'
import Notes from './components/Notes/Notes'
import { Clock } from './components/Clock'
import Todos from './components/todos/Todos'
import News from './components/News/News'
import Weather from './components/Weather/Weather'
import LoginPage from './pages/LoginPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import ProtectedRoute from './components/ProtectedRoute'
import { Sun, Moon, ChevronDown, Settings } from 'lucide-react'
import styles from './App.module.css'
import Stocks from './components/Stocks/Stocks'
import NewsDigest from './components/NewsDigest/NewsDigest'
import BankRates from './components/BankRates/BankRates'
import WikiWidget from './components/WikiWidget/WikiWidget'
import SpanishReader from './components/SpanishReader/SpanishReader'
import GoldItemsPage from './pages/GoldItemsPage'
import SettingsPage from './pages/SettingsPage'

// ─── Toast context / helper ───────────────────────────────────
interface ToastProps { message: string | null }
function Toast({ message }: ToastProps) {
  if (!message) return null
  return <div className="toast">{message}</div>
}

// ─── Shared app layout ────────────────────────────────────────
function AppLayout() {
  const { t } = useTranslation()
  const { lang, toggleLang } = useLang()
  const { theme, toggle: toggleTheme } = useTheme()
  const [toast, setToast] = useState<string | null>(null)

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(null), 2200)
  }

  return (
    <div className={styles.canvas}>
      <div className={styles.layout} data-rtl={lang === 'he'}>
        <Sidebar onToast={showToast} />

        <main className={styles.main}>
          <header className={styles.topbar}>
            <Clock />

            <nav className={styles.topbarNav}>
              <NavLink
                to="/"
                end
                className={({ isActive }) => `${styles.navBtn} ${isActive ? styles.navBtnActive : ''}`}
              >
                {lang === 'he' ? 'לוח' : 'Dashboard'}
              </NavLink>
              <NavLink
                to="/gold-items"
                className={({ isActive }) => `${styles.navBtn} ${isActive ? styles.navBtnActive : ''}`}
              >
                {lang === 'he' ? 'פריטי זהב' : 'Gold items'}
              </NavLink>
            </nav>

            <div className={styles.topbarRight}>
              <button
                className={styles.chip}
                onClick={toggleLang}
                title={lang === 'he' ? 'Switch to English' : 'עבור לעברית'}
              >
                {lang === 'he' ? 'EN' : 'HE'}
              </button>
              <button
                className={`${styles.chip} ${styles.chipIcon}`}
                onClick={toggleTheme}
                title={theme === 'dark' ? t('theme.toLight') : t('theme.toDark')}
              >
                {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
              </button>
              <NavLink
                to="/settings"
                className={({ isActive }) => `${styles.chip} ${styles.chipIcon} ${isActive ? styles.chipActive : ''}`}
                title={t('settings.title')}
              >
                <Settings size={14} />
              </NavLink>
            </div>
          </header>

          <div className={styles.body}>
            <Outlet />
          </div>
        </main>
      </div>

      <Toast message={toast} />
    </div>
  )
}

// ─── Dashboard ────────────────────────────────────────────────
const WIDGET_COMPONENTS: Record<WidgetKey, ReactElement> = {
  todos:      <Todos />,
  weather:    <Weather />,
  bankRates:  <BankRates />,
  newsDigest: <NewsDigest />,
  stocks:     <Stocks />,
  notes:      <Notes />,
  news:       <News />,
  wiki:         <WikiWidget />,
  spanishReader: <SpanishReader />,
}

function Dashboard() {
  const { widgets, widgetLayout, updateLayout, widgetCollapsed, toggleCollapse } = useWidgetSettings()
  const dragSrc = useRef<{ key: WidgetKey; col: ColKey } | null>(null)
  const [dragOverKey, setDragOverKey]   = useState<WidgetKey | null>(null)
  const [draggingKey, setDraggingKey]   = useState<WidgetKey | null>(null)
  const [isDragging,  setIsDragging]    = useState(false)
  const [dragOverCol, setDragOverCol]   = useState<ColKey | null>(null)

  function handleDrop(targetKey: WidgetKey | null, targetCol: ColKey) {
    if (!dragSrc.current) return
    const { key: srcKey, col: srcCol } = dragSrc.current
    if (srcKey === targetKey) return

    const next: WidgetLayout = {
      col1: [...widgetLayout.col1],
      col2: [...widgetLayout.col2],
      col3: [...widgetLayout.col3],
    }
    next[srcCol] = next[srcCol].filter(k => k !== srcKey)
    if (targetKey !== null && next[targetCol].includes(targetKey)) {
      next[targetCol].splice(next[targetCol].indexOf(targetKey), 0, srcKey)
    } else {
      next[targetCol].push(srcKey)
    }
    updateLayout(next)
  }

  function cleanup() {
    dragSrc.current = null
    setDragOverKey(null)
    setDraggingKey(null)
    setIsDragging(false)
    setDragOverCol(null)
  }

  return (
    <div className={styles.grid}>
      {(['col1', 'col2', 'col3'] as ColKey[]).map(colKey => (
        <div
          key={colKey}
          className={styles.col}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.stopPropagation(); handleDrop(null, colKey); cleanup() }}
        >
          {widgetLayout[colKey]
            .filter(key => widgets[key])
            .map(key => (
              <div
                key={key}
                className={[
                  styles.draggable,
                  dragOverKey === key ? styles.dragOver : '',
                  draggingKey === key ? styles.dragging : '',
                ].join(' ')}
                data-widget-collapsed={widgetCollapsed[key] ? 'true' : 'false'}
                draggable
                onDragStart={e => {
                  dragSrc.current = { key, col: colKey }
                  setDraggingKey(key)
                  setIsDragging(true)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragEnd={cleanup}
                onDragEnter={e => { e.stopPropagation(); setDragOverKey(key); setDragOverCol(null) }}
                onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
                onDrop={e => { e.stopPropagation(); handleDrop(key, colKey); cleanup() }}
              >
                <button
                  className={styles.collapseBtn}
                  draggable={false}
                  onClick={e => { e.stopPropagation(); toggleCollapse(key) }}
                  title={widgetCollapsed[key] ? 'Expand' : 'Collapse'}
                >
                  <ChevronDown
                    size={11}
                    className={widgetCollapsed[key] ? styles.chevronCollapsed : ''}
                  />
                </button>
                {WIDGET_COMPONENTS[key]}
              </div>
            ))}
          {isDragging && (
            <div
              className={`${styles.dropZone} ${dragOverCol === colKey ? styles.dropZoneActive : ''}`}
              onDragEnter={e => { e.stopPropagation(); setDragOverCol(colKey); setDragOverKey(null) }}
              onDragOver={e => { e.preventDefault(); e.stopPropagation() }}
              onDragLeave={() => setDragOverCol(null)}
              onDrop={e => { e.stopPropagation(); handleDrop(null, colKey); cleanup() }}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <LangProvider>
            <MasterPasswordProvider>
              <WidgetSettingsProvider>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/reset-password" element={<ResetPasswordPage />} />
                  <Route
                    element={
                      <ProtectedRoute>
                        <AppLayout />
                      </ProtectedRoute>
                    }
                  >
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/gold-items" element={<GoldItemsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Route>
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </WidgetSettingsProvider>
            </MasterPasswordProvider>
          </LangProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
