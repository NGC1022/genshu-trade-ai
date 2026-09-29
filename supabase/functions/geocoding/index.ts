import { createClient } from 'jsr:@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-gateway-authorization',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { address, city } = await req.json()
    const apiKey = Deno.env.get('INTEGRATIONS_API_KEY')
    
    if (!apiKey) {
      throw new Error('INTEGRATIONS_API_KEY is missing')
    }

    const url = new URL('https://app-9dlnarhqk45d-api-GaDwZ0j3erOY-gateway.appmiaoda.com/geocoding/v3/')
    url.searchParams.append('address', address)
    if (city) url.searchParams.append('city', city)
    url.searchParams.append('output', 'json')

    const response = await fetch(url.toString(), {
      headers: {
        'X-Gateway-Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      }
    })

    const data = await response.json()
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
