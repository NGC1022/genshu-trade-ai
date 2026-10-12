const translations = {
  zh: {
    home: '首页',
    products: '文创商品',
    customization: '定制服务',
    profile: '我的',
    notice: '园区公告',
    more: '更多应用',
    featured: '精选文创',
    tickets: '文旅门票',
    book_now: '立即预订',
    view_more: '查看更多',
    switch_lang: '中文',
    pickup_date: '自提日期',
    pickup_time: '自提时间',
    pickup_location: '自提地点',
    pickup_tip: '请至少提前5-10分钟备货',
    navigation: '地图导航',
    free_ticket: '6岁以下免票',
    premium: '高端',
    price: '¥',
    select_address: '请选择收货地址'
  }
}

export type Language = 'zh'

export const getLanguage = (): Language => {
  return 'zh'
}

export const setLanguage = (_lang: any) => {
  // Do nothing
}

export const t = (key: keyof typeof translations.zh) => {
  return translations.zh[key] || key
}
