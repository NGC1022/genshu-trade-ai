import {createClient} from 'npm:@supabase/supabase-js@2'
import {fetchWtoTradeRows, WTO_DATASET_URL, type WtoTradeRow} from '../_shared/wto-data.ts'

const DATASET_KEY = 'wto-digitally-delivered-services'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
}

type CachedDataset = {data: WtoTradeRow[]; fetched_at: string}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {status, headers: {...CORS_HEADERS, 'Content-Type': 'application/json'}})
}

function getAdminClient() {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return null
  return createClient(url, key, {auth: {persistSession: false, autoRefreshToken: false}})
}

async function readCurrentCache(): Promise<CachedDataset | null> {
  const admin = getAdminClient()
  if (!admin) return null
  const {data, error} = await admin
    .from('trade_data_versions')
    .select('data,fetched_at')
    .eq('dataset_key', DATASET_KEY)
    .eq('is_current', true)
    .order('fetched_at', {ascending: false})
    .limit(1)
    .maybeSingle()
  if (error || !data || !Array.isArray(data.data) || !data.data.length || typeof data.fetched_at !== 'string') return null
  return {data: data.data as WtoTradeRow[], fetched_at: data.fetched_at}
}

async function saveCurrentVersion(rows: WtoTradeRow[], fetchedAt: string) {
  const admin = getAdminClient()
  if (!admin) return false
  const latestYear = Math.max(...rows.map((item) => item.year))
  const {data: version, error: insertError} = await admin
    .from('trade_data_versions')
    .insert({
      source_document_id: null,
      dataset_key: DATASET_KEY,
      version_label: `${latestYear}-${fetchedAt.slice(0, 10)}`,
      fetched_at: fetchedAt,
      row_count: rows.length,
      data: rows,
      is_current: true
    })
    .select('id')
    .single()
  if (insertError || !version?.id) return false
  await admin
    .from('trade_data_versions')
    .update({is_current: false})
    .eq('dataset_key', DATASET_KEY)
    .neq('id', version.id)
  return true
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', {headers: CORS_HEADERS})
  if (req.method !== 'POST' && req.method !== 'GET') return json({error: 'Method Not Allowed'}, 405)

  let cached: CachedDataset | null = null
  try {
    cached = await readCurrentCache()
  } catch {
    // Continue with the official public dataset if cache storage is temporarily unavailable.
  }
  if (cached && Date.now() - Date.parse(cached.fetched_at) < CACHE_TTL_MS) {
    const latestYear = Math.max(...cached.data.map((item) => item.year))
    return json({
      source: WTO_DATASET_URL,
      publisher: 'World Trade Organization',
      fetched_at: cached.fetched_at,
      latest_year: latestYear,
      cache_hit: true,
      stale: false,
      data: cached.data
    })
  }

  const fetchedAt = new Date().toISOString()
  try {
    const rows = await fetchWtoTradeRows(fetchedAt)
    try {
      await saveCurrentVersion(rows, fetchedAt)
    } catch {
      // Live data remains usable even if persisting the cache fails.
    }
    const latestYear = Math.max(...rows.map((item) => item.year))
    return json({
      source: WTO_DATASET_URL,
      publisher: 'World Trade Organization',
      fetched_at: fetchedAt,
      latest_year: latestYear,
      cache_hit: false,
      stale: false,
      data: rows
    })
  } catch {
    if (cached) {
      const latestYear = Math.max(...cached.data.map((item) => item.year))
      return json({
        source: WTO_DATASET_URL,
        publisher: 'World Trade Organization',
        fetched_at: cached.fetched_at,
        latest_year: latestYear,
        cache_hit: true,
        stale: true,
        warning: 'WTO refresh failed; showing the last cached dataset',
        data: cached.data
      })
    }
    return json({error: 'WTO data refresh failed and no cached dataset is available', source: WTO_DATASET_URL}, 502)
  }
})
