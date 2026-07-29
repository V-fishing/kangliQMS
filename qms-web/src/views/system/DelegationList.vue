<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { delegationsApi } from '@/api'
import { usePermission } from '@/stores/permission'
import type { SysDelegation } from '@/api/types/uop'

const permStore = usePermissionStore()
const can = (code: string) => permStore.hasOp(code)
const list = ref<SysDelegation[]>([])
const loading = ref(false)

async function fetchData() {
  loading.value = true
  try { list.value = await delegationsApi.list() || [] } finally { loading.value = false }
}
async function handleRevoke(row: SysDelegation) {
  await ElMessageBox.confirm('确认撤销该委派？', '警告', { type: 'warning' })
  await delegationsApi.revoke(row.id)
  ElMessage.success('已撤销')
  fetchData()
}

const statusTagType: Record<string, string> = { '生效': 'success', '已过期': 'info', '已撤销': 'warning' }

onMounted(() => fetchData())
</script>

<template>
  <div class="system-delegation">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>委派管理</span>
          <el-button v-if="can('system.delegation.manage')" type="primary" size="small">+ 新建委派</el-button>
        </div>
      </template>
      <el-table :data="list" v-loading="loading" border stripe size="small">
        <el-table-column prop="delegatorId" label="委托人" width="200" />
        <el-table-column prop="delegateeId" label="被委托人" width="200" />
        <el-table-column prop="roleId" label="角色" width="200" />
        <el-table-column label="开始" width="120"><template #default="{ row }">{{ row.startAt?.slice(0,10) }}</template></el-table-column>
        <el-table-column label="结束" width="120"><template #default="{ row }">{{ row.endAt?.slice(0,10) }}</template></el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }"><el-tag :type="statusTagType[row.status] || 'info'" size="small">{{ row.status }}</el-tag></template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button v-if="row.status === '生效' && can('system.delegation.manage')" link type="danger" size="small" @click="handleRevoke(row)">撤销</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.system-delegation { padding: 16px; }
.card-header { display: flex; align-items: center; justify-content: space-between; }
</style>
