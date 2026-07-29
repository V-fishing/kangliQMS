/** 登录接口返回 */
export interface LoginResponse {
  accessToken: string
  tokenType: string
  expiresIn: number
}

/** 当前登录用户（对应后端 CurrentUserVo） */
export interface CurrentUserVo {
  userId: string
  username: string
  orgId: string | null
  dataScope: string
  permissions: string[]
}
