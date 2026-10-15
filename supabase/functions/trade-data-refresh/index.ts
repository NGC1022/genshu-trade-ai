import {createClient} from 'npm:@supabase/supabase-js@2'
import {fetchWtoTradeRows} from '../_shared/wto-data.ts'

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-refresh-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
}
const SOURCES = [
  {
    sourceKey: 'wto-digitally-delivered-services',
    sourceName: 'WTO Digitally Delivered Services Trade Dataset',
    publisher: 'World Trade Organization',
    sourceUrl: 'https://data.wto.org/en/dataset/dideliveredservices',
    documentType: 'statistics'
  },
  {
    sourceKey: 'unctad-digital-services',
    sourceName: 'UNCTAD International trade in digitally deliverable services',
    publisher: 'UNCTAD',
    sourceUrl: 'https://unctadstat.unctad.org/datacentre/reportInfo/US.DigitallyDeliverableServices',
    documentType: 'statistics'
  },
  {
    sourceKey: 'wto-ecommerce-policy',
    sourceName: 'WTO Electronic Commerce policy and negotiations',
    publisher: 'World Trade Organization',
    sourceUrl: 'https://www.wto.org/english/tratop_e/ecom_e/ecom_e.htm',
    documentType: 'policy'
  }
] as const

const supabaseUrl = Deno.env.get('SUPABASE_URL')
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
const supabase = supabaseUrl && serviceKey ? createClient(supabaseUrl, serviceKey) : null

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {status, headers: {...CORS_HEADERS, 'Content-Type': 'application/json'}})
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function stripHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

async function upsertDocument(source: (typeof SOURCES)[number], body: string, fetchedAt: string) {
  if (!supabase) throw new Error('Supabase service environment is not configured')
  const contentHash = await sha256(body)
  const {data: existing, error: lookupError} = await supabase
    .from('trade_source_documents')
    .select('id,content_hash')
    .eq('source_key', source.sourceKey)
    .eq('is_current', true)
    .maybeSingle()
  if (lookupError) throw lookupError
  if (existing?.content_hash === contentHash) return {changed: false, id: existing.id}

  if (existing?.id) {
    const {error: retireError} = await supabase
      .from('trade_source_documents')
      .update({is_current: false})
      .eq('id', existing.id)
    if (retireError) throw retireError
  }

  const cleaned = stripHtml(body)
  const {data, error} = await supabase
    .from('trade_source_documents')
    .insert({
      source_key: source.sourceKey,
      source_name: source.sourceName,
      publisher: source.publisher,
      source_url: source.sourceUrl,
      document_type: source.documentType,
      content_hash: contentHash,
      fetched_at: fetchedAt,
      title: source.sourceName,
      summary: cleaned.slice(0, 1200),
      raw_excerpt: cleaned.slice(0, 6000),
      is_current: true
    })
    .select('id')
    .single()
  if (error) throw error

  if (existing?.id) {
    const {error: staleError} = await supabase
      .from('ai_trade_analysis_runs')
      .update({freshness_status: 'stale', stale_reason: `${source.sourceName} 出现新版本`, refreshed_at: null})
      .contains('source_document_ids', [existing.id])
    if (staleError) throw staleError
  }
  return {changed: true, id: data.id}
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', {headers: CORS_HEADERS})
  if (req.method !== 'POST') return json({ok: false, error: 'Method Not Allowed'}, 405)

  const refreshSecret = Deno.env.get('TRADE_REFRESH_SECRET')
  if (!refreshSecret) return json({ok: false, error: 'Refresh secret is not configured'}, 503)
  if (req.headers.get('x-refresh-secret') !== refreshSecret) return json({ok: false, error: 'Refresh authorization failed'}, 401)
  if (!supabase) return json({ok: false, error: 'Supabase service environment is not configured'}, 503)

  try {
    const fetchedAt = new Date().toISOString()
    const results: Record<string, unknown>[] = []
    for (const source of SOURCES) {
      const response = await fetch(source.sourceUrl, {
        headers: {'User-Agent': 'genshu-trade-ai/1.0', Accept: 'text/html,application/xhtml+xml'}
      })
      if (!response.ok) throw new Error(`${source.sourceKey} fetch failed (${response.status})`)
      const body = await response.text()
      results.push({...source, ...(await upsertDocument(source, body, fetchedAt))})
    }

    const rows = await fetchWtoTradeRows(fetchedAt)
    const {data: version, error: versionError} = await supabase
      .from('trade_data_versions')
      .insert({
        source_document_id: results.find((item) => item.sourceKey === 'wto-digitally-delivered-services')?.id || null,
        dataset_key: 'wto-digitally-delivered-services',
        version_label: `${Math.max(...rows.map((item) => item.year))}-${fetchedAt.slice(0, 10)}`,
        fetched_at: fetchedAt,
        row_count: rows.length,
        data: rows,
        is_current: true
      })
      .select('id')
      .single()
    if (versionError) throw versionError

    const {error: retireError} = await supabase
      .from('trade_data_versions')
      .update({is_current: false})
      .eq('dataset_key', 'wto-digitally-delivered-services')
      .neq('id', version.id)
    if (retireError) throw retireError

    return json({ok: true, fetched_at: fetchedAt, rows: rows.length, changed_sources: results.filter((item) => item.changed).map((item) => item.sourceKey)})
  } catch {
    return json({ok: false, error: 'Official source refresh failed; previous data was retained'}, 502)
  }
})
