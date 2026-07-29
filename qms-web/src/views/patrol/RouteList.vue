<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { patrolRoutesApi } from '@/api'
import { usePermission } from '@/stores/permission'
import type { PatlRoute } from '@/api/types/patrol'

const permStore = usePermissionStore()
const can = (code: string) => permStore.hasOp(code)
const routes = ref<PatlRoute[]>([])
const loading = ref(false)

async function fetchData() {
  loading.value = true
  try { routes.value = await patrolRoutesApi.list() || [] } finally { loading.value = false }
}
async function handleDelete(row: PatlRoute) {
  await ElMessageBox.confirm(`确认删除路线「${row.routeName}」？`, '警告', { type: 'warning' })
  await patrolRoutesApi.delete(row.id)
  ElMessage.success('已删除')
  fetchData()
}

onMounted(() => fetchData())
</script>

<template>
  <div class="patrol-routes">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>巡检路线</span>
          <el-button v-if="can('patl.route.create')" type="primary" size="small">+ 新建路线</el-button>
        </div>
      </template>
      <el-table :data="routes" v-loading="loading" border stripe size="small">
        <el-table-column prop="routeCode" label="路线编码" width="120" />
        <el-table-column prop="routeName" label="路线名称" width="160" />
        <el-table-column prop="procName" label="工序" width="120" />
        <el-table-column prop="freq" label="频率" width="100" />
        <el-table-column prop="status" label="状态" width="80" />
        <el-table-column label="检查点数" width="80">
          <template #default="{ row }">{{ row.checkpoints?.length || 0 }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small">编辑</el-button>
            <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.patrol-routes { padding: 16px; }
.card-header { display: flex; align-items: center; justify-content: space-between; }
</style>
