import { createClient } from 'jsr:@supabase/supabase-js';
import Wechatpay from "npm:wechatpay-axios-plugin@0.9.4";
import ShortUniqueId from "npm:short-unique-id";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const generateRefundOrderNo = () => `REF-${new Date().toISOString().slice(2,10).replace(/-/g,"")}-${new ShortUniqueId({length:8}).rnd()}`;

Deno.serve(async (req) => {
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
    const { refundId, orderNo, itemIndex, refundAmount, reason } = await req.json();

    // 验证必需参数
    if (!orderNo || itemIndex === undefined || !refundAmount) {
      return new Response(JSON.stringify({ success: false, error: '缺少必需参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // 获取微信支付配置
    const MERCHANT_ID = Deno.env.get("MERCHANT_ID");
    const MCH_CERT_SERIAL_NO = Deno.env.get("MCH_CERT_SERIAL_NO");
    const MCH_PRIVATE_KEY = Deno.env.get("MCH_PRIVATE_KEY");
    const WECHAT_PAY_PUBLIC_KEY_ID = Deno.env.get("WECHAT_PAY_PUBLIC_KEY_ID");
    const WECHAT_PAY_PUBLIC_KEY = Deno.env.get("WECHAT_PAY_PUBLIC_KEY");

    if (!MERCHANT_ID || !MCH_CERT_SERIAL_NO || !MCH_PRIVATE_KEY || !WECHAT_PAY_PUBLIC_KEY_ID || !WECHAT_PAY_PUBLIC_KEY) {
      return new Response(JSON.stringify({ success: false, error: '微信支付配置不完整' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // 检查可退款金额
    const { data: refundableAmount } = await supabaseAdmin.rpc('get_refundable_amount', {
      p_order_no: orderNo,
      p_item_index: itemIndex
    });

    if (!refundableAmount || refundableAmount < refundAmount) {
      return new Response(JSON.stringify({ success: false, error: '退款金额超过可退款金额' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // 获取订单信息
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('*')
      .eq('order_no', orderNo)
      .single();

    if (!order) {
      return new Response(JSON.stringify({ success: false, error: '订单不存在' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // 生成退款单号
    const outRefundNo = generateRefundOrderNo();

    // 更新退款记录状态
    if (refundId) {
      await supabaseAdmin
        .from('refunds')
        .update({
          refund_no: outRefundNo,
          status: 'processing',
          updated_at: new Date().toISOString()
        })
        .eq('id', refundId);
    }

    // 调用微信退款
    try {
      const wxpay = new Wechatpay({
        mchid: MERCHANT_ID,
        serial: MCH_CERT_SERIAL_NO,
        privateKey: MCH_PRIVATE_KEY,
        certs: { [WECHAT_PAY_PUBLIC_KEY_ID]: WECHAT_PAY_PUBLIC_KEY },
      });

      const notifyUrl = `${SUPABASE_URL}/functions/v1/wechat_refund_callback`;

      const { data } = await wxpay.v3.refund.domestic.refunds.post({
        out_trade_no: orderNo,
        out_refund_no: outRefundNo,
        reason: reason || "退款",
        notify_url: notifyUrl,
        amount: {
          refund: Math.round(refundAmount * 100),
          total: Math.round(order.total_amount * 100),
          currency: "CNY"
        }
      }, { headers: { "Wechatpay-Serial": WECHAT_PAY_PUBLIC_KEY_ID } });

      if (data.refund_id) {
        // 更新退款记录
        if (refundId) {
          await supabaseAdmin
            .from('refunds')
            .update({
              wechat_refund_id: data.refund_id,
              updated_at: new Date().toISOString()
            })
            .eq('id', refundId);
        }

        return new Response(JSON.stringify({ 
          success: true, 
          refundId: data.refund_id, 
          status: data.status,
          refundNo: outRefundNo
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' }
        });
      } else {
        console.error(`[WeChatRefund FAILED] outRefundNo=${outRefundNo}`);
        
        // 更新退款记录为异常
        if (refundId) {
          await supabaseAdmin
            .from('refunds')
            .update({
              status: 'abnormal',
              admin_note: '微信退款接口调用失败',
              updated_at: new Date().toISOString()
            })
            .eq('id', refundId);
        }

        return new Response(JSON.stringify({ success: false, error: "发起退款失败" }), {
          status: 500,
          headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' }
        });
      }
    } catch (err) {
      console.error(`[WeChatRefund ERROR] outRefundNo=${outRefundNo}, error=${err?.message || String(err)}`);
      
      // 更新退款记录为异常
      if (refundId) {
        await supabaseAdmin
          .from('refunds')
          .update({
            status: 'abnormal',
            admin_note: `微信退款错误: ${err?.message || String(err)}`,
            updated_at: new Date().toISOString()
          })
          .eq('id', refundId);
      }

      return new Response(JSON.stringify({ success: false, error: `微信退款错误: ${err?.message || String(err)}` }), {
        status: 500,
        headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' }
      });
    }

  } catch (err) {
    console.error('[refund_order ERROR]', err);
    return new Response(JSON.stringify({ success: false, error: err?.message || String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
});
