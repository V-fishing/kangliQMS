<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { patrolTasksApi } from '@/api'
import { usePermission } from '@/stores/permission'
import type { PatlTask } from '@/api/types/patrol'

const permStore = usePermissionStore()
const can = (code: string) => permStore.hasOp(code)
const tasks = ref<PatlTask[]>([])
const loading = ref(false)

async function fetchData() {
  loading.value = true
  try { tasks.value = await patrolTasksApi.list() || [] } finally { loading.value = false }
}
async function handleClose(row: PatlTask) {
  await patrolTasksApi.close(row.id)
  ElMessage.success('已关闭')
  fetchData()
}

onMounted(() => fetchData())
</script>

<template>
  <div class="patrol-tasks">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>巡检任务</span>
          <el-button v-if="can('patl.task.create')" type="primary" size="small">+ 新建任务</el-button>
        </div>
      </template>
      <el-table :data="tasks" v-loading="loading" border stripe size="small">
        <el-table-column prop="routeId" label="路线ID" width="200" />
        <el-table-column prop="shift" label="班次" width="100" />
        <el-table-column prop="planTime" label="计划时间" width="160" />
        <el-table-column prop="status" label="状态" width="80" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small">提交记录</el-button>
            <el-button link type="warning" size="small" @click="handleClose(row)">关闭</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.patrol-tasks { padding: 16px; }
.card-header { display: flex; align-items: center; justify-content: space-between; }
</style>
