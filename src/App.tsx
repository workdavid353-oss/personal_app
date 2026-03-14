import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LangProvider, useLang } from './context/LangContext'
import { ThemeToggle } from './components/ThemeToggle'
import { Sidebar } from './components/Sidebar/Sidebar'
import Notes from './components/Notes/Notes'
import { Clock } from './components/Clock'
import Todos from './components/todos/Todos'
import News from './components/News/News'
import Weather from './components/Weather/Weather'
import LoginPage from './pages/LoginPage'
import ProtectedRoute from './components/ProtectedRoute'
import { LogOut } from 'lucide-react'
import styles from './App.module.css'
import Stocks from './components/Stocks/Stocks'

function Dashboard() {
  const { user, signOut } = useAuth()
  const { t } = useTranslation()
  const { lang, toggleLang } = useLang()

  return (
    <div className={styles.layout}>
      <Sidebar />

      <main className={styles.main}>
        <header className={styles.topbar}>
          <Clock />
          <div className={styles.topbarRight}>
            {user && (
              <span className={styles.userEmail} title={user.email}>
                {user.email}
              </span>
            )}
            <button className={styles.langBtn} onClick={toggleLang} title={lang === 'he' ? 'Switch to English' : 'עבור לעברית'}>
              {lang === 'he' ? 'EN' : 'HE'}
            </button>
            <ThemeToggle />
            <button className={styles.logoutBtn} onClick={signOut} title={t('app.logout')}>
              <LogOut size={15} />
            </button>
          </div>
        </header>

        <div className={styles.body}>
          <aside className={styles.leftPanel}>
            <Todos />
            <Weather />
          </aside>

          <aside className={styles.newsPanel}>
            <News />
          </aside>

          <aside className={styles.notesPanel}>
            <Notes />
          </aside>
          <aside className={styles.stocksPanel}>
            <Stocks />
          </aside>
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <LangProvider>
            <Routes>
              <Route path="/login" element={<LoginPage />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </LangProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
