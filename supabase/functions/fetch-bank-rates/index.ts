import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async () => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const res = await fetch('https://boi.org.il/PublicApi/GetExchangeRates')
  const json = await res.json()

  const rows = json.exchangeRates.map((r: any) => ({
    currency: r.key,
    rate: r.currentExchangeRate,
    unit: r.unit,
    change: r.currentChange,
    fetched_at: new Date().toISOString(),
  }))

  const { error } = await supabase
    .from('table_bank_rates')
    .upsert(rows, { onConflict: 'currency' })

  if (error) return new Response(error.message, { status: 500 })
  return new Response('OK', { status: 200 })
})
