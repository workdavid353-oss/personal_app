import { useState, useEffect, useCallback } from 'react'
import { Coins, RefreshCw, ChevronDown, TrendingUp, TrendingDown, Minus, Calculator, Scale } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import styles from './GoldPriceSummary.module.css'

interface GoldPriceSummary {
  karat: number
  currency: string
  price: number
  prev_price: number | null
  change: number | null
  change_pct: number | null
  fetched_at: string
}

function fmt(n: number) {
  return n.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function GoldPriceSummary() {
  const [rows, setRows] = useState<GoldPriceSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)
  const [calcWeight, setCalcWeight] = useState('')
  const [calcKarat, setCalcKarat] = useState<number | null>(null)

  const fetchSummary = useCallback(async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('get_gold_price_summary')
    if (!error && data) {
      const fetched = data as GoldPriceSummary[]
      setRows(fetched)
      setCalcKarat(prev => prev ?? fetched[0]?.karat ?? null)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchSummary() }, [fetchSummary])

  const latestFetch = rows.reduce<string | null>((max, r) =>
    !max || r.fetched_at > max ? r.fetched_at : max, null)

  const selectedRow = rows.find(r => r.karat === calcKarat)
  let calcResult = ''
  if (selectedRow && calcWeight !== '') {
    const weight = parseFloat(calcWeight)
    if (!isNaN(weight)) calcResult = fmt(weight * selectedRow.price)
  }

  if (!loading && rows.length === 0) return null

  return (
    <div
      className="card card-accent"
      style={{ '--accent': 'var(--sun)', '--accent-soft': 'var(--sun-soft)' } as React.CSSProperties}
    >
      <div className="card-head">
        <span className="card-tag"><Coins size={16} /></span>
        <span className="card-title">Gold Price</span>
        <span className="card-subtitle">₪ per gram</span>
        <div className="card-tools">
          {latestFetch && !collapsed && (
            <span className={styles.updatedAt}>
              {new Date(latestFetch).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button className="tool" onClick={fetchSummary} disabled={loading} title="Refresh">
            <RefreshCw size={13} className={loading ? styles.spin : ''} />
          </button>
          <button
            className="tool"
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expand' : 'Collapse'}
          >
            <ChevronDown size={14} className={`${styles.chevron} ${collapsed ? styles.chevronCollapsed : ''}`} />
          </button>
        </div>
      </div>

      {!collapsed && (
        <div className={styles.strip}>
          {rows.map(row => {
            const isUp = (row.change ?? 0) > 0
            const isDown = (row.change ?? 0) < 0
            return (
              <div key={`${row.karat}-${row.currency}`} className={styles.tile}>
                <span className={styles.karat}>{row.karat}K</span>
                <span className={styles.price}>₪{fmt(row.price)}</span>
                <span className={`${styles.change} ${isUp ? styles.up : isDown ? styles.down : styles.flat}`}>
                  {isUp ? <TrendingUp size={11} /> : isDown ? <TrendingDown size={11} /> : <Minus size={11} />}
                  {row.change !== null ? Math.abs(row.change).toFixed(2) : '—'}
                  {row.change_pct !== null && ` (${row.change_pct > 0 ? '+' : ''}${row.change_pct}%)`}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {!collapsed && rows.length > 0 && (
        <div className={styles.calcBox}>
          <div className={styles.calcLabel}>
            <Calculator size={12} /> Value calculator
          </div>
          <div className={styles.calcRow}>
            <div className={styles.calcField}>
              <span className={styles.calcFieldLabel}>Weight</span>
              <div className={styles.calcInputWrap}>
                <Scale size={13} className={styles.calcInputIcon} />
                <input
                  className={styles.calcInput}
                  type="number"
                  min="0"
                  placeholder="0"
                  value={calcWeight}
                  onChange={e => setCalcWeight(e.target.value)}
                  dir="ltr"
                />
                <span className={styles.calcInputUnit}>g</span>
              </div>
            </div>

            <div className={styles.calcField}>
              <span className={styles.calcFieldLabel}>Purity</span>
              <select
                className={styles.calcSelect}
                value={calcKarat ?? ''}
                onChange={e => setCalcKarat(Number(e.target.value))}
              >
                {rows.map(row => (
                  <option key={row.karat} value={row.karat}>{row.karat}K</option>
                ))}
              </select>
            </div>

            <span className={styles.calcEquals}>=</span>

            <div className={styles.calcResult}>
              <span className={styles.calcResultNum}>
                <span className={styles.calcResultCcy}>₪</span>{calcResult || '—'}
              </span>
              {selectedRow && (
                <span className={styles.calcHint}>at ₪{fmt(selectedRow.price)}/g · {selectedRow.karat}K</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
