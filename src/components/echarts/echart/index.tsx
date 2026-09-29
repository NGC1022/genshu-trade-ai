import {View} from '@tarojs/components'
import {BarChart, LineChart, PieChart} from 'echarts/charts'
import {GridComponent, LegendComponent, TitleComponent, TooltipComponent} from 'echarts/components'
import * as echarts from 'echarts/core'
import {CanvasRenderer} from 'echarts/renderers'
import {Component, createRef} from 'react'
import EcCanvasTaro, {type ECObj} from '../ec-canvas'

// 按需注册：数据看板使用柱状图/饼图/折线图，控制小程序包体积
echarts.use([
  BarChart,
  LineChart,
  PieChart,
  TitleComponent,
  TooltipComponent,
  LegendComponent,
  GridComponent,
  CanvasRenderer
])

const isH5 = process.env.TARO_ENV === 'h5'

interface BaseChartState {
  ec: ECObj
}

interface BaseChartProps {
  canvasId: string
  onClick?: (params: unknown) => void
  onDblclick?: (params: unknown) => void
}

class BaseChart extends Component<BaseChartProps, BaseChartState> {
  state = {
    ec: {
      lazyLoad: true
    } as ECObj
  }

  Chart: any
  h5DomRef = createRef<HTMLDivElement>()
  h5Chart: any = null

  // 外部通过 ref 调用此方法渲染图表，传入标准 ECharts option
  refresh = (data: any) => {
    if (isH5) {
      this.refreshH5(data)
    } else {
      this.refreshWeapp(data)
    }
  }

  refreshH5 = (data: any) => {
    const dom = this.h5DomRef.current
    if (!dom) return
    if (!this.h5Chart) {
      this.h5Chart = echarts.init(dom)
      this.bindEvents(this.h5Chart)
    }
    this.h5Chart.setOption(data)
  }

  refreshWeapp = (data: any) => {
    this.Chart.init((canvas: any, width: number, height: number, canvasDpr: number) => {
      const chart = echarts.init(canvas, null, {
        width: width,
        height: height,
        devicePixelRatio: canvasDpr
      })
      canvas.setChart(chart)
      chart.setOption(data)
      this.bindEvents(chart)
      return chart
    })
  }

  bindEvents = (chart: any) => {
    const {onClick, onDblclick} = this.props
    if (onClick) chart.on('click', onClick)
    if (onDblclick) chart.on('dblclick', onDblclick)
  }

  componentWillUnmount() {
    if (this.h5Chart) {
      this.h5Chart.dispose()
      this.h5Chart = null
    }
  }

  refChart = (node: any) => (this.Chart = node)

  render() {
    if (isH5) {
      return (
        <View style={{width: '100%', height: '100%'}}>
          <div ref={this.h5DomRef} style={{width: '100%', height: '100%'}} />
        </View>
      )
    }
    return <EcCanvasTaro ref={this.refChart} canvasId={this.props.canvasId} ec={this.state.ec} />
  }
}

export default BaseChart
