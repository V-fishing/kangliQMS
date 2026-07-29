/**
 * 权限类型定义 — 模块 + 卡片两层粒度
 */

/** 业务模块标识（与路由 meta.module + 后端 module_code 对齐） */
export type ModuleKey =
  | 'overview'    // 总览看板
  | 'fia'         // 首件检验（产线首件）
  | 'incomingCheck'  // 供应商来料首件检验
  | 'spc'         // SPC 过程能力
  | 'ncm'         // 不良管理
  | 'sqm'         // 供应商质量
  | 'patrol'      // 巡检管理
  | 'archive'     // 归档查询
  | 'system'      // 系统管理
  | 'asm'         // 售后服务（待开发）
  | 'tlm'         // 工装管理（待开发）
  | 'msm'         // 计量管理（待开发）
  | 'qsm'         // 体系管理（待开发）

/**
 * 卡片标识 — 模块内的子页面/功能卡片
 *
 * 粒度介于 ModuleKey（整模块）和操作码（单按钮）之间。
 * 路由守卫用卡片级映射精确控制子页面访问。
 */
export type CardKey =
  // FIA 首件检验
  | 'fia.dash'      | 'fia.tasks'     | 'fia.entry'
  | 'fia.approve'   | 'fia.stdlib'    | 'fia.trace'
  | 'fia.supplier'
  // SPC 过程能力
  | 'spc.dash'      | 'spc.control'   | 'spc.collect'
  | 'spc.alarm'     | 'spc.capability'
  // NCM 不良管理
  | 'ncm.dash'      | 'ncm.dict'      | 'ncm.entry'
  | 'ncm.analysis'  | 'ncm.trend'     | 'ncm.compare'
  | 'ncm.8d'
  // SQM 供应商质量
  | 'sqm.dash'      | 'sqm.lifecycle' | 'sqm.audit'
  | 'sqm.change'    | 'sqm.abnormal'  | 'sqm.fmea'
  | 'sqm.trace'     | 'sqm.capa'
  // Patrol 巡检
  | 'patrol.routes' | 'patrol.tasks'  | 'patrol.abnormals'
  // IncomingCheck 供应商来料首件检验
  | 'incomingCheck.dash'   | 'incomingCheck.tasks'
  | 'incomingCheck.entry'  | 'incomingCheck.approve'
  // System 系统管理
  | 'system.user'   | 'system.role'   | 'system.menu'
  | 'system.org'    | 'system.config'
