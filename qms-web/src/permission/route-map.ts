/**
 * 路由 → 权限映射
 *
 * 将每个 Vue Router 的 route name 映射到对应的 ModuleKey 或 CardKey，
 * 供路由守卫在 beforeEach 中做权限校验。
 *
 * 搜索优先级：卡片级 → 模块级 → 放行
 */

import type { CardKey, ModuleKey } from './types'

/** 路由 name → CardKey（卡片级，优先匹配） */
export const ROUTE_CARD_MAP: Record<string, CardKey> = {
  // FIA
  FiaDash:      'fia.dash',
  FiaTasks:     'fia.tasks',
  FiaEntry:     'fia.entry',
  FiaApprove:   'fia.approve',
  FiaStdlib:    'fia.stdlib',
  FiaTrace:     'fia.trace',
  FiaSupplier:  'fia.supplier',

  // SPC
  SpcDash:        'spc.dash',
  SpcControl:     'spc.control',
  SpcCollect:     'spc.collect',
  SpcAlarm:       'spc.alarm',
  SpcCapability:  'spc.capability',

  // NCM
  NcmDash:     'ncm.dash',
  NcmDict:     'ncm.dict',
  NcmEntry:    'ncm.entry',
  NcmAnalysis: 'ncm.analysis',
  NcmTrend:    'ncm.trend',
  NcmCompare:  'ncm.compare',
  Ncm8D:       'ncm.8d',

  // SQM
  SqmDash:       'sqm.dash',
  SqmLifecycle:  'sqm.lifecycle',
  SqmAudit:      'sqm.audit',
  SqmChange:     'sqm.change',
  SqmAbnormal:   'sqm.abnormal',
  SqmFmea:       'sqm.fmea',
  SqmTrace:      'sqm.trace',
  SqmCapa:       'sqm.capa',

  // Patrol
  PatrolRoutes:     'patrol.routes',
  PatrolTasks:      'patrol.tasks',
  PatrolAbnormals:  'patrol.abnormals',

  // System
  SystemUser:       'system.user',
  SystemRole:       'system.role',
  RolePermission:   'system.role',
  SystemMenu:       'system.menu',
  SystemOrg:        'system.org',
  SystemConfig:     'system.config',
}

/** 路由 name → ModuleKey（卡片映射查不到时回退到模块级） */
export const ROUTE_MODULE_MAP: Record<string, ModuleKey> = {
  Overview:     'overview',
  Group:        'overview',
  ArchiveList:  'archive',
}

/** 无需权限校验的白名单路由 name */
export const PUBLIC_ROUTES = new Set(['Login', 'CompanySelect', 'NotFound'])
