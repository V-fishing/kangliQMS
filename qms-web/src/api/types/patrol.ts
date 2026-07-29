/**
 * Patrol (巡检) API Types
 */

// ── Route ──

export interface PatlRoute {
  id: string
  orgId: string
  routeCode: string
  routeName: string
  procName: string
  freq: string
  status: string
  checkpoints?: PatlCheckpoint[]
  createdAt: string
}

export interface PatlRouteVo extends PatlRoute {
  checkpoints: PatlCheckpointVo[]
}

export interface PatlCheckpoint {
  id: string
  routeId: string
  seq: number
  checkpointName: string
  location: string
}

export interface PatlCheckpointVo extends PatlCheckpoint {
  items: PatlCheckItem[]
}

export interface PatlCheckItem {
  id: string
  checkpointId: string
  seq: number
  itemName: string
  checkMethod: string
  expectedValue: string
}

// ── Task ──

export interface PatlTask {
  id: string
  orgId: string
  routeId: string
  shift: string
  planTime: string
  status: string
  createdAt: string
}

export interface PatlTaskVo extends PatlTask {
  records: PatlRecord[]
  route: PatlRoute
}

export interface PatlRecord {
  id: string
  taskId: string
  checkpointId: string
  checkpointName: string
  result: string
  remark: string
  createdAt: string
}

// ── Abnormal ──

export interface PatlAbnormal {
  id: string
  recordId: string
  taskId: string
  routeId: string
  checkpointName: string
  itemName: string
  abnormalDesc: string
  level: string
  status: string
  handleRemark: string
  createdAt: string
}
