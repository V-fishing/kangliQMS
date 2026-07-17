/**
 * 加密工具 - SHA-256 哈希（文件防篡改）
 * 对应技术栈文档 §15: 照片 SHA-256 防篡改
 */
export async function sha256(data: string | ArrayBuffer): Promise<string> {
  const buffer = typeof data === 'string' ? new TextEncoder().encode(data) : data
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** 生成 traceId */
export function genTraceId(): string {
  return `trace-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

/** 简单 UUID（内部使用，不暴露给 UI） */
export function genId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}
