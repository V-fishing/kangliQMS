/**
 * 角色 → 卡片映射
 *
 * 定义每个角色能访问模块内的哪些子页面/功能卡片（CardKey）。
 * 这是权限体系的第二层：模块打开后，哪些卡片可见。
 */

import type { CardKey, ModuleKey } from './types'
import { roleHasModule } from './role-modules'

// ── 角色 → 卡片 ──────────────────────────────────────

export const ROLE_CARDS: Record<string, CardKey[]> = {
  sysadmin: [
    'fia.dash','fia.tasks','fia.entry','fia.approve','fia.stdlib','fia.trace','fia.supplier',
    'incomingCheck.dash','incomingCheck.tasks','incomingCheck.entry','incomingCheck.approve',
    'spc.dash','spc.control','spc.collect','spc.alarm','spc.capability',
    'ncm.dash','ncm.dict','ncm.entry','ncm.analysis','ncm.trend','ncm.compare','ncm.8d',
    'sqm.dash','sqm.lifecycle','sqm.audit','sqm.change','sqm.abnormal','sqm.fmea','sqm.trace','sqm.capa',
    'patrol.routes','patrol.tasks','patrol.abnormals',
    'system.user','system.role','system.menu','system.org','system.config',
  ],

  inspector: [
    'fia.dash','fia.tasks','fia.entry',
    'incomingCheck.dash','incomingCheck.tasks','incomingCheck.entry',
    'spc.dash','spc.control','spc.collect',
    'ncm.dash','ncm.entry',
    'sqm.dash','sqm.abnormal','sqm.trace',
    'patrol.routes','patrol.tasks',
  ],

  shiftleader: [
    'fia.dash','fia.tasks','fia.approve',
    'spc.dash','spc.control','spc.collect','spc.alarm',
    'ncm.dash','ncm.entry','ncm.analysis','ncm.trend','ncm.8d',
    'sqm.dash','sqm.abnormal','sqm.trace','sqm.capa',
    'patrol.routes','patrol.tasks','patrol.abnormals',
    'system.user',
  ],

  sqe: [
    'incomingCheck.dash','incomingCheck.tasks','incomingCheck.entry',
    'ncm.dash','ncm.analysis','ncm.trend','ncm.compare',
    'sqm.dash','sqm.lifecycle','sqm.audit','sqm.change','sqm.abnormal','sqm.fmea','sqm.trace','sqm.capa',
  ],

  qmanager: [
    'fia.dash','fia.tasks','fia.entry','fia.approve','fia.stdlib','fia.trace','fia.supplier',
    'spc.dash','spc.control','spc.collect','spc.alarm','spc.capability',
    'ncm.dash','ncm.dict','ncm.entry','ncm.analysis','ncm.trend','ncm.compare','ncm.8d',
    'sqm.dash','sqm.lifecycle','sqm.audit','sqm.change','sqm.abnormal','sqm.fmea','sqm.trace','sqm.capa',
    'patrol.routes','patrol.tasks','patrol.abnormals',
    'system.user','system.role','system.menu','system.org','system.config',
  ],

  operator:    [] as CardKey[],
  aftersales:  [] as CardKey[],
  metrology:   [] as CardKey[],
  qualitysys:  [] as CardKey[],
  supplier:    ['sqm.dash','sqm.trace'],
}

// ── 工具 ───────────────────────────────────────────

import { ROLE_ALIASES } from './role-modules'

/** 判断角色是否有某卡片权限（卡片权限是模块权限的子集） */
export function roleHasCard(roleCode: string, card: CardKey): boolean {
  const resolved = ROLE_ALIASES[roleCode] || roleCode
  const module = card.split('.')[0] as ModuleKey
  if (!roleHasModule(resolved, module)) return false
  const cards = ROLE_CARDS[resolved]
  return cards ? cards.includes(card) : false
}
