// MiniMax-M3 Chat Completions 服务端代理
// 密钥 INTEGRATIONS_API_KEY 仅在服务端读取，不暴露给前端。
// 三段式 JWT 走秒哒网关；普通 MiniMax API Key 直连官方 API。
// 支持文本 + 图片(image_url) 多模态输入，非流式返回

const ALLOWED_FIELDS = [
  'model',
  'messages',
  'thinking',
  'reasoning_split',
  'max_completion_tokens',
  'temperature',
  'top_p',
  'tools',
  'tool_choice',
  'response_format'
] as const

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {...CORS_HEADERS, 'Content-Type': 'application/json'}
  })
}

function normalizeToken(raw: string): string {
  return raw.trim().replace(/^['"]|['"]$/g, '').replace(/^Bearer\s+/i, '').trim()
}

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {headers: CORS_HEADERS})
  }
  if (req.method !== 'POST') {
    return json({error: 'Method Not Allowed'}, 405)
  }

  let payload: Record<string, unknown>
  try {
    const body = await req.json()
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      throw new Error('Missing or empty messages')
    }
    payload = {model: body.model || 'MiniMax-M3'}
    for (const field of ALLOWED_FIELDS) {
      if (body[field] !== undefined) payload[field] = body[field]
    }
    payload.stream = false
  } catch {
    return json({error: 'Invalid request body'}, 400)
  }

  const rawApiKey = Deno.env.get('INTEGRATIONS_API_KEYS') || Deno.env.get('INTEGRATIONS_API_KEY') || ''
  const apiKey = normalizeToken(rawApiKey)
  if (!apiKey) {
    return json({error: 'Server configuration error'}, 500)
  }
  const isMiaodaGatewayToken = apiKey.split('.').length === 3
  const upstreamUrl = isMiaodaGatewayToken
    ? 'https://app-9dlnarhqk45d-api-rLobPAn0n7m9-gateway.appmiaoda.com/v1/chat/completions'
    : 'https://api.minimax.io/v1/chat/completions'

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 25_000)
    const headers: Record<string, string> = {'Content-Type': 'application/json'}
    if (isMiaodaGatewayToken) headers['X-Gateway-Authorization'] = `Bearer ${apiKey}`
    else headers.Authorization = `Bearer ${apiKey}`
    const upstream = await fetch(upstreamUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal
    })
    clearTimeout(timeout)
    const text = await upstream.text()
    return new Response(text, {
      status: upstream.ok ? 200 : upstream.status,
      headers: {...CORS_HEADERS, 'Content-Type': 'application/json'}
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') {
      return json({error: 'AI网关响应超时，请稍后重试'}, 504)
    }
    return json({error: e instanceof Error ? e.message : 'AI服务调用失败'}, 502)
  }
})
