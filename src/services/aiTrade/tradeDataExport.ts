import Taro from '@tarojs/taro'
import type {TradeDataSnapshot} from './tradeData'

function safeCell(value: unknown) {
  let text = value === null || value === undefined ? '' : String(value)
  // CSV opened in spreadsheet apps can execute formula-like text. Keep it literal.
  if (typeof value === 'string' && /^[\s]*[=+\-@]/.test(text)) text = `'${text}`
  return `"${text.replace(/"/g, '""')}"`
}

export function buildTradeDataCsv(rows: TradeDataSnapshot[], fetchedAt = '') {
  const header = [
    '数据领域',
    '指标名称',
    '经济体',
    '年份',
    '数值',
    '单位',
    '币种',
    '贸易流向',
    '官方公布同比（%）',
    '数据性质',
    '发布机构',
    '来源名称',
    '原始来源链接',
    '统计定义与限制',
    '来源发布日期/核验日期',
    '数据抓取时间'
  ]
  const sorted = [...rows].sort(
    (a, b) =>
      a.domain.localeCompare(b.domain) ||
      a.geography.localeCompare(b.geography) ||
      a.year - b.year ||
      a.indicator.localeCompare(b.indicator)
  )
  const records = sorted.map((item) => [
    item.domain,
    item.indicator,
    item.geography,
    item.year,
    item.value,
    item.unit,
    item.currency || '',
    item.flow === 'exports' ? '出口（报告方对世界）' : item.flow === 'imports_exports' ? '进出口合计' : '',
    item.reportedGrowthPct ?? '',
    item.publisher === 'World Trade Organization' ? '官方批量数据下载' : '官方发布快照',
    item.publisher,
    item.sourceName,
    item.sourceUrl,
    item.definition,
    item.updatedAt,
    fetchedAt
  ])
  return `\uFEFF${[header, ...records].map((row) => row.map(safeCell).join(',')).join('\r\n')}`
}

export async function exportTradeDataCsv(rows: TradeDataSnapshot[], fetchedAt = '') {
  const content = buildTradeDataCsv(rows, fetchedAt)
  const date = new Date().toISOString().slice(0, 10)
  const fileName = `ai-trade-data-${date}.csv`

  if (process.env.TARO_ENV === 'h5') {
    const blob = new Blob([content], {type: 'text/csv;charset=utf-8'})
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    return
  }

  if (Taro.getEnv() === Taro.ENV_TYPE.WEAPP) {
    const basePath = Taro.env.USER_DATA_PATH
    if (!basePath) throw new Error('当前微信版本不支持保存导出文件')
    const filePath = `${basePath}/${fileName}`
    const fileSystem = Taro.getFileSystemManager()
    await new Promise<void>((resolve, reject) => {
      fileSystem.writeFile({
        filePath,
        data: content,
        encoding: 'utf8',
        success: () => resolve(),
        fail: (error) => reject(new Error(error.errMsg || 'CSV文件保存失败'))
      })
    })
    if (typeof Taro.shareFileMessage === 'function') {
      try {
        await Taro.shareFileMessage({filePath, fileName})
        return
      } catch {
        // The file remains in USER_DATA_PATH even if the share sheet is unavailable.
      }
    }
    Taro.showToast({title: 'CSV已保存，可通过微信分享菜单发送', icon: 'none'})
    return
  }

  throw new Error('当前运行环境暂不支持数据导出')
}
