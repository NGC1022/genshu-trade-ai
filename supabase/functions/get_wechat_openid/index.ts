const APP_ID = Deno.env.get('THIRD_PARTY_LOGIN_APP_ID') || '';
const AUTHORIZATION = Deno.env.get('WX_OPEN_CFC_JWT_TOKEN') || '';
const URL = 'https://ct6gb7rg8n0rf.cfc-execute.bj.baidubce.com/get_openid';

Deno.serve(async (req: Request) => {
  // 处理CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const { code } = await req.json();

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
    });

    const data = await res.json();

    if (!data.openid) {
      console.error(`[WeChatLogin FAILED] response=${JSON.stringify(data)}`);
      return Response.json({ success: false, error: 'Failed to get openid' }, {
        headers: { 'Access-Control-Allow-Origin': '*' }
      });
    }

    console.log(`[WeChatLogin SUCCESS] openid=${data.openid}`);
    return Response.json({ success: true, openid: data.openid }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  } catch (err) {
    console.error(`[WeChatLogin ERROR] error=${err?.message || String(err)}`);
    return Response.json({ success: false, error: err?.message || String(err) }, {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
});
