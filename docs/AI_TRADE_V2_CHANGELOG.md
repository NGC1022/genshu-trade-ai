# AI 跨境贸易模块 V2 第一轮重构

## 本轮已完成

### 1. 新增统一数据层

新增 `src/services/aiTrade/tradeData.ts`，包含：

- WTO、海关总署、商务部等数据源元信息；
- 中国跨境电商 2024—2025 已核对快照；
- 中国可数字化交付服务 2025 已核对快照；
- 中国电信、计算机和信息服务 2020/2025 已核对快照；
- 中国服务贸易结构指标；
- 同比和 CAGR 计算函数；
- 美国、日本、新加坡、韩国的可解释市场机会评分；
- `official`、`classroom_snapshot`、`ai_inference` 三类数据状态。

本轮没有把不同币种、不同统计口径的指标直接相加，也没有用 AI 补造缺失的年度数据。

### 2. 重构海外市场分析页

文件：`src/pages/ai-trade-market/index.tsx`

新增：

- 证据驱动的页面头部；
- 商品与目标市场工作流；
- 官方统计、课堂快照、AI辅助判断标签；
- 市场机会评分及五项评分维度；
- 贸易数据证据卡片；
- 来源与统计口径展开区；
- AI 结果中的文化适配、价格适配、风险、待核验数据和总结；
- 保存时写入数据快照 ID 和评分模型版本；
- 真实商品和课堂演示数据的区分。

### 3. 重构数字贸易数据看板

文件：`src/pages/ai-trade-dashboard/index.tsx`

新增：

- 中国跨境电商规模趋势图；
- 中国数字化交付/信息服务趋势图；
- 2025 年服务贸易结构图；
- 目标市场机会评分；
- 数据源与方法说明；
- AI 业务使用记录概览；
- “AI解释”和“我的判断”文本层；
- 进入市场分析工作台的课堂展示入口。

### 4. 重构 AI 跨境贸易首页

文件：`src/pages/ai-trade/index.tsx`

新增：

- “有证据地出海”的产品定位；
- 作业一展示版标识；
- 课堂展示 5 步主线；
- 四个核心工作台入口；
- 业务自动化入口；
- AI、统计事实和人工确认的边界说明。

## 本地验证结果

- `src/services/aiTrade/tradeData.ts`、三个重构页面在 `tsc --skipLibCheck` 检查中没有新增错误。
- 项目全量 TypeScript 仍有旧文件的未使用变量错误：`CommentItem.tsx`、`MentionSelector.tsx`、`ReplyItem.tsx`、`mockProvider.ts`。
- 项目依赖的 Taro 类型声明在不使用 `skipLibCheck` 时还有既有第三方类型错误。
- 仓库里的 `scripts/runLint.sh` 会自动执行 `biome --write`，且引用了当前仓库没有上传的 `tsconfig.check.json`、`checkNavigation.sh` 和 `checkIconPath.sh`；本轮没有把自动格式化结果混入源码。

## 下一步建议

1. 将真实 WTO ZIP 数据或经审核 CSV 放进后端数据快照，而不是直接把页面常量当成长期数据仓库；
2. 新增 `trade_data_snapshots` 和 `market_analysis_reports` 表，保存数据版本、来源、提示词版本和报告内容；
3. 将当前 Mock Provider 替换为 Supabase Edge Function 代理的真实模型调用；
4. 增加分析报告导出页面，用于 PDF 和课堂演示；
5. 在微信开发者工具中检查 ECharts canvas、页面路由和窄屏布局。
