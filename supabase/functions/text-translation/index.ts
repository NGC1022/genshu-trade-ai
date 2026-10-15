const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json'
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {status, headers: CORS_HEADERS})
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') return new Response(null, {status: 204, headers: CORS_HEADERS})
  if (req.method !== 'POST') return json({error: 'Method Not Allowed'}, 405)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return json({error: 'Invalid request body'}, 400)
  }

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return json({error: 'Invalid request body'}, 400)
  }
  const payload = body as Record<string, unknown>
  const q = typeof payload.q === 'string' ? payload.q.trim() : ''
  const from = typeof payload.from === 'string' ? payload.from.trim() : ''
  const to = typeof payload.to === 'string' ? payload.to.trim() : ''

  if (!q || q.length > 5000) return json({error: 'Text is required and must be 5,000 characters or fewer'}, 400)
  if (!/^(auto|zh|en|ja|ko)$/.test(from) || !/^(zh|en|ja|ko)$/.test(to) || from === to) {
    return json({error: 'Unsupported language pair'}, 400)
  }

  const apiKey = Deno.env.get('INTEGRATIONS_API_KEY')
  if (!apiKey) return json({error: 'Translation service is not configured'}, 503)

  try {
    const upstream = await fetch('https://app-9dlnarhqk45d-api-e94GZ5j0PWpa-gateway.appmiaoda.com/rpc/2.0/mt/texttrans/v1', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        'X-Gateway-Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({q, from, to}),
      signal: AbortSignal.timeout(20_000)
    })

    if (upstream.status === 429 || upstream.status === 402) {
      return json({error: 'Translation service is temporarily unavailable'}, upstream.status)
    }
    if (!upstream.ok) return json({error: 'Translation provider request failed'}, 502)

    const data = await upstream.json()
    if (data?.error_code || !Array.isArray(data?.result?.trans_result)) {
      return json({error: 'Translation provider returned an invalid response'}, 502)
    }
    return json(data)
  } catch {
    return json({error: 'Translation provider is unavailable'}, 502)
  }
})
