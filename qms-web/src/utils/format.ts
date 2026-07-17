/**
 * 格式化工具
 */
import dayjs from 'dayjs'

export function formatDate(date: string | Date | number, format = 'YYYY-MM-DD'): string {
  return dayjs(date).format(format)
}

export function formatDateTime(date: string | Date | number): string {
  return dayjs(date).format('YYYY-MM-DD HH:mm:ss')
}

export function formatNumber(val: number, digits = 2): string {
  if (val === null || val === undefined || isNaN(val)) return '--'
  return val.toFixed(digits)
}

export function formatPercent(val: number, digits = 1): string {
  return `${(val * 100).toFixed(digits)}%`
}

export function formatPPM(val: number): string {
  return `${val.toFixed(0)} PPM`
}

/** 状态颜色映射 */
export function statusColor(status: string): string {
  const map: Record<string, string> = {
    pending: '#d4a017',
    processing: '#2a6bb0',
    done: '#2f7d32',
    rejected: '#c0392b',
    overdue: '#c0392b',
  }
  return map[status] ?? '#5a6b7e'
}

/** CPK 颜色映射 */
export function cpkColor(cpk: number): string {
  if (cpk >= 1.33) return '#2f7d32'
  if (cpk >= 1.0) return '#d4a017'
  return '#c0392b'
}
