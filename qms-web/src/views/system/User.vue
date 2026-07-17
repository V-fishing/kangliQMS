<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { systemApi } from '@/api'
import { MOCK_ORGS } from '@/mock/system'
import { ROLES } from '@/mock/roles'
import type { SysUser } from '@/types/system'

const users = ref<SysUser[]>([])
const orgs = ref(MOCK_ORGS)

onMounted(async () => (users.value = await systemApi.getUsers()))

const defaultProps = { children: 'children', label: 'name' }

// 构建组织树
const orgTree = ref(buildOrgTree(orgs.value, ''))
function buildOrgTree(list: typeof orgs, parentId: string) {
  return list.filter(o => o.parentId === parentId).map(o => ({ ...o, children: buildOrgTree(list, o.id) }))
}

const stColor = { 'active': '#2f7d32', 'disabled': '#c0392b' }
</script>

<template>
  <div class="system-user">
    <el-row :gutter="14">
      <el-col :span="6">
        <div class="qms-card">
          <div class="card-h"><h3>组织架构</h3></div>
          <div class="card-b">
            <el-tree :data="orgTree" :props="defaultProps" default-expand-all @node-click="() => {}" />
          </div>
        </div>
      </el-col>
      <el-col :span="18">
        <div class="qms-card">
          <div class="card-h"><h3>用户列表</h3><el-button type="primary" size="small">新增用户</el-button></div>
          <el-table :data="users" border size="small">
            <el-table-column prop="id" label="工号" width="70" />
            <el-table-column prop="name" label="姓名" width="80" />
            <el-table-column prop="account" label="账号" width="80" />
            <el-table-column prop="dept" label="部门" width="100" />
            <el-table-column label="角色" width="100">
              <template #default="{ row }">
                {{ ROLES.find(r => r.id === row.role)?.name ?? row.role }}
              </template>
            </el-table-column>
            <el-table-column label="状态" width="70">
              <template #default="{ row }">
                <span class="pill" :style="{ background: stColor[row.status as 'active'|'disabled'] + '20', color: stColor[row.status as 'active'|'disabled'] }">{{ row.status === 'active' ? '启用' : '停用' }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120">
              <template #default><el-button size="small">编辑</el-button><el-button size="small" type="danger">停用</el-button></template>
            </el-table-column>
          </el-table>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped lang="scss">
.card-h { padding: 10px 14px; border-bottom: 1px solid #e1e8f0; display: flex; align-items: center; gap: 8px; background: #fafcff; h3 { font-size: 13.5px; flex: 1; } }
.card-b { padding: 10px; }
.pill { display: inline-block; padding: 2px 8px; border-radius: 10px; font-size: 10px; font-weight: 600; }
</style>
