
## 第二轮补充：真实市场分析 Provider

新增 `src/services/aiTrade/remoteProvider.ts`。当构建环境设置 `TARO_APP_AI_PROVIDER=remote` 时，市场分析会调用现有的 `minimax-chat` Supabase Edge Function；未设置时继续使用 Mock Provider，因此课堂演示不会因为远程服务未部署而突然失效。

真实模式的调用链是：

```text
页面 → AI Service → remoteProvider → Supabase Edge Function → MiniMax-M3
```

已审核的贸易数据快照会随请求发送给模型，并要求模型只基于这些证据进行解释。API Key 仍然只存在于 Edge Function 的服务端环境变量中，前端不保存密钥。
