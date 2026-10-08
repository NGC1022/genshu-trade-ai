const pages = [
  'pages/splash/index',
  'pages/home/index',
  'pages/products/index',
  'pages/customization/index',
  'pages/profile/index',
  'pages/login/index',
  'pages/product-detail/index',
  'pages/order-confirm/index',
  'pages/order-list/index',
  'pages/order-detail/index',
  'pages/tickets/index',
  'pages/ticket-detail/index',
  'pages/ticket-pricing/index',
  'pages/ticket-confirm/index',
  'pages/ticket-success/index',
  'pages/my-tickets/index',
  'pages/ticket-qr/index',
  'pages/ticket-verify/index',
  'pages/3d-customization/index',
  'pages/premium-customization/index',
  'pages/customization-list/index',
  'pages/customization-detail/index',
  'pages/customization-success/index',
  'pages/address-list/index',
  'pages/address-edit/index',
  'pages/profile-edit/index',
  'pages/change-password/index',
  'pages/help/index',
  'pages/customer-service/index',
  'pages/customization-confirm/index',
  'pages/admin-orders/index',
  'pages/admin-refunds/index',
  'pages/admin-customizations/index',
  'pages/refund-apply/index',
  'pages/announcement-detail/index',
  'pages/announcements/index',
  'pages/notes/index',
  'pages/note-create/index',
  'pages/note-detail/index',
  'pages/my-notes/index',
  'pages/my-comments/index',
  'pages/privacy-settings/index',
  'pages/about-us/index',
  'pages/note-report/index',
  'pages/product-select/index',
  'pages/messages/index',
  'pages/admin-reports/index',
  'pages/user-profile/index',
  'pages/draft-box/index',
  'pages/following-list/index',
  'pages/digital-ip/index',
  'pages/member-center/index',
  'pages/exclusive-content/index',
  'pages/quiz/index',

  'pages/bug-report/index',
  'pages/product-review-create/index',
  'pages/ai-trade/index',
  'pages/ai-trade-translate/index',
  'pages/ai-trade-market/index',
  'pages/ai-trade-inquiry/index',
  'pages/ai-trade-quote/index',
  'pages/ai-trade-records/index',
  'pages/ai-trade-record-detail/index',
  'pages/ai-trade-dashboard/index',
  'pages/ai-trade-support/index',
  'pages/ai-trade-compliance/index',
  'pages/ai-trade-documents/index',
  'pages/ai-trade-customers/index',
  'pages/ai-trade-customer-detail/index',
  'pages/ai-trade-quote-workbench/index',
  'pages/ai-trade-marketing/index',
  'pages/social-link/index',
  'pages/after-sales/index',
  'pages/order-exceptions/index',
  'pages/merchant-admin/index',
  'pages/sku-management/index',
  'pages/merchant-products/index',
  'pages/merchant-orders/index'
]

//  To fully leverage TypeScript's type safety and ensure its correctness, always enclose the configuration object within the global defineAppConfig helper function.
export default defineAppConfig({
  pages,
  tabBar: {
    color: '#999999',
    selectedColor: '#C92A2A',
    backgroundColor: '#ffffff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/home/index',
        text: '首页',
        iconPath: 'assets/icons/home_unselected.png',
        selectedIconPath: 'assets/icons/home_selected.png'
      },
      {
        pagePath: 'pages/products/index',
        text: '文创',
        iconPath: 'assets/icons/creative_unselected.png',
        selectedIconPath: 'assets/icons/creative_selected.png'
      },
      {
        pagePath: 'pages/customization/index',
        text: '定制',
        iconPath: 'assets/icons/design-services_unselected.png',
        selectedIconPath: 'assets/icons/design-services_selected.png'
      },
      {
        pagePath: 'pages/notes/index',
        text: '广场',
        iconPath: 'assets/icons/discovery-index_unselected.png',
        selectedIconPath: 'assets/icons/discovery-index_selected.png'
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: 'assets/icons/person_unselected.png',
        selectedIconPath: 'assets/icons/person_selected.png'
      }
    ]
  },
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#C92A2A',
    navigationBarTitleText: '根书文创',
    navigationBarTextStyle: 'white'
  },
  permission: {
    'scope.camera': {
      desc: '用于扫描门票二维码进行核销'
    },
    'scope.userLocation': {
      desc: '您的位置信息将用于导航至线下自提点'
    }
  },
  requiredPrivateInfos: ['getLocation', 'chooseLocation']
})
