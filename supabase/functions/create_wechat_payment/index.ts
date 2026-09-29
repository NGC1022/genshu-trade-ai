import { createClient } from 'jsr:@supabase/supabase-js';
import Wechatpay, { Formatter, Rsa } from "npm:wechatpay-axios-plugin@0.9.4";
import ShortUniqueId from "npm:short-unique-id";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

const generateOrderNo = () => `ORD-${new Date().toISOString().slice(2,10).replace(/-/g,"")}-${new ShortUniqueId({length:8}).rnd()}`;

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
    const { orderType, orderData, openid } = await req.json();

    // 验证必需参数
    if (!orderType || !orderData || !openid) {
      return new Response(JSON.stringify({ success: false, error: '缺少必需参数' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // 获取微信支付配置
    const MERCHANT_ID = Deno.env.get("MERCHANT_ID");
    const MERCHANT_APP_ID = Deno.env.get("MERCHANT_APP_ID");
    const MCH_CERT_SERIAL_NO = Deno.env.get("MCH_CERT_SERIAL_NO");
    const MCH_PRIVATE_KEY = Deno.env.get("MCH_PRIVATE_KEY");
    const WECHAT_PAY_PUBLIC_KEY_ID = Deno.env.get("WECHAT_PAY_PUBLIC_KEY_ID");
    const WECHAT_PAY_PUBLIC_KEY = Deno.env.get("WECHAT_PAY_PUBLIC_KEY");

    if (!MERCHANT_ID || !MERCHANT_APP_ID || !MCH_CERT_SERIAL_NO || !MCH_PRIVATE_KEY || !WECHAT_PAY_PUBLIC_KEY_ID || !WECHAT_PAY_PUBLIC_KEY) {
      return new Response(JSON.stringify({ success: false, error: '微信支付配置不完整，请在插件中心配置相关密钥' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    const outTradeNo = generateOrderNo();
    let totalAmount = 0;
    let description = '';
    let userId = '';

    // 获取用户ID
    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user } } = await supabaseAdmin.auth.getUser(token);
      if (user) {
        userId = user.id;
      }
    }

    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: '用户未登录' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // 根据订单类型处理
    if (orderType === 'product') {
      // 商品订单
      const { items, deliveryMethod, addressId, pickupLocation, remark } = orderData;

      // 预留库存
      for (const item of items) {
        const { data: reserved } = await supabaseAdmin.rpc('reserve_sku_stock', {
          p_sku_code: item.sku_code,
          p_quantity: item.quantity
        });

        if (!reserved) {
          return new Response(JSON.stringify({ success: false, error: `商品 ${item.name} 库存不足` }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
          });
        }
      }

      // 计算总金额
      totalAmount = items.reduce((sum, item) => sum + item.subtotal, 0);
      description = `根书文创商品购买`;

      // 创建订单
      const { error: orderError } = await supabaseAdmin
        .from('orders')
        .insert({
          order_no: outTradeNo,
          user_id: userId,
          openid: openid,
          status: 'pending',
          items: items,
          total_amount: totalAmount,
          delivery_method: deliveryMethod,
          address_id: addressId || null,
          pickup_location: pickupLocation || null,
          remark: remark || null
        });

      if (orderError) {
        console.error('[CreateOrder ERROR]', orderError);
        return new Response(JSON.stringify({ success: false, error: '创建订单失败' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

    } else if (orderType === 'ticket') {
      // 门票订单
      const { ticketTypeId, quantity, unitPrice, visitorName, visitorPhone, visitDate } = orderData;

      // 预留库存
      const { data: reserved } = await supabaseAdmin.rpc('reserve_ticket_stock', {
        p_ticket_type_id: ticketTypeId,
        p_quantity: quantity
      });

      if (!reserved) {
        return new Response(JSON.stringify({ success: false, error: '门票库存不足' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

      totalAmount = unitPrice * quantity;
      description = `根书文旅门票购买`;

      // 创建门票订单
      const { error: orderError } = await supabaseAdmin
        .from('ticket_orders')
        .insert({
          order_no: outTradeNo,
          user_id: userId,
          openid: openid,
          ticket_type_id: ticketTypeId,
          quantity: quantity,
          unit_price: unitPrice,
          total_amount: totalAmount,
          visitor_name: visitorName,
          visitor_phone: visitorPhone,
          visit_date: visitDate,
          status: 'pending'
        });

      if (orderError) {
        console.error('[CreateTicketOrder ERROR]', orderError);
        return new Response(JSON.stringify({ success: false, error: '创建门票订单失败' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }

    } else if (orderType === 'customization') {
      // 定制订单
      const { type, depositAmount, ...customData } = orderData;

      totalAmount = depositAmount;
      description = type === '3d_print' ? '根书3D打印定制' : '根书高端定制';

      // 创建定制订单
      const { error: orderError } = await supabaseAdmin
        .from('customization_orders')
        .insert({
          order_no: outTradeNo,
          user_id: userId,
          openid: openid,
          type: type,
          status: 'pending',
          deposit_amount: depositAmount,
          ...customData
        });

      if (orderError) {
        console.error('[CreateCustomizationOrder ERROR]', orderError);
        return new Response(JSON.stringify({ success: false, error: '创建定制订单失败' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
        });
      }
    }

    // 调用微信支付
    try {
      const wxpay = new Wechatpay({
        mchid: MERCHANT_ID,
        serial: MCH_CERT_SERIAL_NO,
        privateKey: MCH_PRIVATE_KEY,
        certs: { [WECHAT_PAY_PUBLIC_KEY_ID]: WECHAT_PAY_PUBLIC_KEY },
      });

      const notifyUrl = `${SUPABASE_URL}/functions/v1/wechat_payment_callback`;

      const { data } = await wxpay.v3.pay.transactions.jsapi.post({
        mchid: MERCHANT_ID,
        appid: MERCHANT_APP_ID,
        description: description,
        out_trade_no: outTradeNo,
        notify_url: notifyUrl,
        amount: { total: Math.round(totalAmount * 100), currency: 'CNY' },
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
          orderNo: outTradeNo,
          paymentParams: { 
            timeStamp, 
            nonceStr, 
            package: packageStr, 
            signType: 'RSA', 
            paySign 
          } 
        }), {
          status: 200,
          headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' }
        });
      } else {
        return new Response(JSON.stringify({ success: false, error: "发起支付失败" }), {
          status: 500,
          headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' }
        });
      }
    } catch (err) {
      console.error(`[WeChatPay ERROR] outTradeNo=${outTradeNo}, error=${err?.message || String(err)}`);
      return new Response(JSON.stringify({ success: false, error: `微信支付错误: ${err?.message || String(err)}` }), {
        status: 500,
        headers: { "Content-Type": "application/json", 'Access-Control-Allow-Origin': '*' }
      });
    }

  } catch (err) {
    console.error('[create_wechat_payment ERROR]', err);
    return new Response(JSON.stringify({ success: false, error: err?.message || String(err) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
});
