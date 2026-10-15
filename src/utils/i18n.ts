import Taro from '@tarojs/taro'

export type Language = 'zh' | 'en'
export type TranslationKey = keyof typeof translations

const LANGUAGE_STORAGE_KEY = 'genshu-app-language'

type TranslationPair = {zh: string; en: string}

const translations = {
  home: {zh: '首页', en: 'Home'},
  products: {zh: '文创商品', en: 'Products'},
  customization: {zh: '定制服务', en: 'Custom'},
  profile: {zh: '我的', en: 'Profile'},
  notice: {zh: '园区公告', en: 'Park News'},
  more: {zh: '更多应用', en: 'More'},
  featured: {zh: '精选文创', en: 'Featured Products'},
  tickets: {zh: '文旅门票', en: 'Tickets'},
  book_now: {zh: '立即预订', en: 'Book Now'},
  view_more: {zh: '查看更多', en: 'View More'},
  switch_lang: {zh: 'English', en: '简体中文'},
  pickup_date: {zh: '自提日期', en: 'Pickup Date'},
  pickup_time: {zh: '自提时间', en: 'Pickup Time'},
  pickup_location: {zh: '自提地点', en: 'Pickup Location'},
  pickup_tip: {zh: '请至少提前5-10分钟备货', en: 'Please prepare the order at least 5–10 minutes in advance.'},
  navigation: {zh: '地图导航', en: 'Directions'},
  free_ticket: {zh: '6岁以下免票', en: 'Free for children under 6'},
  premium: {zh: '高端', en: 'Premium'},
  price: {zh: '¥', en: 'CNY '},
  select_address: {zh: '请选择收货地址', en: 'Please select a delivery address'},
  language: {zh: '语言 / Language', en: 'Language / 语言'},
  language_description: {zh: '切换应用界面语言', en: 'Choose the language used in the app interface.'},
  chinese: {zh: '简体中文', en: '简体中文'},
  english: {zh: 'English', en: 'English'},
  language_changed_zh: {zh: '已切换为简体中文', en: 'Switched to Simplified Chinese'},
  language_changed_en: {zh: '已切换为 English', en: 'Switched to English'},
  login_first: {zh: '请先登录', en: 'Please sign in first'},
  login_now: {zh: '立即登录', en: 'Sign In'},
  logout: {zh: '退出登录', en: 'Sign Out'},
  logged_out: {zh: '已退出登录', en: 'Signed out'},
  user_name: {zh: '艺术体验者', en: 'Art Enthusiast'},
  super_admin: {zh: '特级管理员', en: 'Super Admin'},
  admin: {zh: '管理员', en: 'Admin'},
  member: {zh: '尊享会员', en: 'Member'},
  profile_settings: {zh: '资料设置', en: 'Profile Settings'},
  personal_page: {zh: '个人页面', en: 'My Page'},
  my_activity: {zh: '我的动态', en: 'My Activity'},
  posts: {zh: '已发文', en: 'Posts'},
  drafts: {zh: '草稿箱', en: 'Drafts'},
  following: {zh: '已追踪', en: 'Following'},
  messages: {zh: '消息', en: 'Messages'},
  member_center: {zh: '会员中心', en: 'Member Center'},
  vip_benefits: {zh: 'VIP权益与专属内容', en: 'VIP Benefits & Exclusive Content'},
  my_orders: {zh: '我的订单', en: 'My Orders'},
  my_tickets: {zh: '我的门票', en: 'My Tickets'},
  customization_orders: {zh: '定制订单', en: 'Custom Orders'},
  after_sales_center: {zh: '售后中心', en: 'After-Sales'},
  after_sales_summary: {zh: '退货 · 换货 · 退款 · 物流破损申报', en: 'Returns · Exchanges · Refunds · Shipping Damage'},
  delivery_address: {zh: '收货地址', en: 'Delivery Addresses'},
  ai_trade_assistant: {zh: 'AI跨境贸易助手', en: 'AI Trade Assistant'},
  merchant_portal: {zh: '商家业务端', en: 'Merchant Portal'},
  merchant_admin: {zh: '商家运营后台', en: 'Merchant Dashboard'},
  merchant_admin_summary: {
    zh: '商品 · SKU · 订单 · 客户 · 售后 · 看板',
    en: 'Products · SKUs · Orders · Customers · Support · Analytics'
  },
  privacy_data: {zh: '隐私与数据使用说明', en: 'Privacy & Data Use'},
  privacy_data_summary: {
    zh: '手机号、邮箱、收货地址与客户联系方式等信息在无权限角色下展示时将进行脱敏处理；客户业务数据按角色（消费者/商家/审核/管理员）控制访问；AI处理业务信息仅用于生成辅助内容，不会在页面中泄露不必要的敏感数据。本项目未声明任何正式安全认证或法律合规资质，正式运营前需完成相应合规评估。',
    en: 'Phone numbers, email addresses, delivery addresses, and customer contact details are masked when shown to users without the required permissions. Access to business data is role-based. AI uses business information only to generate assistance and does not display unnecessary sensitive data. This project does not claim formal security certification or legal compliance; complete an appropriate review before production use.'
  },
  admin_console: {zh: '管理控制台', en: 'Admin Console'},
  order_management: {zh: '订单管理', en: 'Order Management'},
  ticket_verification: {zh: '门票核销', en: 'Ticket Check-In'},
  customization_review: {zh: '定制审核', en: 'Custom Order Review'},
  refund_management: {zh: '退款管理', en: 'Refund Management'},
  report_management: {zh: '内容举报管理', en: 'Reports'},
  service_support: {zh: '服务与支持', en: 'Help & Support'},
  privacy_management: {zh: '隐私管理', en: 'Privacy Settings'},
  help_center: {zh: '帮助中心', en: 'Help Center'},
  online_support: {zh: '在线客服', en: 'Customer Support'},
  ai_trade_support: {zh: 'AI跨境客服', en: 'AI Trade Support'},
  ai_trade_support_summary: {zh: '跨境贸易业务咨询（演示模式）', en: 'Cross-border trade help (demo mode)'},
  after_sales_service: {zh: '售后服务', en: 'After-Sales Service'},
  after_sales_service_summary: {zh: '商品质量 · 物流损坏 · 退换货', en: 'Product Quality · Shipping Damage · Returns'},
  bug_report: {zh: '报错申请', en: 'Report a Problem'},
  about_us: {zh: '关于我们', en: 'About Us'},
  park_announcement: {zh: '园区公告', en: 'Park Announcement'},
  tickets_booking: {zh: '门票预订', en: 'Ticket Booking'},
  customization_service: {zh: '个性化定制服务', en: 'Custom Design Services'},
  customization_tagline: {
    zh: '专属设计 · 匠心打造 · 艺术传承',
    en: 'Made for you · Crafted with care · Rooted in heritage'
  },
  custom_3d: {zh: '3D打印定制', en: '3D-Printed Customization'},
  custom_3d_desc: {
    zh: '选择精美模板，输入定制文字，极速打印属于您的艺术品',
    en: 'Choose a template, add your text, and quickly print a personalized keepsake.'
  },
  try_now: {zh: '立即体验', en: 'Try It'},
  premium_custom: {zh: '高端实体定制', en: 'Premium Custom Artwork'},
  premium_custom_desc: {
    zh: '顶级大师团队，为您量身打造最具收藏价值的高端艺术珍品',
    en: 'Our master artisans create distinctive, collectible artwork tailored to your request.'
  },
  submit_request: {zh: '需求提交', en: 'Submit a Request'},
  view_custom_orders: {zh: '查看我的定制订单', en: 'View My Custom Orders'},
  shop_eyebrow: {zh: 'ROOT CULTURE / SHOP', en: 'ROOT CULTURE / SHOP'},
  products_intro: {
    zh: '按价格、销量和商品关键词找到适合自用或文化礼赠的作品。',
    en: 'Find a piece for yourself or as a cultural gift by price, sales, or keyword.'
  },
  search_products: {zh: '搜索商品名称、SKU、材质或用途', en: 'Search product name, SKU, material, or use'},
  clear: {zh: '清除', en: 'Clear'},
  all_products: {zh: '全部商品', en: 'All Products'},
  affordable_products: {zh: '平价文创', en: 'Everyday'},
  premium_products: {zh: '高端文创', en: 'Premium'},
  recommended: {zh: '综合推荐', en: 'Recommended'},
  sales_high_low: {zh: '总销量高→低', en: 'Total Sales: High to Low'},
  monthly_high_low: {zh: '月销量高→低', en: 'Monthly Sales: High to Low'},
  price_high_low: {zh: '价格高→低', en: 'Price: High to Low'},
  price_low_high: {zh: '价格低→高', en: 'Price: Low to High'},
  products_count: {zh: '共 {count} 件商品', en: '{count} products'},
  sales_confirmed: {zh: '销量数据来自已确认订单', en: 'Sales figures are based on confirmed orders.'},
  no_products: {zh: '没有找到匹配的商品', en: 'No matching products found'},
  affordable: {zh: '平价', en: 'Everyday'},
  in_stock: {zh: '有库存', en: 'In Stock'},
  preorder: {zh: '可预订', en: 'Available to Order'},
  monthly_sales: {zh: '月销 {count}', en: '{count} monthly'},
  total_sales: {zh: '总销 {count}', en: '{count} sold'},
  english_name_missing: {zh: '暂无英文商品名称', en: 'English product name unavailable'},
  campaign_title: {zh: '根宝IP周边新品上市', en: 'New Genbao IP Products'},
  campaign_body: {
    zh: '钥匙扣、徽章、抱枕、帆布袋现已开启发售，快来带根宝回家吧！',
    en: 'Keychains, badges, cushions, and canvas bags are now available. Take Genbao home!'
  },
  digital_ip_title: {zh: '根书拟人化：数字IP专区', en: 'Root Culture Digital IP'},
  digital_ip_body: {
    zh: '探索古老根书与现代数字艺术的奇妙碰撞，见证传统文化的创新表达。',
    en: 'Discover how the traditional art of Root Calligraphy meets contemporary digital art.'
  },
  sign_in_title: {zh: '登录', en: 'Sign In'},
  sign_up_title: {zh: '注册', en: 'Create Account'},
  username: {zh: '用户名', en: 'Username'},
  username_limit: {zh: '用户名（最多15个字符）', en: 'Username (up to 15 characters)'},
  username_placeholder: {zh: '请输入用户名', en: 'Enter your username'},
  password: {zh: '密码', en: 'Password'},
  password_placeholder: {zh: '请输入密码', en: 'Enter your password'},
  agree_terms: {
    zh: '我已阅读并同意《用户协议》和《隐私政策》',
    en: 'I have read and agree to the Terms of Service and Privacy Policy'
  },
  wechat_login: {zh: '微信快捷登录', en: 'Continue with WeChat'},
  brand_tagline: {zh: '传承文化 · 创新未来', en: 'Preserving heritage · Inspiring the future'},
  enter_credentials: {zh: '请输入用户名和密码', en: 'Enter your username and password'},
  agree_required: {
    zh: '请阅读并同意用户协议和隐私政策',
    en: 'Please read and accept the Terms of Service and Privacy Policy'
  },
  username_format: {
    zh: '用户名只能包含字母、数字和下划线',
    en: 'Username may contain only letters, numbers, and underscores'
  },
  login_success: {zh: '登录成功', en: 'Signed in successfully'},
  signup_success: {zh: '注册成功', en: 'Account created successfully'},
  demo_account_info: {
    zh: 'H5演示账号：demo / demo123\n商家演示账号：merchant / merchant123\n管理员演示账号：admin / admin123',
    en: 'H5 demo: demo / demo123\nMerchant demo: merchant / merchant123\nAdmin demo: admin / admin123'
  },
  home_banner_title: {zh: '根书文创小程序', en: 'Root Culture Mini Program'},
  home_banner_line1: {zh: '提供门票预订、文创购买、个性定制', en: 'Tickets, cultural products, and custom design'},
  home_banner_line2: {zh: '等一站式文旅服务', en: 'All in one place'},
  app_smart_park: {zh: '智慧景区', en: 'Smart Park'},
  app_park_guide: {zh: '景区导览', en: 'Park Guide'},
  app_dining: {zh: '餐饮服务', en: 'Dining'},
  app_nearby_stays: {zh: '周边住宿', en: 'Nearby Stays'},
  digital_ip_intro: {
    zh: '探索古老根书与现代数字艺术的奇妙碰撞，见证传统文化的焕新升级。',
    en: 'Discover how the traditional art of Root Calligraphy meets contemporary digital art.'
  },
  explore_now: {zh: '立即开启探索', en: 'Explore Now'},
  ai_trade_intro: {
    zh: '商品国际化、海外市场分析、跨境询盘与智能报价，非遗文创出海的全流程AI辅助。',
    en: 'AI support for product localization, overseas market research, cross-border inquiries, and quotes.'
  },
  limited_offer: {zh: '限时优惠', en: 'Limited-Time Offer'},
  tourism_smart: {zh: '智慧景区', en: 'Smart Park'},
  park_guide: {zh: '景区导览', en: 'Park Guide'},
  dining: {zh: '餐饮服务', en: 'Dining'},
  nearby_stay: {zh: '周边住宿', en: 'Nearby Stays'},
  ticket_failure: {zh: '打开地图失败，请稍后重试', en: 'Could not open the map. Please try again.'},
  preview_feature: {
    zh: '此功能在生产环境下将跳转至对应小程序',
    en: 'This feature will open the corresponding mini program in production.'
  },
  name_translation_unavailable: {zh: '暂无可验证的英文翻译', en: 'Verified English translation unavailable'},
  translation_pending: {zh: '待确认', en: 'To be confirmed'},
  translation_unavailable_note: {
    zh: '此字段未能可靠翻译，因此不会用中文冒充英文。请补充英文资料或重试翻译。',
    en: 'This field could not be translated reliably, so the original Chinese is not shown as English. Add an English source or retry translation.'
  }
} satisfies Record<string, TranslationPair>

const subscribers = new Set<(language: Language) => void>()

function isLanguage(value: unknown): value is Language {
  return value === 'zh' || value === 'en'
}

function getUrlLanguage(): Language | undefined {
  try {
    const location = (globalThis as any).location
    const candidate = new URLSearchParams(location?.search || '').get('lang')
    return isLanguage(candidate) ? candidate : undefined
  } catch {
    return undefined
  }
}

function removeUrlLanguageOverride() {
  try {
    const runtime = globalThis as any
    if (!runtime.location?.search || !runtime.history?.replaceState) return
    const url = new URL(runtime.location.href)
    if (!url.searchParams.has('lang')) return
    url.searchParams.delete('lang')
    runtime.history.replaceState({}, '', url.toString())
  } catch {
    // URL changes are an H5 convenience; native mini-programs use persistent storage.
  }
}

export const getLanguage = (): Language => {
  const urlLanguage = getUrlLanguage()
  if (urlLanguage) return urlLanguage
  try {
    const stored = Taro.getStorageSync(LANGUAGE_STORAGE_KEY)
    if (isLanguage(stored)) return stored
  } catch {
    // Storage may be unavailable during early app startup; default to Chinese.
  }
  return 'zh'
}

const tabLabels: Record<Language, string[]> = {
  zh: ['首页', '文创', '定制', '广场', '我的'],
  en: ['Home', 'Shop', 'Custom', 'Community', 'Profile']
}

export const applyTabBarLanguage = (language: Language = getLanguage()) => {
  tabLabels[language].forEach((text, index) => {
    try {
      const result = Taro.setTabBarItem({index, text})
      if (result && typeof result.catch === 'function') result.catch(() => undefined)
    } catch {
      // H5 previews or platform shells may not implement a native tab bar.
    }
  })
}

export const setLanguage = (language: Language): void => {
  if (!isLanguage(language)) return
  try {
    Taro.setStorageSync(LANGUAGE_STORAGE_KEY, language)
  } catch {
    // Keep the current runtime responsive even when persistent storage is unavailable.
  }
  removeUrlLanguageOverride()
  applyTabBarLanguage(language)
  subscribers.forEach((subscriber) => {
    subscriber(language)
  })
}

export const subscribeLanguage = (subscriber: (language: Language) => void): (() => void) => {
  subscribers.add(subscriber)
  return () => subscribers.delete(subscriber)
}

export const t = (key: string, values?: Record<string, string | number>): string => {
  const pair = translations[key as keyof typeof translations]
  if (!pair) return key
  let result = pair[getLanguage()]
  if (values) {
    for (const [name, value] of Object.entries(values)) {
      result = result.split(`{${name}}`).join(String(value))
    }
  }
  return result
}

/** 对少量页面级文案提供显式中英配对，避免把来源不明的中文自动当成英文。 */
export const localeText = (zh: string, en: string): string => (getLanguage() === 'en' ? en : zh)

export const hasTranslation = (key: string): key is TranslationKey => key in translations
