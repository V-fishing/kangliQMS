<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { menusApi } from '@/api'
import { usePermission } from '@/stores/permission'
import type { SysMenu } from '@/api/types/uop'

const permStore = usePermissionStore()
const can = (code: string) => permStore.hasOp(code)

const treeData = ref<SysMenu[]>([])
const loading = ref(false)
const treeProps = { children: 'children', label: 'menuName' }

const dialogVisible = ref(false)
const form = ref({ menuCode: '', menuName: '', menuType: '菜单', path: '', component: '', icon: '', parentId: '', sortOrder: 0, visible: true })
const formRef = ref()
const selectedNode = ref<SysMenu | null>(null)

function openCreate(node?: SysMenu) {
  selectedNode.value = node || null
  form.value = { menuCode: '', menuName: '', menuType: '菜单', path: '', component: '', icon: '', parentId: node?.id || '', sortOrder: 0, visible: true }
  dialogVisible.value = true
}
async function handleSave() {
  await formRef.value?.validate()
  await menusApi.create(form.value)
  ElMessage.success('创建成功')
  dialogVisible.value = false
  fetchData()
}
async function handleDelete(node: SysMenu) {
  await ElMessageBox.confirm(`确认删除菜单「${node.menuName}」？子级也会一并受影响。`, '警告', { type: 'warning' })
  await menusApi.delete(node.id)
  ElMessage.success('已删除')
  fetchData()
}
function handleNodeClick(node: SysMenu) { selectedNode.value = node }

async function fetchData() {
  loading.value = true
  try { treeData.value = await menusApi.tree() || [] } finally { loading.value = false }
}

const menuTypes = ['目录', '菜单', '按钮', '卡片']

onMounted(() => fetchData())
</script>

<template>
  <div class="system-menu">
    <el-row :gutter="14">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>菜单树</span>
              <el-button v-if="can('system.menu.create')" type="primary" size="small" @click="openCreate()">+ 新建</el-button>
            </div>
          </template>
          <el-tree :data="treeData" :props="treeProps" default-expand-all v-loading="loading"
            @node-click="handleNodeClick" highlight-current>
            <template #default="{ data }">
              <span class="tree-node">
                <span>{{ data.menuName }}</span>
                <el-tag size="small" :type="data.menuType === '目录' ? 'warning' : data.menuType === '按钮' ? 'danger' : 'info'">{{ data.menuType }}</el-tag>
                <span class="node-actions">
                  <el-button link type="primary" size="small" @click.stop="openCreate(data)">+</el-button>
                  <el-button link type="danger" size="small" @click.stop="handleDelete(data)">×</el-button>
                </span>
              </span>
            </template>
          </el-tree>
        </el-card>
      </el-col>
      <el-col :span="12">
        <el-card v-if="selectedNode" shadow="never" header="节点详情">
          <el-descriptions :column="1" border size="small">
            <el-descriptions-item label="权限码">{{ selectedNode.menuCode }}</el-descriptions-item>
            <el-descriptions-item label="名称">{{ selectedNode.menuName }}</el-descriptions-item>
            <el-descriptions-item label="类型">{{ selectedNode.menuType }}</el-descriptions-item>
            <el-descriptions-item label="路径">{{ selectedNode.path }}</el-descriptions-item>
            <el-descriptions-item label="组件">{{ selectedNode.component }}</el-descriptions-item>
            <el-descriptions-item label="图标">{{ selectedNode.icon }}</el-descriptions-item>
            <el-descriptions-item label="排序">{{ selectedNode.sortOrder }}</el-descriptions-item>
            <el-descriptions-item label="可见">{{ selectedNode.visible ? '是' : '否' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>
    <el-dialog v-model="dialogVisible" title="新建菜单" width="480px">
      <el-form ref="formRef" :model="form" label-width="80px">
        <el-form-item label="权限码" required><el-input v-model="form.menuCode" /></el-form-item>
        <el-form-item label="名称" required><el-input v-model="form.menuName" /></el-form-item>
        <el-form-item label="类型"><el-select v-model="form.menuType"><el-option v-for="t in menuTypes" :key="t" :label="t" :value="t" /></el-select></el-form-item>
        <el-form-item label="路径"><el-input v-model="form.path" placeholder="/fia/tasks" /></el-form-item>
        <el-form-item label="组件"><el-input v-model="form.component" placeholder="fia/Tasks" /></el-form-item>
        <el-form-item label="图标"><el-input v-model="form.icon" placeholder="📄" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sortOrder" :min="0" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" @click="handleSave">确定</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.system-menu { padding: 16px; }
.card-header { display: flex; align-items: center; justify-content: space-between; }
.tree-node { display: flex; align-items: center; gap: 8px; width: 100%; .node-actions { margin-left: auto; opacity: 0; } &:hover .node-actions { opacity: 1; } }
</style>
