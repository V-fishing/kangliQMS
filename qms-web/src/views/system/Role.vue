<script setup lang="ts">
import { ref } from 'vue'
import { ROLES } from '@/mock/roles'

const roles = ref(ROLES)
const selectedRole = ref(ROLES[0])

// 权限树
const permissions = [
  { id: 'fia', label: '首件检验', children: [
    { id: 'fia:view', label: '查看' },
    { id: 'fia:entry', label: '录入' },
    { id: 'fia:approve', label: '审批' },
  ]},
  { id: 'spc', label: '过程能力', children: [
    { id: 'spc:view', label: '查看' },
    { id: 'spc:config', label: '配置' },
  ]},
  { id: 'ncm', label: '不良管理', children: [
    { id: 'ncm:view', label: '查看' },
    { id: 'ncm:entry', label: '录入' },
    { id: 'ncm:8d', label: '8D管理' },
  ]},
  { id: 'sqm', label: '供应商质量', children: [
    { id: 'sqm:view', label: '查看' },
    { id: 'sqm:audit', label: '审核' },
  ]},
  { id: 'system', label: '系统管理', children: [
    { id: 'system:user', label: '用户管理' },
    { id: 'system:role', label: '角色管理' },
    { id: 'system:config', label: '配置中心' },
  ]},
]

const defaultProps = { children: 'children', label: 'label' }
</script>

<template>
  <div class="system-role">
    <el-row :gutter="14">
      <el-col :span="10">
        <div class="qms-card">
          <div class="card-h"><h3>角色列表</h3></div>
          <el-table :data="roles" border size="small" @row-click="(r: typeof roles[0]) => selectedRole = r">
            <el-table-column label="" width="40">
              <template #default="{ row }"><span :style="{ color: row.color }">●</span></template>
            </el-table-column>
            <el-table-column prop="name" label="角色名称" width="100" />
            <el-table-column prop="perm" label="权限描述" />
          </el-table>
        </div>
      </el-col>
      <el-col :span="14">
        <div class="qms-card">
          <div class="card-h"><h3>权限配置 - {{ selectedRole.name }}</h3></div>
          <div class="card-b">
            <el-tree
              :data="permissions"
              :props="defaultProps"
              show-checkbox
              default-expand-all
              node-key="id"
            />
            <div class="actions">
              <el-button type="primary">保存权限</el-button>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<style scoped lang="scss">
.card-h { padding: 10px 14px; border-bottom: 1px solid #e1e8f0; background: #fafcff; h3 { font-size: 13.5px; } }
.card-b { padding: 14px; }
.actions { margin-top: 14px; }
</style>
