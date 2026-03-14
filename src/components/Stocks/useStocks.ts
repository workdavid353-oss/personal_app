// src/components/Stocks/useStocks.ts
import { useState, useCallback } from 'react'

const FINNHUB_KEY = import.meta.env.VITE_FINNHUB_KEY as string
const AV_KEY = import.meta.env.VITE_ALPHA_VANTAGE_KEY as string
const BASE = 'https://finnhub.io/api/v1'
const AV_BASE = 'https://www.alphavantage.co/query'

export interface StockQuote {
  price: number
  change: number
  changePct: number
  open: number
  high: number
  low: number
  prevClose: number
}

export interface StockProfile {
  name: string
  logo: string
  exchange: string
}

export interface StockMetrics {
  weekHigh52: number
  weekLow52: number
  beta: number
  forwardPE: number
  eps: number
}

export interface HistoryPoint {
  date: string
  open: number
  high: number
  low: number
  close: number
}

export interface StockData {
  quote: StockQuote
  profile: StockProfile | null
  metrics: StockMetrics | null
  history: HistoryPoint[]
  loading: boolean
  error: string | null
}

const cache: Record<string, { data: StockData; ts: number }> = {}
const CACHE_TTL = 5 * 60 * 1000

export function useStocks(favorites: string[]) {
  const [stocks, setStocks] = useState<Record<string, StockData>>({})

  const fetchStock = useCallback(async (symbol: string, force = false) => {
    const sym = symbol.toUpperCase()

    if (!force && cache[sym] && Date.now() - cache[sym].ts < CACHE_TTL) {
      setStocks(prev => ({ ...prev, [sym]: cache[sym].data }))
      return
    }
    delete cache[sym]

    setStocks(prev => ({
      ...prev,
      [sym]: { ...(prev[sym] ?? {}), loading: true, error: null } as StockData,
    }))

    try {
      const [quoteRes, profileRes, metricsRes, histRes] = await Promise.all([
        fetch(`${BASE}/quote?symbol=${sym}&token=${FINNHUB_KEY}`),
        fetch(`${BASE}/stock/profile2?symbol=${sym}&token=${FINNHUB_KEY}`),
        fetch(`${BASE}/stock/metric?symbol=${sym}&metric=all&token=${FINNHUB_KEY}`),
        fetch(`${AV_BASE}?function=TIME_SERIES_DAILY&symbol=${sym}&outputsize=compact&apikey=${AV_KEY}`),
      ])

      const [quoteJson, profileJson, metricsJson, histJson] = await Promise.all([
        quoteRes.json(),
        profileRes.json(),
        metricsRes.json(),
        histRes.json(),
      ])

      if (!quoteJson.c) throw new Error('notFound')

      const quote: StockQuote = {
        price: quoteJson.c,
        change: quoteJson.d,
        changePct: quoteJson.dp,
        open: quoteJson.o,
        high: quoteJson.h,
        low: quoteJson.l,
        prevClose: quoteJson.pc,
      }

      const profile: StockProfile | null = profileJson.name
        ? { name: profileJson.name, logo: profileJson.logo ?? '', exchange: profileJson.exchange ?? '' }
        : null

      const m = metricsJson.metric
      const metrics: StockMetrics | null = m
        ? {
            weekHigh52: m['52WeekHigh'],
            weekLow52: m['52WeekLow'],
            beta: m.beta,
            forwardPE: m.forwardPE,
            eps: m.epsTTM,
          }
        : null

      const series = histJson['Time Series (Daily)']
      const history: HistoryPoint[] = Object.entries(series ?? {})
        .slice(0, 30)
        .map(([date, val]: [string, any]) => ({
          date,
          open:  parseFloat(val['1. open']),
          high:  parseFloat(val['2. high']),
          low:   parseFloat(val['3. low']),
          close: parseFloat(val['4. close']),
        }))
        .reverse()

const data: StockData = { quote, profile, metrics, history, loading: false, error: null }
      cache[sym] = { data, ts: Date.now() }
      setStocks(prev => ({ ...prev, [sym]: data }))
    } catch (err: any) {
      setStocks(prev => ({
        ...prev,
        [sym]: { quote: null as any, profile: null, metrics: null, history: [], loading: false, error: err.message },
      }))
    }
  }, [])

  const fetchAll = useCallback(() => {
    favorites.forEach(sym => fetchStock(sym))
  }, [favorites, fetchStock])

  return { stocks, fetchStock, fetchAll }
}
