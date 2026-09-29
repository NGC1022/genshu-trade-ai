import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { code } = await req.json()
    if (!code) {
      return new Response(JSON.stringify({ success: false, error: 'Missing code' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    const APP_ID = Deno.env.get('THIRD_PARTY_LOGIN_APP_ID') || ''
    const AUTHORIZATION = Deno.env.get('WX_OPEN_CFC_JWT_TOKEN') || ''
    const URL = 'https://ct6gb7rg8n0rf.cfc-execute.bj.baidubce.com/get_openid'

    const res = await fetch(URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': AUTHORIZATION
      },
      body: JSON.stringify({
        appid: APP_ID,
        jscode: code
      })
    })

    const data = await res.json()

    if (!data.openid) {
      console.error(`[WeChatLogin FAILED] response=${JSON.stringify(data)}`)
      return new Response(JSON.stringify({ success: false, error: 'Failed to get openid' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    }

    console.log(`[WeChatLogin SUCCESS] openid=${data.openid}`)
    return new Response(JSON.stringify({ success: true, openid: data.openid }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  } catch (err) {
    console.error(`[WeChatLogin ERROR] error=${err?.message || String(err)}`)
    return new Response(JSON.stringify({ success: false, error: err?.message || String(err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500
    })
  }
})
