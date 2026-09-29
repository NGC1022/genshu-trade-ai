import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7"
import Wechatpay from "npm:wechatpay-axios-plugin@0.9.4"
import ShortUniqueId from "npm:short-unique-id"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { order_no, item_index, refund_amount, reason, refund_id } = await req.json()
    if (!order_no || refund_amount === undefined) {
      return new Response(JSON.stringify({ success: false, error: 'Missing parameters' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 验证可退款金额
    const { data: refundable, error: refundableError } = await supabase.rpc('get_refundable_amount', {
      p_order_no: order_no,
      p_item_index: item_index
    })

    if (refundableError || Number(refundable) < refund_amount) {
      throw new Error(`Insufficient refundable amount: ${refundable}`)
    }

    const { data: orderData, error: orderError } = await supabase.from('orders').select('*').eq('order_no', order_no).single()
    if (orderError || !orderData) throw new Error('Order not found')

    const generateRefundOrderNo = () => `REF-${new Date().toISOString().slice(2, 10).replace(/-/g, "")}-${new ShortUniqueId({ length: 8 }).rnd()}`
    const outRefundNo = generateRefundOrderNo()

    const MERCHANT_ID = Deno.env.get('MERCHANT_ID') || ''
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

    const notifyUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/wechat-refund-callback`

    const { data } = await wxpay.v3.refund.domestic.refunds.post({
      out_trade_no: order_no,
      out_refund_no: outRefundNo,
      reason: reason || "退款",
      notify_url: notifyUrl,
      amount: {
        refund: Math.round(refund_amount * 100),
        total: Math.round(Number(orderData.total_amount) * 100),
        currency: "CNY"
      }
    }, { headers: { "Wechatpay-Serial": WECHAT_PAY_PUBLIC_KEY_ID } });

    if (data.refund_id) {
      // 如果提供了 refund_id（用户申请的退款），更新其状态
      if (refund_id) {
        await supabase.from('refunds').update({
          refund_no: outRefundNo,
          status: 'processing',
          wechat_refund_id: data.refund_id,
          updated_at: NOW()
        }).eq('id', refund_id)
      } else {
        // 后台直接发起的退款，创建记录
        await supabase.from('refunds').insert({
          refund_no: outRefundNo,
          order_no: order_no,
          item_index: item_index,
          user_id: orderData.user_id,
          initiated_by: 'admin',
          status: 'processing',
          refund_amount: refund_amount,
          refund_quantity: 0, // 后台退款通常不指定数量或按金额退
          wechat_refund_id: data.refund_id,
          reason: reason
        })
      }

      return new Response(JSON.stringify({ success: true, refundId: data.refund_id, status: data.status }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      })
    } else {
      throw new Error('Failed to create refund order')
    }

  } catch (err) {
    console.error(`[RefundOrder ERROR] error=${err?.message || String(err)}`)
    return new Response(JSON.stringify({ success: false, error: err?.message || String(err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  }
})
