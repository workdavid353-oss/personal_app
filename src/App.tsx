import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { LangProvider, useLang } from './context/LangContext'
import { WidgetSettingsProvider, useWidgetSettings } from './context/WidgetSettingsContext'
import { MasterPasswordProvider } from './context/MasterPasswordContext'
import { ThemeToggle } from './components/ThemeToggle'
import { Sidebar } from './components/Sidebar/Sidebar'
import Notes from './components/Notes/Notes'
import { Clock } from './components/Clock'
import Todos from './components/todos/Todos'
import News from './components/News/News'
import Weather from './components/Weather/Weather'
import LoginPage from './pages/LoginPage'
import ProtectedRoute from './components/ProtectedRoute'
import { LogOut, UserCircle } from 'lucide-react'
import styles from './App.module.css'
import Stocks from './components/Stocks/Stocks'
import NewsDigest from './components/NewsDigest/NewsDigest'
import BankRates from './components/BankRates/BankRates'

function Dashboard() {
  const { user, signOut } = useAuth()
  const { t } = useTranslation()
  const { lang, toggleLang } = useLang()
  const { widgets } = useWidgetSettings()

  return (
    <div className={styles.layout}>
      <Sidebar />

      <main className={styles.main}>
        <header className={styles.topbar}>
          <Clock />
          <div className={styles.topbarRight}>
            {user && (
              <span className={styles.userEmail} title={user.email}>
                <UserCircle size={16} />
                <span className={styles.userName}>{user.email?.split('@')[0]}</span>
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
          {(widgets.todos || widgets.weather || widgets.bankRates) && (
            <div className={styles.widgetColumn}>
              {widgets.todos && <Todos />}
              {widgets.weather && <Weather />}
              {widgets.bankRates && <BankRates />}
            </div>
          )}
          {widgets.newsDigest && (
            <div className={styles.widgetNews}><NewsDigest /></div>
          )}
          {widgets.stocks && (
            <div className={styles.widgetStocks}><Stocks /></div>
          )}
          {(widgets.notes || widgets.news) && (
            <div className={styles.widgetColumn}>
              {widgets.notes && <Notes />}
              {widgets.news && <News />}
            </div>
          )}
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
            <MasterPasswordProvider>
            <WidgetSettingsProvider>
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
            </WidgetSettingsProvider>
            </MasterPasswordProvider>
          </LangProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
