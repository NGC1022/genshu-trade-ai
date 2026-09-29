// 百度翻译 Edge Function：服务端持有 INTEGRATIONS_API_KEY，前端不接触密钥
// 入参 { q, from, to }，返回百度翻译 result
import {serve} from 'https://deno.land/std/http/server.ts'

serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', {status: 405})
  }

  let q = ''
  let from = ''
  let to = ''
  try {
    const body = await req.json()
    q = body.q
    from = body.from
    to = body.to
    if (!q) throw new Error('Missing q')
    if (!from) throw new Error('Missing from')
    if (!to) throw new Error('Missing to')
  } catch {
    return new Response(JSON.stringify({error: 'Invalid request body'}), {
      status: 400,
      headers: {'Content-Type': 'application/json'}
    })
  }

  const apiKey = Deno.env.get('INTEGRATIONS_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({error: 'Server configuration error'}), {
      status: 500,
      headers: {'Content-Type': 'application/json'}
    })
  }

  const upstream = await fetch(
    'https://app-9dlnarhqk45d-api-e94GZ5j0PWpa-gateway.appmiaoda.com/rpc/2.0/mt/texttrans/v1',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=utf-8',
        'X-Gateway-Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({q, from, to})
    }
  )

  if (upstream.status === 429 || upstream.status === 402) {
    const errText = await upstream.text()
    return new Response(errText, {
      status: upstream.status,
      headers: {'Content-Type': 'application/json'}
    })
  }

  if (!upstream.ok) {
    return new Response(JSON.stringify({error: `Upstream error: ${upstream.status}`}), {
      status: 502,
      headers: {'Content-Type': 'application/json'}
    })
  }

  const data = await upstream.json()
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: {'Content-Type': 'application/json'}
  })
})
