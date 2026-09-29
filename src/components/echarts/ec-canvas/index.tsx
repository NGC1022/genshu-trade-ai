import {Canvas} from '@tarojs/components'
import Taro from '@tarojs/taro'
import * as echarts from 'echarts/core'
import {Component} from 'react'
import WxCanvas from './wx-canvas'

function wrapTouch(event: any) {
  for (let i = 0; i < event.touches.length; ++i) {
    const touch = event.touches[i]
    touch.offsetX = touch.x
    touch.offsetY = touch.y
  }
  return event
}

export interface ECObj {
  onInit?(canvas: any, width: number, height: number, dpr: number): any
  lazyLoad?: boolean
}

export interface EcCanvasProps {
  canvasId: string
  ec: ECObj
}

class EcCanvasTaro extends Component<EcCanvasProps> {
  chart: any

  componentDidMount() {
    echarts.registerPreprocessor((option: any) => {
      if (option?.series) {
        if (option.series.length > 0) {
          option.series.forEach((series: any) => {
            series.progressive = 0
          })
        } else if (typeof option.series === 'object') {
          option.series.progressive = 0
        }
      }
    })

    if (!this.props.ec) {
      console.warn('EChart组件需绑定 ec 变量')
      return
    }
  }

  init(callback?: (canvas: any, width: number, height: number, dpr: number) => any) {
    setTimeout(() => {
      this.initByNewWay(callback)
    }, 30)
  }

  initByNewWay(callback?: (canvas: any, width: number, height: number, dpr: number) => any) {
    const query = Taro.createSelectorQuery()
    const {ec, canvasId} = this.props
    query
      .select(`.ec-canvas.${canvasId}`)
      .fields({
        node: true,
        size: true
      })
      .exec((res: any) => {
        if (!res?.[0]?.node) return
        const canvasNode = res[0].node
        const canvasDpr = Taro.getWindowInfo?.()?.pixelRatio ?? Taro.getSystemInfoSync().pixelRatio
        const canvasWidth = res[0].width
        const canvasHeight = res[0].height
        const ctx = canvasNode.getContext('2d')
        const canvas = new (WxCanvas as any)(ctx, canvasId, true, canvasNode)
        echarts.setCanvasCreator(() => {
          return canvas
        })
        if (typeof callback === 'function') {
          this.chart = callback(canvas, canvasWidth, canvasHeight, canvasDpr)
        } else if (typeof ec.onInit === 'function') {
          this.chart = ec.onInit(canvas, canvasWidth, canvasHeight, canvasDpr)
        }
      })
  }

  touchStart = (e: any) => {
    if (this.chart && e.touches.length > 0) {
      const touch = e.touches[0]
      const handler = this.chart.getZr().handler
      handler.dispatch('mousedown', {
        zrX: touch.x,
        zrY: touch.y
      })
      handler.dispatch('mousemove', {
        zrX: touch.x,
        zrY: touch.y
      })
      handler.processGesture(wrapTouch(e), 'start')
    }
  }

  touchMove = (e: any) => {
    if (this.chart && e.touches.length > 0) {
      const touch = e.touches[0]
      const handler = this.chart.getZr().handler
      handler.dispatch('mousemove', {
        zrX: touch.x,
        zrY: touch.y
      })
      handler.processGesture(wrapTouch(e), 'change')
    }
  }

  touchEnd = (e: any) => {
    if (this.chart) {
      const touch = e.changedTouches ? e.changedTouches[0] : ({} as any)
      const handler = this.chart.getZr().handler
      handler.dispatch('mouseup', {
        zrX: touch.x,
        zrY: touch.y
      })
      handler.dispatch('click', {
        zrX: touch.x,
        zrY: touch.y
      })
      handler.processGesture(wrapTouch(e), 'end')
    }
  }

  render() {
    const {canvasId} = this.props
    return (
      <Canvas
        type="2d"
        className={`ec-canvas ${canvasId} w-full h-full block`}
        canvasId={canvasId}
        onTouchStart={this.touchStart}
        onTouchMove={this.touchMove}
        onTouchEnd={this.touchEnd}
      />
    )
  }
}

export default EcCanvasTaro
