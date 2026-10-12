import Taro from '@tarojs/taro'
import {supabase} from '@/client/supabase'

/**
 * 课堂演示模式：模拟支付成功（非微信环境使用）
 * 幂等，已支付订单不会重复扣款
 */
export async function requestDemoPayment(orderNo: string, amount: number): Promise<boolean> {
  try {
    const {data, error} = await supabase.rpc('handle_order_payment_success_v2', {
      p_order_no: orderNo,
      p_transaction_no: `DEMO-${Date.now()}`,
      p_amount: amount,
      p_currency: 'CNY',
      p_channel: 'demo'
    })

    if (error) {
      console.error('演示支付失败:', error)
      Taro.showToast({title: error.message || '演示支付失败', icon: 'none'})
      return false
    }

    return !!data
  } catch (err: any) {
    console.error('requestDemoPayment Error:', err)
    Taro.showToast({title: err?.message || '演示支付异常', icon: 'none'})
    return false
  }
}

/**
 * 获取用户 OpenID
 * 如果 profile 中已有 openid 则直接返回，否则通过静默登录获取并同步
 */
export async function getOpenId(profile: any, refreshProfile: () => Promise<void>): Promise<string | null> {
  // 1. 检查 profile 中是否已有 openid
  if (profile?.openid) {
    return profile.openid
  }

  // 2. 只有微信小程序环境可以获取 openid
  if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
    return null
  }

  try {
    // 3. 调用 taro.login 获取 code
    const {code} = await Taro.login()
    if (!code) throw new Error('获取微信 code 失败')

    // 4. 调用 Edge Function 获取 openid
    const {data, error} = await supabase.functions.invoke('get-wechat-openid', {
      body: {code}
    })

    if (error || !data?.openid) {
      console.error('获取 OpenID 失败:', error || data?.error)
      return null
    }

    // 5. 将 openid 同步到数据库
    const {error: updateError} = await supabase.rpc('update_openid', {
      userId: profile.id,
      openid: data.openid
    })

    if (updateError) {
      console.error('更新 OpenID 失败:', updateError)
    }

    // 6. 刷新 profile 以确保后续使用最新的 openid
    await refreshProfile()

    return data.openid
  } catch (err) {
    console.error('getOpenId Error:', err)
    return null
  }
}

/**
 * 发起微信支付
 */
export async function requestWechatPay(
  orderNo: string,
  openid: string,
  orderType: 'goods' | 'ticket' = 'goods'
): Promise<boolean> {
  if (Taro.getEnv() !== Taro.ENV_TYPE.WEAPP) {
    Taro.showToast({title: '非微信小程序环境无法发起支付', icon: 'none'})
    return false
  }

  Taro.showLoading({title: '准备支付...'})

  try {
    // 1. 调用 Edge Function 创建预支付订单
    const {data, error} = await supabase.functions.invoke('create-wechat-payment', {
      body: {order_no: orderNo, openid, order_type: orderType}
    })

    Taro.hideLoading()

    if (error || !data?.success) {
      const errorMsg = data?.error || (await error?.context?.text?.()) || '创建支付订单失败'
      throw new Error(errorMsg)
    }

    // 2. 调用微信原生支付接口
    const {timeStamp, nonceStr, package: packageStr, signType, paySign} = data.paymentParams

    return new Promise((resolve) => {
      Taro.requestPayment({
        timeStamp,
        nonceStr,
        package: packageStr,
        signType,
        paySign,
        success: () => {
          Taro.showToast({title: '支付成功', icon: 'success'})
          resolve(true)
        },
        fail: (err) => {
          console.error('支付失败:', err)
          if (err.errMsg.indexOf('cancel') > -1) {
            Taro.showToast({title: '支付已取消', icon: 'none'})
          } else {
            Taro.showToast({title: `支付失败: ${err.errMsg}`, icon: 'none'})
          }
          resolve(false)
        }
      })
    })
  } catch (err) {
    Taro.hideLoading()
    console.error('requestWechatPay Error:', err)
    Taro.showModal({
      title: '支付错误',
      content: err instanceof Error ? err.message : '发起支付时遇到错误，请检查配置或稍后再试',
      showCancel: false
    })
    return false
  }
}
