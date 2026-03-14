// src/components/Stocks/Stocks.tsx
import { useState, useEffect } from 'react'
import { Plus, RefreshCw } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useStocks } from './useStocks'
import StockCard from './StockCard'
import styles from './Stocks.module.css'

const DEFAULT_FAVORITES = ['AAPL', 'TSLA', 'NVDA']

interface DBStock { id: number; symbol: string; sort_order: number }

export default function Stocks() {
  const { user } = useAuth()
  const { t } = useTranslation()
  const [dbStocks, setDbStocks] = useState<DBStock[]>([])
  const [loading, setLoading] = useState(true)
  const [range, setRange] = useState<7 | 30>(30)
  const [input, setInput] = useState('')

  const favorites = dbStocks.map(s => s.symbol)
  const { stocks, fetchStock, fetchAll } = useStocks(favorites)

  // ── Load from Supabase ──
  useEffect(() => {
    if (!user) return
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('user_stocks')
        .select('id, symbol, sort_order')
        .eq('user_id', user!.id)
        .order('sort_order')
      if (data && data.length > 0) {
        setDbStocks(data)
      } else {
        // Seed defaults for new users
        await seedDefaults()
      }
      setLoading(false)
    }
    load()
  }, [user])

  async function seedDefaults() {
    const rows = DEFAULT_FAVORITES.map((symbol, i) => ({
      user_id: user!.id,
      symbol,
      sort_order: i,
    }))
    const { data } = await supabase.from('user_stocks').insert(rows).select('id, symbol, sort_order')
    if (data) setDbStocks(data)
  }

  // ── Fetch market data when favorites load ──
  useEffect(() => {
    if (favorites.length > 0) fetchAll()
  }, [dbStocks])

  // ── Add stock ──
  async function addStock() {
    const sym = input.trim().toUpperCase()
    if (!sym || favorites.includes(sym)) { setInput(''); return }
    const sort_order = dbStocks.length ? Math.max(...dbStocks.map(s => s.sort_order)) + 1 : 0
    const { data } = await supabase
      .from('user_stocks')
      .insert([{ user_id: user!.id, symbol: sym, sort_order }])
      .select('id, symbol, sort_order')
      .single()
    if (data) setDbStocks(prev => [...prev, data])
    setInput('')
  }

  // ── Remove stock ──
  async function removeStock(sym: string) {
    const row = dbStocks.find(s => s.symbol === sym)
    if (!row) return
    await supabase.from('user_stocks').delete().eq('id', row.id)
    setDbStocks(prev => prev.filter(s => s.symbol !== sym))
  }

  return (
    <div className={styles.container}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <span className={styles.toolbarLabel}>{t('stocks.title')}</span>

        <div className={styles.rangeBtns}>
          {([7, 30] as const).map(r => (
            <button
              key={r}
              className={`${styles.rangeBtn} ${range === r ? styles.activeRange : ''}`}
              onClick={() => setRange(r)}
            >
              {t('stocks.days', { n: r })}
            </button>
          ))}
        </div>

        <button className={styles.refreshAll} onClick={fetchAll} title={t('stocks.refreshAll')}>
          <RefreshCw size={13} />
        </button>
      </div>

      {/* Add stock */}
      <div className={styles.addRow}>
        <input
          className={styles.addInput}
          value={input}
          onChange={e => setInput(e.target.value.toUpperCase())}
          onKeyDown={e => e.key === 'Enter' && addStock()}
          placeholder={t('stocks.addPlaceholder')}
          dir="ltr"
          maxLength={10}
        />
        <button
          className={styles.addBtn}
          onClick={addStock}
          disabled={!input.trim()}
        >
          <Plus size={14} />
        </button>
      </div>

      {/* Cards */}
      <div className={styles.cardsList}>
        {loading && <div className={styles.empty}>{t('common.loading')}</div>}
        {!loading && favorites.length === 0 && (
          <div className={styles.empty}>{t('stocks.empty')}</div>
        )}
        {!loading && favorites.map(sym => (
          <StockCard
            key={sym}
            symbol={sym}
            data={stocks[sym]}
            onRemove={removeStock}
            onRefresh={fetchStock}
            range={range}
          />
        ))}
      </div>
    </div>
  )
}
