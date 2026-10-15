# AI 跨境助手：数据、AI、导出与外部服务接入

## 1. 数据口径与图表

数据看板将不同统计口径分开呈现，不把它们相加：

- **跨境电商货物贸易**：中国海关总署年度进出口总额和官方同比；没有机器可读的实时接口时，保留人工核对的官方快照。
- **可数字化交付服务贸易**：商务部公布的双向贸易总额，与货物贸易分开。
- **电信、计算机和信息服务贸易**：商务部同一指标的 2020/2025 数值，用于计算端点年均增速；该增速是据两个端点计算的，不是来源方另行公布的年度同比。
- **WTO 数字化交付服务出口**：后台读取 WTO 官方压缩数据中的 DDS、World 伙伴、Mode 1 出口总量行，覆盖中国、美国、日本、新加坡和韩国；以实际下载文件中的年份为准。下载文件实际格式为 CSV 时按 CSV 解析，同时兼容 XLS/XLSX。

WTO 的报告方出口表示服务供给背景，不代表当地商品进口需求、消费者规模、文创销量或跨境电商货物规模。图表和 AI 提示词均保留这一限制；未取得目标市场品类进口、渠道份额、竞争和消费者调研数据时，必须明示缺口，不输出虚构的机会分数。

WTO 数据同步接口成功时以经济体+年份覆盖对应静态课堂快照；同步失败时展示有来源标记的已核对快照。面板分别显示实时/缓存/静态状态和最后抓取时间。来源链接可直接打开（小程序端复制链接）。

## 2. AI 能力实际状态

当前 Provider 为混合实现：设置 `TARO_APP_AI_PROVIDER=remote` 且配置有效 Supabase 项目后，**海外市场分析和跨境客服**会调用 `minimax-chat` Edge Function 的 MiniMax-M3；文创商品图片识别也调用该 Edge Function。商品国际化、询盘分析/回复、报价说明、贸易合规、单证、客户意向、营销素材和异常建议仍走规则演示实现，并继续显示 Mock/演示标记。仅仅设置模型环境变量不会自动部署 Edge Function 或提供模型密钥。

- 前端构建变量：`TARO_APP_SUPABASE_URL`、`TARO_APP_SUPABASE_ANON_KEY`、`TARO_APP_APP_ID`、`TARO_APP_AI_PROVIDER`。
- Supabase Edge Function Secret：`INTEGRATIONS_API_KEY`，只用于服务端调用模型网关；绝不能写入小程序/H5 环境变量或源码。
- 远端市场分析仅发送所选市场的最新 WTO 出口行，以及中国官方宏观背景行；模型被明确禁止把这些宏观指标当成当地商品需求证据。
- 每条已保存市场分析记录会同时保存所用统计数值、单位、年份、来源 URL、抓取时间和局限说明，便于事后复核。

## 3. 数据导出

- **数据看板 CSV**：UTF-8 BOM、RFC 风格引号、公式注入防护；含数据领域、指标、经济体、年份、值、单位、币种、贸易流向、官方同比、数据性质、发布方、来源链接、定义/限制、核验日期及抓取时间。H5 直接下载；微信小程序写入用户文件目录并尝试调起分享。
- **AI 业务记录 Excel**：仅查询当前登录用户自己的记录；新增证据摘要与原始来源链接。`exports` 桶经迁移 `00046_private_ai_trade_exports.sql` 改为私有，按用户 ID 隔离文件路径，并只返回有效期 5 分钟的签名下载链接。
- 旧记录可能没有结构化来源证据，导出会明确标注“旧记录未保存结构化来源证据”，不会补造引用。

部署前必须在 Supabase 执行迁移 `00046_private_ai_trade_exports.sql`，再部署 `export-ai-trade-records` Edge Function。尚未执行迁移的远端项目仍使用旧桶策略；不要把含客户数据的文件链接公开分享。

## 4. 待完成的外部授权与部署

### Supabase

小程序/H5 项目的 Supabase URL 与 anon public key 需要填入本地/托管构建变量；anon key 本身用于公开客户端，但表和存储权限必须由 RLS 限制。服务端 Secret（如 `INTEGRATIONS_API_KEY`、`SUPABASE_SERVICE_ROLE_KEY`、`TRADE_REFRESH_SECRET`）只放在 Supabase Secrets 或 GitHub Actions Secrets。执行相关迁移并部署 `trade-data-sync`、`trade-data-refresh`、`minimax-chat`、`export-ai-trade-records` Edge Functions 后，实时数据、远端市场分析和安全 Excel 导出才会在该 Supabase 项目生效。

### Google Maps 与中国大陆地图

当前地址/笔记位置仍主要依赖微信 `chooseLocation/getLocation`；仓库的 `geocoding` Edge Function 使用现有服务端网关密钥 `INTEGRATIONS_API_KEY`，**尚未接入 Google Maps SDK/API**。因此，Google Maps 连接授权完成本身不会自动让小程序显示 Google 地图。

若要支持美国、日本、韩国、新加坡等海外地点，需要 Google Cloud 项目、启用相应 Maps API、受限的 API Key 与账单配置，并在客户端地图选择/搜索和服务端地理编码适配器中明确接线。Google 服务不适合作为中国大陆唯一地图方案；大陆继续使用微信/国内地图实现，海外再按地区选 Google 适配器。不要把 Google API Key 放入聊天或源码；优先存入服务端 Secret，若地图 JavaScript SDK 必须使用浏览器 Key，则需设置 HTTP referrer/API 限制。

### Instagram / Facebook

项目的 `ayrshare-social` Edge Function 需要 Supabase 服务端 Secret `AYRSHARE_API_KEY`。之后用户还需在授权流程中连接 Instagram Business/Creator 与关联 Facebook Page。当前代码不会把未连接状态伪装为已发布；公开发布仍要求人工审核/确认。服务授权、Meta 账号 OAuth 和正式发布是不同步骤。

## 5. 课堂演示前检查

1. 将最新仓库代码部署到自己的 Supabase 项目；执行 `00043_sustainable_trade_updates.sql`（如尚未执行）和 `00046_private_ai_trade_exports.sql`。
2. 部署数据同步、远端 AI 与 Excel 导出 Edge Functions，并按上文设置仅限服务端的 Secrets。
3. 在构建环境填入 Supabase URL/anon key 和 `TARO_APP_AI_PROVIDER=remote`，重新构建 H5/小程序；匿名浏览器预览仍使用静态数据/演示模式。
4. 测试：WTO 刷新状态、五个重点市场图表、来源链接、CSV 下载、登录后 Excel 导出及他人无法读取该文件。
5. 若要展示 Google Maps 或 IG/FB，请先完成各自的平台授权、服务端配置及账号 OAuth；否则在演示稿中明确标记为“待授权/待部署”。
