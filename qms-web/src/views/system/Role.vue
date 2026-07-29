<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { rolesApi, menusApi } from '@/api'
import { usePermission } from '@/stores/permission'
import type { SysRole, SysMenu } from '@/api/types/uop'

const router = useRouter()
const permStore = usePermissionStore()
const can = (code: string) => permStore.hasOp(code)

// ── Data ──
const roles = ref<SysRole[]>([])
const menus = ref<SysMenu[]>([])
const loading = ref(false)

// ── Dialog ──
const dialogVisible = ref(false)
const isEdit = ref(false)
const form = ref({ id: '', roleCode: '', roleName: '', roleType: '自定义', permDesc: '', status: '启用' })
const formRef = ref()

function openCreate() {
  isEdit.value = false
  form.value = { id: '', roleCode: '', roleName: '', roleType: '自定义', permDesc: '', status: '启用' }
  dialogVisible.value = true
}
function openEdit(row: SysRole) {
  isEdit.value = true
  form.value = { ...row, roleType: row.roleType || '自定义' }
  dialogVisible.value = true
}
async function handleSave() {
  await formRef.value?.validate()
  await rolesApi.save({
    id: form.value.id || undefined,
    roleCode: form.value.roleCode,
    roleName: form.value.roleName,
    roleType: form.value.roleType,
    permDesc: form.value.permDesc,
    status: form.value.status,
  })
  ElMessage.success(isEdit.value ? '更新成功' : '创建成功')
  dialogVisible.value = false
  fetchData()
}

// ── Delete ──
async function handleDelete(row: SysRole) {
  await ElMessageBox.confirm(`确认删除角色「${row.roleName}」？`, '警告', { type: 'warning' })
  await rolesApi.delete(row.id)
  ElMessage.success('已删除')
  fetchData()
}

// ── Navigate to permission config ──
function openPermission(row: SysRole) {
  router.push(`/system/role/${row.id}/permission`)
}

// ── Fetch ──
async function fetchData() {
  loading.value = true
  try {
    const [r, m] = await Promise.all([rolesApi.list(), menusApi.tree().catch(() => [] as SysMenu[])])
    roles.value = r
    menus.value = m
  } finally { loading.value = false }
}

const roleTypes = ['预置', '自定义']

onMounted(() => fetchData())
</script>

<template>
  <div class="system-role">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>角色管理</span>
          <el-button v-if="can('system.role.list')" type="primary" size="small" @click="openCreate">+ 新建角色</el-button>
        </div>
      </template>
      <el-table :data="roles" v-loading="loading" border stripe size="small">
        <el-table-column prop="roleCode" label="角色编码" width="130" />
        <el-table-column prop="roleName" label="角色名称" width="130" />
        <el-table-column prop="roleType" label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="row.roleType === '预置' ? 'warning' : 'info'" size="small">{{ row.roleType }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="permDesc" label="描述" min-width="200" />
        <el-table-column prop="status" label="状态" width="70" />
        <el-table-column label="操作" width="280" fixed="right">
          <template #default="{ row }">
            <el-button v-if="can('system.role.assign')" link type="success" size="small" @click="openPermission(row)">
              配置权限
            </el-button>
            <el-button v-if="can('system.role.list')" link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button v-if="can('system.role.list')" link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- Create/Edit dialog -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑角色' : '新建角色'" width="480px">
      <el-form ref="formRef" :model="form" label-width="80px">
        <el-form-item label="编码" required><el-input v-model="form.roleCode" /></el-form-item>
        <el-form-item label="名称" required><el-input v-model="form.roleName" /></el-form-item>
        <el-form-item label="类型">
          <el-select v-model="form.roleType"><el-option v-for="t in roleTypes" :key="t" :label="t" :value="t" /></el-select>
        </el-form-item>
        <el-form-item label="描述"><el-input v-model="form.permDesc" type="textarea" /></el-form-item>
        <el-form-item label="状态">
          <el-select v-model="form.status"><el-option label="启用" value="启用" /><el-option label="停用" value="停用" /></el-select>
        </el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" @click="handleSave">确定</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.system-role { padding: 16px; }
.card-header { display: flex; align-items: center; justify-content: space-between; }
</style>
