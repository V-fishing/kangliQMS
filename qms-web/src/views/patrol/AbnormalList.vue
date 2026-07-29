<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { patrolAbnormalsApi } from '@/api'
import { usePermission } from '@/stores/permission'
import type { PatlAbnormal } from '@/api/types/patrol'

const permStore = usePermissionStore()
const can = (code: string) => permStore.hasOp(code)
const abnormals = ref<PatlAbnormal[]>([])
const loading = ref(false)

async function fetchData() {
  loading.value = true
  try { abnormals.value = await patrolAbnormalsApi.list() || [] } finally { loading.value = false }
}
async function handleClose(row: PatlAbnormal) {
  await patrolAbnormalsApi.close(row.id)
  ElMessage.success('已关闭')
  fetchData()
}

onMounted(() => fetchData())
</script>

<template>
  <div class="patrol-abnormals">
    <el-card shadow="never" header="巡检异常">
      <el-table :data="abnormals" v-loading="loading" border stripe size="small">
        <el-table-column prop="checkpointName" label="检查点" width="120" />
        <el-table-column prop="itemName" label="检查项" width="120" />
        <el-table-column prop="abnormalDesc" label="异常描述" min-width="200" />
        <el-table-column prop="level" label="级别" width="80" />
        <el-table-column prop="status" label="状态" width="80" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button v-if="can('patl.task.create')" link type="primary" size="small" @click="handleClose(row)">关闭</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<style scoped lang="scss">
.patrol-abnormals { padding: 16px; }
</style>
