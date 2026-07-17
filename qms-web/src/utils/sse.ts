/**
 * SSE 客户端封装
 * 对应技术栈文档 §6.3: EventSource 封装，订阅 SPC 报警/实时看板，断线自动重连
 */
export interface SseOptions {
  url: string
  onMessage?: (data: unknown) => void
  onOpen?: () => void
  onError?: (e: Event) => void
  reconnect?: boolean
  reconnectInterval?: number
}

export class SseClient {
  private source: EventSource | null = null
  private opts: SseOptions
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null

  constructor(opts: SseOptions) {
    this.opts = { reconnect: true, reconnectInterval: 5000, ...opts }
  }

  connect() {
    if (this.source) this.close()

    this.source = new EventSource(this.opts.url)

    this.source.onopen = () => {
      this.opts.onOpen?.()
    }

    this.source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        this.opts.onMessage?.(data)
      } catch {
        this.opts.onMessage?.(event.data)
      }
    }

    this.source.onerror = (e) => {
      this.opts.onError?.(e)
      this.source?.close()
      this.source = null
      if (this.opts.reconnect) {
        this.reconnectTimer = setTimeout(() => this.connect(), this.opts.reconnectInterval)
      }
    }
  }

  close() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer)
      this.reconnectTimer = null
    }
    this.source?.close()
    this.source = null
  }
}

/**
 * Mock SSE 推送（后端未就绪时模拟实时数据推送）
 */
export class MockSseClient {
  private timer: ReturnType<typeof setInterval> | null = null
  private onMessage: (data: unknown) => void

  constructor(onMessage: (data: unknown) => void, interval = 5000) {
    this.onMessage = onMessage
    this.timer = setInterval(() => {
      this.onMessage({ type: 'mock', time: Date.now(), data: Math.random() })
    }, interval)
  }

  close() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
}
