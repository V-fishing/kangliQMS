/**
 * UOP (User-Org-Permission) API Types
 * Sources: .openapi.json components/schemas, backend entities
 */

// ── Auth ──

export interface LoginResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
}

export interface CurrentUserVo {
  userId: string
  username: string
  realName: string
  orgId: string | null
  dataScope: string
  permissions: string[]
  companies: CompanyInfo[]
  allowGroupView: boolean
}

export interface CompanyInfo {
  id: string
  code: string
  name: string
  permLevel: string
}

// ── User ──

export interface SysUser {
  id: string
  username: string
  realName: string
  orgId: string | null
  status: string           // 启用 | 停用 | 锁定
  failCount: number
  lockUntil: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateUserRequest {
  username: string
  password: string
  realName: string
  orgId?: string
  status?: string
}

export interface UpdateUserRequest {
  realName?: string
  orgId?: string
  status?: string
}

// ── Role ──

export interface SysRole {
  id: string
  roleCode: string
  roleName: string
  roleType: string            // 预置 | 自定义
  permDesc: string
  status: string
}

// ── Menu ──

export interface SysMenu {
  id: string
  parentId: string | null
  menuCode: string
  menuName: string
  menuType: string            // 目录 | 菜单 | 按钮 | 卡片
  path: string
  component: string
  icon: string
  sortOrder: number
  visible: boolean
  children?: SysMenu[]
}

// ── Org ──

export interface SysOrg {
  id: string
  orgCode: string
  orgName: string
  parentId: string | null
  orgType: string             // 公司 | 工厂 | 车间 | 产线 | 工位
  sortOrder: number
  status: string
}

export interface OrgTreeNode {
  id: string
  orgCode: string
  orgName: string
  parentId: string | null
  orgType: string
  sortOrder: number
  children: OrgTreeNode[]
}

// ── Dict ──

export interface SysDict {
  id: string
  dictType: string
  dictCode: string
  dictName: string
  sortOrder: number
  status: string
}

// ── Delegation ──

export interface SysDelegation {
  id: string
  delegatorId: string
  delegateeId: string
  roleId: string
  startAt: string
  endAt: string
  status: string              // 生效 | 已过期 | 已撤销
}
