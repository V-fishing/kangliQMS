/**
 * MSM 计量器具管理类型定义
 * 对应 SRS §16 计量器具管理流程
 */

export type GaugeStatus =
  | '合格'        // Qualified
  | '降级'        // Limited（校准降级精度不足）
  | '超期'        // Expired（超过校验周期）
  | '失准'        // Failed（校准失败）
  | '锁定'        // LockedState（系统自动锁定）
  | '维修中'      // RepairState
  | '报废'        // ScrapState

export interface Gauge {
  id: string
  code: string
  name: string
  category: string
  precision: string
  status: GaugeStatus
  /** 首次/上次校准日期 */
  calibDate: string
  /** 校验周期（月） */
  calibCycle: number
  /** 下次校准到期 */
  nextCalib: string
  /** 使用控制：合格允许使用 / 超期或不合格拒绝绑定（§16 UseControl） */
  useStatus: '允许使用' | '拒绝绑定'
  /** 维修记录（如有） */
  repairRecord: string
}

export type CalibStatus = '待校准' | '已生成' | '已完成'

export interface CalibPlan {
  id: string
  gaugeId: string
  gaugeName: string
  dueDate: string
  /** 到期自动生成计划并推送管理员（§16 CalibPlan.Notify） */
  status: CalibStatus
  notified: boolean
}

export interface MsmKpi {
  gaugeTotal: number
  qualified: number
  limited: number
  expired: number
  failed: number
  locked: number
  scrapped: number
  calibDue: number
}
