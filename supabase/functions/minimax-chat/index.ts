// MiniMax-M3 Chat Completions 网关代理
// 密钥 INTEGRATIONS_API_KEY 仅在服务端读取，调用官方网关，不暴露给前端
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

  const apiKey = Deno.env.get('INTEGRATIONS_API_KEY')
  if (!apiKey) {
    return json({error: 'Server configuration error'}, 500)
  }

  try {
    const upstream = await fetch(
      'https://app-9dlnarhqk45d-api-rLobPAn0n7m9-gateway.appmiaoda.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Gateway-Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify(payload)
      }
    )
    const text = await upstream.text()
    return new Response(text, {
      status: upstream.ok ? 200 : 502,
      headers: {...CORS_HEADERS, 'Content-Type': 'application/json'}
    })
  } catch (e) {
    return json({error: e instanceof Error ? e.message : 'AI服务调用失败'}, 502)
  }
})
