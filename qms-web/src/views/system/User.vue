<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { usersApi, rolesApi, orgsApi } from '@/api'
import { usePermission } from '@/stores/permission'
import type { SysUser, SysRole, SysOrg, CreateUserRequest, UpdateUserRequest } from '@/api/types/uop'

const permStore = usePermissionStore()
const can = (code: string) => permStore.hasOp(code)

// ── Data ──
const users = ref<SysUser[]>([])
const orgs = ref<SysOrg[]>([])
const roles = ref<SysRole[]>([])
const loading = ref(false)

// ── Org tree ──
function buildTree(list: SysOrg[], parentId = ''): SysOrg[] {
  return list
    .filter((o) => (o.parentId || '') === parentId)
    .map((o) => ({ ...o, children: buildTree(list, o.id) as any }))
}
const orgTree = ref<SysOrg[]>([])
const treeProps = { children: 'children', label: 'orgName' }

// ── Status ──
const statusTagType: Record<string, 'success' | 'danger' | 'warning'> = {
  '启用': 'success', '停用': 'danger', '锁定': 'warning',
}

// ── User form ──
const dialogVisible = ref(false)
const isEdit = ref(false)
const form = ref<CreateUserRequest & { id?: string }>({
  username: '', password: '', realName: '', orgId: '', status: '启用',
})
const formRef = ref()

function openCreate() {
  isEdit.value = false
  form.value = { username: '', password: '', realName: '', orgId: '', status: '启用' }
  dialogVisible.value = true
}
function openEdit(row: SysUser) {
  isEdit.value = true
  form.value = { id: row.id, username: row.username, realName: row.realName, orgId: row.orgId || '', status: row.status }
  dialogVisible.value = true
}
async function handleSave() {
  await formRef.value?.validate()
  if (isEdit.value) {
    const data: UpdateUserRequest = { realName: form.value.realName, orgId: form.value.orgId || undefined, status: form.value.status }
    await usersApi.update(form.value.id!, data)
    ElMessage.success('更新成功')
  } else {
    await usersApi.create(form.value as CreateUserRequest)
    ElMessage.success('创建成功')
  }
  dialogVisible.value = false
  fetchUsers()
}

// ── Delete ──
async function handleDelete(row: SysUser) {
  await ElMessageBox.confirm(`确认删除用户 ${row.realName || row.username}？`, '提示', { type: 'warning' })
  await usersApi.delete(row.id)
  ElMessage.success('已删除')
  fetchUsers()
}

// ── Reset password ──
const pwdVisible = ref(false)
const pwdUserId = ref('')
const newPassword = ref('')
async function openResetPwd(row: SysUser) {
  pwdUserId.value = row.id
  newPassword.value = ''
  pwdVisible.value = true
}
async function handleResetPwd() {
  if (!newPassword.value) { ElMessage.warning('请输入新密码'); return }
  await usersApi.resetPassword(pwdUserId.value, newPassword.value)
  ElMessage.success('密码已重置')
  pwdVisible.value = false
}

// ── Assign roles ──
const roleVisible = ref(false)
const roleUserId = ref('')
const roleList = ref<string[]>([])
const userRoles = ref<string[]>([])
async function openAssignRoles(row: SysUser) {
  roleUserId.value = row.id
  roleList.value = []
  try {
    const r = await usersApi.getRoles(row.id)
    userRoles.value = r.map((x) => x.id)
  } catch { userRoles.value = [] }
  roleVisible.value = true
}
async function handleSaveRoles() {
  await usersApi.assignRoles(roleUserId.value, roleList.value.length ? roleList.value : userRoles.value)
  ElMessage.success('角色已更新')
  roleVisible.value = false
}

// ── Fetch ──
async function fetchUsers() {
  loading.value = true
  try {
    const [u, o, r] = await Promise.all([
      usersApi.list(), orgsApi.list(), rolesApi.list().catch(() => [] as SysRole[]),
    ])
    users.value = u
    orgs.value = o
    orgTree.value = buildTree(o)
    roles.value = r
    userRoles.value = r.map((x) => x.id) // default to all
  } finally { loading.value = false }
}

// ── Helpers ──
function orgName(orgId: string | null) {
  if (!orgId) return '集团(全部)'
  return orgs.value.find((o) => o.id === orgId)?.orgName || orgId
}

onMounted(() => fetchUsers())
</script>

<template>
  <div class="system-user">
    <el-row :gutter="14">
      <el-col :span="5">
        <el-card header="组织架构" shadow="never">
          <el-tree :data="orgTree" :props="treeProps" default-expand-all />
        </el-card>
      </el-col>
      <el-col :span="19">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>用户列表</span>
              <el-button v-if="can('system.user.create')" type="primary" size="small" @click="openCreate">
                + 新增用户
              </el-button>
            </div>
          </template>
          <el-table :data="users" v-loading="loading" border stripe size="small">
            <el-table-column prop="username" label="账号" width="100" />
            <el-table-column prop="realName" label="姓名" width="100" />
            <el-table-column label="组织" width="140">
              <template #default="{ row }">{{ orgName(row.orgId) }}</template>
            </el-table-column>
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="statusTagType[row.status] || 'info'" size="small">{{ row.status }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="创建时间" width="160">
              <template #default="{ row }">{{ row.createdAt?.slice(0, 16) }}</template>
            </el-table-column>
            <el-table-column label="操作" min-width="260" fixed="right">
              <template #default="{ row }">
                <el-button v-if="can('system.user.create')" link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
                <el-button v-if="can('system.role.assign')" link type="success" size="small" @click="openAssignRoles(row)">角色</el-button>
                <el-button v-if="can('system.user.create')" link type="warning" size="small" @click="openResetPwd(row)">重置密码</el-button>
                <el-button v-if="can('system.user.delete')" link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
        </el-card>
      </el-col>
    </el-row>

    <!-- Create/Edit dialog -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑用户' : '新增用户'" width="480px">
      <el-form ref="formRef" :model="form" label-width="80px">
        <el-form-item label="账号" required><el-input v-model="form.username" :disabled="isEdit" /></el-form-item>
        <el-form-item v-if="!isEdit" label="密码" required><el-input v-model="form.password" type="password" show-password /></el-form-item>
        <el-form-item label="姓名" required><el-input v-model="form.realName" /></el-form-item>
        <el-form-item label="组织"><el-input v-model="form.orgId" placeholder="留空=集团管理员" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status"><el-option label="启用" value="启用" /><el-option label="停用" value="停用" /></el-select>
        </el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" @click="handleSave">确定</el-button></template>
    </el-dialog>

    <!-- Reset password dialog -->
    <el-dialog v-model="pwdVisible" title="重置密码" width="360px">
      <el-input v-model="newPassword" type="password" show-password placeholder="新密码" />
      <template #footer><el-button @click="pwdVisible = false">取消</el-button><el-button type="primary" @click="handleResetPwd">确定</el-button></template>
    </el-dialog>

    <!-- Assign roles dialog -->
    <el-dialog v-model="roleVisible" title="分配角色" width="400px">
      <el-checkbox-group v-model="userRoles">
        <el-checkbox v-for="r in roles" :key="r.id" :value="r.id" :label="r.roleName" />
      </el-checkbox-group>
      <template #footer><el-button @click="roleVisible = false">取消</el-button><el-button type="primary" @click="handleSaveRoles">保存</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.system-user { padding: 16px; }
.card-header { display: flex; align-items: center; justify-content: space-between; }
</style>
