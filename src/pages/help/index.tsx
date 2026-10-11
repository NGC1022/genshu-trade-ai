import {ScrollView, Text, View} from '@tarojs/components'
import {useState} from 'react'

export default function Help() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const helpCategories = [
    {
      title: '账号相关',
      icon: 'i-mdi-account-circle',
      questions: [
        {
          q: '如何注册账号？',
          a: '首次进入小程序时，系统会自动使用您的微信信息创建账号，无需额外注册。'
        },
        {
          q: '如何修改个人资料？',
          a: '进入"我的"页面，点击头像区域或"编辑资料"按钮，即可修改用户名、头像、手机号等信息。'
        },
        {
          q: '忘记登录密码怎么办？',
          a: '本小程序使用微信授权登录，无需设置密码。只要使用同一微信账号登录即可访问您的数据。'
        }
      ]
    },
    {
      title: '广场功能',
      icon: 'i-mdi-earth',
      questions: [
        {
          q: '什么是广场？',
          a: '广场是用户分享文创体验、旅游心得、产品评价的社区空间。您可以在这里发布笔记、浏览他人分享、点赞评论互动。'
        },
        {
          q: '如何发布笔记？',
          a: '点击广场页面右下角的"+"按钮，上传图片、填写标题和内容，可添加话题标签、位置信息和推荐商品，最后点击"发布"即可。'
        },
        {
          q: '什么是草稿箱？',
          a: '编辑笔记时点击"保存草稿"，未完成的笔记会保存到草稿箱。您可以在"我的"→"草稿箱"中继续编辑或发布。'
        },
        {
          q: '如何筛选话题笔记？',
          a: '点击笔记中的话题标签，即可查看该话题下的所有笔记。点击返回按钮会自动清除筛选条件，回到全部笔记列表。'
        },
        {
          q: '如何追踪其他用户？',
          a: '在笔记详情页或用户个人主页点击"追踪"按钮。追踪后，该用户发布新笔记时您会收到消息通知。您也可以通过关注列表快速找到 TA。'
        },
        {
          q: '评论中的 @ 功能怎么用？',
          a: '在评论框输入"@"符号，会弹出用户选择列表。您可以选择想要提及的用户。发布后，对方会收到一条专属的"提到我的"消息通知。您可以 @ 任何人，包括笔记作者，作者也可以 @ 自己。'
        },
        {
          q: '如何查看用户主页？',
          a: '点击笔记中的用户头像或用户名，即可进入该用户的个人主页，查看 TA 的全部笔记、获赞数、追踪情况等信息。'
        },
        {
          q: '如何举报不良内容？',
          a: '在笔记详情页点击右上角"..."按钮，选择"举报"，选择理由并提交。我们在 24 小时内处理并向您反馈结果。'
        }
      ]
    },
    {
      title: '商品购买',
      icon: 'i-mdi-shopping',
      questions: [
        {
          q: '如何购买文创商品？',
          a: '浏览商品列表，点击心仪商品进入详情页，选择规格和数量后点击"立即购买"，填写收货信息并完成支付即可。'
        },
        {
          q: '支持哪些配送方式？',
          a: '我们提供快递配送和线下自提两种方式。快递配送全国包邮（偏远地区除外），线下自提可选择根书文创园或指定体验点。'
        },
        {
          q: '商品可以退换货吗？',
          a: '非定制商品在收到后7天内，如无质量问题且不影响二次销售，可申请退换货。定制商品不支持退换货。'
        },
        {
          q: '如何查看订单物流？',
          a: '进入"我的订单"，点击对应订单查看详情，系统会显示物流单号和配送进度。'
        }
      ]
    },
    {
      title: '门票预订',
      icon: 'i-mdi-ticket',
      questions: [
        {
          q: '门票有哪些类型?',
          a: '我们提供乐山大佛成人单票(80元)、成人联票(88元,含景区+根书艺术馆讲解)、根书艺术馆讲解服务(20元单购)三种类型。'
        },
        {
          q: '门票有效期多久？',
          a: '门票自购买之日起30天内有效，请在有效期内使用。过期门票将自动失效。'
        },
        {
          q: '如何使用电子门票？',
          a: '购票成功后，在"我的门票"中查看电子票二维码，入园时出示给工作人员扫描核销即可。优惠票种需同时出示有效证件。'
        },
        {
          q: '门票可以退款吗？',
          a: '门票一经售出原则上不予退换。如遇活动取消或场馆闭馆等特殊情况，将全额退款。个人原因可联系客服申请改期（限一次）。'
        }
      ]
    },
    {
      title: '定制服务',
      icon: 'i-mdi-palette',
      questions: [
        {
          q: '3D 打印定制流程是什么？',
          a: '选择数字IP形象模板(4款可选,统一70元) → 输入底座定制文字(限5字) → 提交订单 → 支付 → 制作 → 发货。预计7个工作日完成。'
        },
        {
          q: '如何查看定制进度？',
          a: '进入"我的" → "定制订单"，点击对应项目即可查看实时进度。我们会通过系统消息通知您重要的状态变更（如审核通过、制作完成等）。'
        },
        {
          q: '定制文字有什么要求？',
          a: '3D 打印底座篆刻最多支持5个汉字或字符,建议3-5字效果最佳。内容需符合社区安全规范。'
        },
        {
          q: '高端定制如何申请？',
          a: '在"定制服务"页面选择"高端实体定制"，填写详细需求（主题、预算、时间等）并提交，我们的专家团队会在 1-2 个工作日内主动与您联系。'
        },
        {
          q: '定制商品可以退款吗？',
          a: '由于定制商品的特殊性，一旦确认开始制作，将不支持无理由退换。如存在质量问题，请第一时间联系在线客服处理。'
        }
      ]
    },
    {
      title: '支付与发票',
      icon: 'i-mdi-credit-card',
      questions: [
        {
          q: '支持哪些支付方式？',
          a: '目前仅支持微信支付。'
        },
        {
          q: '如何申请发票？',
          a: '在订单详情页点击"申请发票"，填写发票抬头和税号等信息，我们会在3个工作日内开具电子发票并发送至您的邮箱。'
        },
        {
          q: '支付失败怎么办？',
          a: '请检查微信支付余额是否充足，或尝试更换支付方式。如仍无法支付，请联系客服协助处理。'
        }
      ]
    },
    {
      title: '法规与合规',
      icon: 'i-mdi-scale-balance',
      questions: [
        {
          q: '文创产品的知识产权如何保护？',
          a: '本园区所有文创设计、根书作品及品牌标识均受《著作权法》《专利法》《商标法》保护。涉及外观设计、实用新型或发明专利的产品，请确认已取得相应专利权属，未经授权不得复制、仿冒或用于商业用途。'
        },
        {
          q: '文创产品出口海外是否合规？',
          a: '出口须遵守《海关法》《对外贸易法》及目的国相关法规。涉及濒危植物材料（如部分树根、木材）的产品须提前办理 CITES 相关许可，并如实申报商品编码与原产地；涉及文化财产出境的应遵守《文物保护法》相关规定。'
        },
        {
          q: '海外订单的关税与清关如何处理？',
          a: '不同目的国对文创产品的关税税率、增值税及清关要求不同，建议发货前咨询专业报关机构或查阅目的国海关官方规定，并在下单前与业务人员确认关税承担方。'
        },
        {
          q: '在哪里可以查看详细的合规公告？',
          a: '您可在「园区公告」板块查看「文创产品知识产权与海外出口合规须知」等公告，了解知识产权保护、出口合规、文化产品出境与关税清关的详细说明。'
        }
      ]
    }
  ]

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index)
  }

  return (
    <View className="bg-gradient-subtle min-h-screen">
      <ScrollView className="flex-1 p-4" scrollY>
        <View className="bg-card rounded-xl p-6 mb-4 shadow-card border border-border text-center">
          <View className="w-16 h-16 bg-gradient-primary rounded-full mx-auto mb-3 flex items-center justify-center">
            <View className="i-mdi-help-circle text-3xl text-white" />
          </View>
          <Text className="text-xl font-bold text-accent mb-3">帮助中心</Text>

          <Text className="text-base text-muted-foreground">常见问题解答，快速找到您需要的帮助</Text>
        </View>

        {helpCategories.map((category, catIndex) => (
          <View key={catIndex} className="bg-card rounded-xl p-4 mb-4 shadow-card border border-border">
            <View className="flex items-center mb-3">
              <View className={`${category.icon} text-2xl text-primary mr-2`} />
              <Text className="text-base font-bold text-accent">{category.title}</Text>
            </View>
            <View className="space-y-3">
              {category.questions.map((item, qIndex) => {
                const globalIndex = catIndex * 100 + qIndex
                const isExpanded = expandedIndex === globalIndex
                return (
                  <View key={qIndex} className="border-t border-border pt-3 first:border-t-0 first:pt-0">
                    <View className="flex items-center justify-between" onClick={() => toggleExpand(globalIndex)}>
                      <Text className="text-base font-medium text-foreground flex-1 pr-2">{item.q}</Text>
                      <View
                        className={`i-mdi-chevron-down text-xl text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      />
                    </View>
                    {isExpanded && (
                      <View className="mt-2 bg-muted bg-opacity-30 rounded-lg p-3">
                        <Text className="text-base text-muted-foreground leading-relaxed">{item.a}</Text>
                      </View>
                    )}
                  </View>
                )
              })}
            </View>
          </View>
        ))}

        <View className="bg-blue-50 rounded-xl p-6 border border-blue-100">
          <View className="flex items-start">
            <View className="i-mdi-information text-2xl text-blue-600 mr-3 mt-0.5" />
            <View className="flex-1">
              <Text className="text-xl font-bold text-blue-900 block mb-4">未找到答案？</Text>
              <Text className="text-base text-blue-700 font-bold leading-relaxed block">
                如果以上内容未能解决您的问题，请前往"我的客服"页面联系在线客服，我们将竭诚为您服务。
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  )
}
