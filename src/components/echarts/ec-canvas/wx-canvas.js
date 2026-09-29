// ECharts 微信小程序 Canvas 适配器（来自 echarts skill 参考实现）
export default class WxCanvas {
  constructor(ctx, canvasId, isNew, canvasNode) {
    this.ctx = ctx
    this.canvasId = canvasId
    this.chart = null
    this.isNew = isNew
    if (isNew) {
      this.canvasNode = canvasNode
    } else {
      this._initStyle(ctx)
    }
    this._initEvent()
  }

  getContext(contextType) {
    if (contextType === '2d') {
      return this.ctx
    }
    return null
  }

  setChart(chart) {
    this.chart = chart
  }

  addEventListener() {
    // noop
  }

  attachEvent() {
    // noop
  }

  detachEvent() {
    // noop
  }

  _initStyle(ctx) {
    ctx.createRadialGradient = () => {
      return ctx.createCircularGradient(arguments)
    }
  }

  _initEvent() {
    this.event = {}
    const touchEndEvents = ['touchEnd']
    const eventNames = [
      {wxName: 'touchStart', ecName: 'mousedown'},
      {wxName: 'touchMove', ecName: 'mousemove'},
      {wxName: 'touchEnd', ecName: 'mouseup'},
      {wxName: 'touchEnd', ecName: 'click'}
    ]
    eventNames.forEach((name) => {
      this.event[name.wxName] = (e) => {
        const touch = touchEndEvents.includes(name.wxName) ? e.changedTouches?.[0] : e.touches[0]
        if (!touch) return
        this.chart.getZr().handler.dispatch(name.ecName, {
          zrX: touch.x,
          zrY: touch.y,
          preventDefault: () => {},
          stopImmediatePropagation: () => {},
          stopPropagation: () => {}
        })
      }
    })
  }

  set width(w) {
    if (this.canvasNode) this.canvasNode.width = w
  }
  set height(h) {
    if (this.canvasNode) this.canvasNode.height = h
  }
  get width() {
    if (this.canvasNode) return this.canvasNode.width
    return 0
  }
  get height() {
    if (this.canvasNode) return this.canvasNode.height
    return 0
  }
}
