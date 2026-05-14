import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, ExternalLink, ArrowUpDown, ArrowUp, ArrowDown, Gem } from 'lucide-react'
import { supabase } from '../lib/supabase'
import styles from './GoldItemsPage.module.css'

interface GoldDeal {
  description: string
  price: number
  real_price: number
  delta: number
  karats: string
  weight: number
  url: string | null
}

type SortKey = keyof GoldDeal
type SortDir = 'asc' | 'desc'

function fmt(n: number) {
  return n.toLocaleString('he-IL', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function GoldItemsPage() {
  const [items, setItems] = useState<GoldDeal[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('delta')
  const [sortDir, setSortDir] = useState<SortDir>('desc')

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.rpc('get_gold_deals').limit(1000)
      if (error) {
        setError(error.message)
      } else {
        setItems(data as GoldDeal[])
        setLastRefreshed(new Date())
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch data')
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('desc')
    }
  }

  const sorted = [...items].sort((a, b) => {
    const av = a[sortKey]
    const bv = b[sortKey]
    if (av == null) return 1
    if (bv == null) return -1
    const cmp = av < bv ? -1 : av > bv ? 1 : 0
    return sortDir === 'asc' ? cmp : -cmp
  })

  function SortIcon({ col }: { col: SortKey }) {
    if (sortKey !== col) return <ArrowUpDown size={11} className={styles.sortInactive} />
    return sortDir === 'asc' ? <ArrowUp size={11} /> : <ArrowDown size={11} />
  }

  const columns: { key: SortKey; label: string; numeric?: boolean }[] = [
    { key: 'description', label: 'Description' },
    { key: 'karats',      label: 'Karats' },
    { key: 'weight',      label: 'Weight (g)', numeric: true },
    { key: 'price',       label: 'Listed (₪)',  numeric: true },
    { key: 'real_price',  label: 'Gold Value (₪)', numeric: true },
    { key: 'delta',       label: 'Profit (₪)',  numeric: true },
  ]

  return (
    <div className={styles.content}>
      <div
        className="card card-accent"
        style={{ '--accent': 'var(--sun)', '--accent-soft': 'var(--sun-soft)' } as React.CSSProperties}
      >
        <div className="card-head">
          <span className="card-tag"><Gem size={16} /></span>
          <span className="card-title">Gold Deals</span>
          <span className="card-subtitle">listed below gold value</span>
          <div className="card-tools">
            {lastRefreshed && (
              <span className={styles.refreshedAt}>
                {lastRefreshed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
            )}
            <button className="tool" onClick={fetchItems} disabled={loading} title="Refresh">
              <RefreshCw size={13} className={loading ? styles.spin : ''} />
            </button>
          </div>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {!error && (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  {columns.map(col => (
                    <th
                      key={col.key}
                      className={`${styles.th} ${col.numeric ? styles.thNum : ''}`}
                      onClick={() => handleSort(col.key)}
                    >
                      <span className={styles.thInner}>
                        {col.label}
                        <SortIcon col={col.key} />
                      </span>
                    </th>
                  ))}
                  <th className={styles.th}>Link</th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={7} className={styles.loadingRow}>Loading…</td>
                  </tr>
                )}
                {!loading && sorted.length === 0 && (
                  <tr>
                    <td colSpan={7} className={styles.emptyRow}>No deals found</td>
                  </tr>
                )}
                {!loading && sorted.map((item, i) => (
                  <tr key={i} className={styles.tr}>
                    <td className={styles.td}>{item.description}</td>
                    <td className={`${styles.td} ${styles.tdMono}`}>{item.karats}</td>
                    <td className={`${styles.td} ${styles.tdMono} ${styles.tdNum}`}>{item.weight}g</td>
                    <td className={`${styles.td} ${styles.tdMono} ${styles.tdNum}`}>₪{fmt(item.price)}</td>
                    <td className={`${styles.td} ${styles.tdMono} ${styles.tdNum}`}>₪{fmt(item.real_price)}</td>
                    <td className={`${styles.td} ${styles.tdMono} ${styles.tdNum} ${styles.profit}`}>
                      +₪{fmt(item.delta)}
                    </td>
                    <td className={styles.td}>
                      {item.url ? (
                        <a href={item.url} target="_blank" rel="noopener noreferrer" className={styles.link}>
                          <ExternalLink size={13} />
                        </a>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && !error && sorted.length > 0 && (
          <div className={styles.footer}>{sorted.length} deals</div>
        )}
      </div>
    </div>
  )
}
