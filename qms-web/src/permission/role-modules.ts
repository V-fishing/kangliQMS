/**
 * 角色 → 模块映射
 *
 * 定义每个角色能访问哪些业务模块（ModuleKey）。
 * 这是权限体系的第一层：控制整个模块的 on/off。
 */

import type { ModuleKey } from './types'

// ── 角色 → 模块 ──────────────────────────────────────

export const ROLE_MODULES: Record<string, ModuleKey[]> = {
  // ── 前端 RoleId ──
  sysadmin:    ['overview', 'fia', 'incomingCheck', 'spc', 'ncm', 'sqm', 'patrol', 'archive', 'system', 'asm', 'tlm', 'msm', 'qsm'],
  inspector:   ['overview', 'fia', 'incomingCheck', 'spc', 'ncm', 'sqm', 'patrol', 'archive'],
  shiftleader: ['overview', 'fia', 'spc', 'ncm', 'sqm', 'patrol', 'archive'],
  sqe:         ['overview', 'incomingCheck', 'ncm', 'sqm', 'archive'],
  qmanager:    ['overview', 'fia', 'incomingCheck', 'spc', 'ncm', 'sqm', 'patrol', 'archive', 'system'],
  operator:    ['overview', 'archive'],
  aftersales:  ['overview', 'asm', 'archive'],
  metrology:   ['overview', 'msm', 'archive'],
  qualitysys:  ['overview', 'qsm', 'archive'],
  supplier:    ['overview', 'sqm', 'archive'],

  // ── 后端 R01-R06 编码兼容 ──
  R00: ['overview', 'fia', 'spc', 'ncm', 'sqm', 'patrol', 'archive', 'system', 'asm', 'tlm', 'msm', 'qsm'],
  R01: ['overview', 'archive'],
  R02: ['overview', 'fia', 'spc', 'ncm', 'sqm', 'patrol', 'archive'],
  R03: ['overview', 'fia', 'spc', 'ncm', 'sqm', 'patrol', 'archive'],
  R04: ['overview', 'fia', 'spc', 'ncm', 'sqm', 'patrol', 'archive', 'system'],
  R05: ['overview', 'ncm', 'sqm', 'archive'],
  R06: ['overview', 'fia', 'spc', 'ncm', 'sqm', 'patrol', 'archive', 'system'],
}

// ── 别名转换：R-code ↔ RoleId ──────────────────────

export const ROLE_ALIASES: Record<string, string> = {
  R00: 'sysadmin',
  R01: 'operator',
  R02: 'inspector',
  R03: 'shiftleader',
  R04: 'shiftleader',
  R05: 'sqe',
  R06: 'qmanager',
}

// ── 工具 ───────────────────────────────────────────

/** 解析角色码（自动转换 R-code → RoleId） */
function resolveRole(roleCode: string): string {
  return ROLE_ALIASES[roleCode] || roleCode
}

/** 判断角色是否有某模块权限 */
export function roleHasModule(roleCode: string, module: ModuleKey): boolean {
  const resolved = resolveRole(roleCode)
  const modules = ROLE_MODULES[resolved]
  return modules ? modules.includes(module) : false
}

/** 获取角色可访问的模块列表 */
export function getRoleModules(roleCode: string): ModuleKey[] {
  return ROLE_MODULES[resolveRole(roleCode)] ?? []
}
