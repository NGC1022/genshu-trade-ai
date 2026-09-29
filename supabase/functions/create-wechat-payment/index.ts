import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"
import Wechatpay, { Formatter, Rsa } from "npm:wechatpay-axios-plugin@0.9.4"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { order_no, openid, order_type = 'goods' } = await req.json()
    if (!order_no || !openid) {
      return new Response(JSON.stringify({ success: false, error: 'Missing order_no or openid' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let orderData;
    if (order_type === 'goods') {
      const { data, error } = await supabase.from('orders').select('*').eq('order_no', order_no).single()
      if (error || !data) throw new Error('Order not found')
      orderData = data
    } else {
      const { data, error } = await supabase.from('ticket_orders').select('*').eq('order_no', order_no).single()
      if (error || !data) throw new Error('Ticket order not found')
      orderData = data
    }

    if (orderData.status !== 'pending') {
      throw new Error('Order status is not pending')
    }

    const MERCHANT_ID = Deno.env.get('MERCHANT_ID') || ''
    const MERCHANT_APP_ID = Deno.env.get('MERCHANT_APP_ID') || ''
    const MCH_API_V3_KEY = Deno.env.get('MCH_API_V3_KEY') || ''
    const MCH_CERT_SERIAL_NO = Deno.env.get('MCH_CERT_SERIAL_NO') || ''
    const MCH_PRIVATE_KEY = Deno.env.get('MCH_PRIVATE_KEY') || ''
    const WECHAT_PAY_PUBLIC_KEY_ID = Deno.env.get('WECHAT_PAY_PUBLIC_KEY_ID') || ''
    const WECHAT_PAY_PUBLIC_KEY = Deno.env.get('WECHAT_PAY_PUBLIC_KEY') || ''

    const wxpay = new Wechatpay({
      mchid: MERCHANT_ID,
      serial: MCH_CERT_SERIAL_NO,
      privateKey: MCH_PRIVATE_KEY,
      certs: { [WECHAT_PAY_PUBLIC_KEY_ID]: WECHAT_PAY_PUBLIC_KEY },
    });

    const notifyUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/wechat-payment-callback`
    const description = order_type === 'goods' ? '根书文创商品购买' : '根书文创门票预订'

    const { data } = await wxpay.v3.pay.transactions.jsapi.post({
      mchid: MERCHANT_ID,
      appid: MERCHANT_APP_ID,
      description,
      out_trade_no: order_no,
      notify_url: notifyUrl,
      amount: { total: Math.round(Number(orderData.total_amount) * 100), currency: 'CNY' },
      payer: { openid },
    }, { headers: { 'Wechatpay-Serial': WECHAT_PAY_PUBLIC_KEY_ID } });

    if (data.prepay_id) {
      const nonceStr = Formatter.nonce();
      const timeStamp = '' + Formatter.timestamp();
      const packageStr = 'prepay_id=' + data.prepay_id;
      const paySign = Rsa.sign(
        Formatter.joinedByLineFeed(MERCHANT_APP_ID, timeStamp, nonceStr, packageStr),
        Rsa.from(MCH_PRIVATE_KEY)
      );

      return new Response(JSON.stringify({
        success: true,
        paymentParams: { timeStamp, nonceStr, package: packageStr, signType: 'RSA', paySign }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    } else {
      throw new Error('Failed to create prepay order')
    }

  } catch (err) {
    console.error(`[CreatePayment ERROR] error=${err?.message || String(err)}`)
    return new Response(JSON.stringify({ success: false, error: err?.message || String(err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  }
})
