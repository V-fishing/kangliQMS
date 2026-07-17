import { describe, it, expect } from 'vitest'
import { cpkColor, statusColor, formatNumber, formatPercent } from '@/utils/format'

describe('format utils', () => {
  it('cpkColor returns green for >= 1.33', () => {
    expect(cpkColor(1.33)).toBe('#2f7d32')
    expect(cpkColor(2.0)).toBe('#2f7d32')
  })

  it('cpkColor returns yellow for 1.0-1.32', () => {
    expect(cpkColor(1.0)).toBe('#d4a017')
    expect(cpkColor(1.32)).toBe('#d4a017')
  })

  it('cpkColor returns red for < 1.0', () => {
    expect(cpkColor(0.99)).toBe('#c0392b')
    expect(cpkColor(0.5)).toBe('#c0392b')
  })

  it('statusColor returns correct colors', () => {
    expect(statusColor('pending')).toBe('#d4a017')
    expect(statusColor('done')).toBe('#2f7d32')
    expect(statusColor('rejected')).toBe('#c0392b')
  })

  it('formatNumber handles null/NaN', () => {
    expect(formatNumber(NaN)).toBe('--')
    expect(formatNumber(null as unknown as number)).toBe('--')
    expect(formatNumber(3.14159, 2)).toBe('3.14')
  })

  it('formatPercent converts to percentage', () => {
    expect(formatPercent(0.82)).toBe('82.0%')
    expect(formatPercent(0.826, 2)).toBe('82.60%')
  })
})
