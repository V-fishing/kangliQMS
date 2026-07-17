import { describe, it, expect } from 'vitest'
import { spcRules } from '@/mock/spc'

describe('SPC WECO 8 rules', () => {
  it('should have 8 rules', () => {
    expect(spcRules.length).toBe(8)
  })

  it('each rule has code, name, level', () => {
    spcRules.forEach((r) => {
      expect(r.code).toBeDefined()
      expect(r.name).toBeDefined()
      expect(['预警', '报警']).toContain(r.level)
    })
  })

  it('rule 1 is alarm level (超出3σ)', () => {
    expect(spcRules[0].level).toBe('报警')
    expect(spcRules[0].code).toBe('①')
  })

  it('rule 2 is warning level (连续7点同侧)', () => {
    expect(spcRules[1].level).toBe('预警')
  })

  it('rules can be toggled', () => {
    const rule = { ...spcRules[0] }
    expect(rule.enabled).toBe(true)
    rule.enabled = false
    expect(rule.enabled).toBe(false)
  })
})

describe('SPC subgroups', () => {
  it('should have 25 subgroups', async () => {
    const { spcSubgroups } = await import('@/mock/spc')
    expect(spcSubgroups.length).toBe(25)
  })

  it('each subgroup has no, xbar, r', async () => {
    const { spcSubgroups } = await import('@/mock/spc')
    spcSubgroups.forEach((s) => {
      expect(s.no).toBeGreaterThan(0)
      expect(typeof s.xbar).toBe('number')
      expect(typeof s.r).toBe('number')
    })
  })

  it('outlier rules are marked correctly', async () => {
    const { spcSubgroups } = await import('@/mock/spc')
    const outliers = spcSubgroups.filter((s) => s.outlierRule)
    expect(outliers.length).toBe(3)
  })
})
