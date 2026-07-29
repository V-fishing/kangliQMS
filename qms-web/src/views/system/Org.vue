<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { orgsApi } from '@/api'
import { usePermission } from '@/stores/permission'
import type { SysOrg } from '@/api/types/uop'

const permStore = usePermissionStore()
const can = (code: string) => permStore.hasOp(code)

const treeData = ref<SysOrg[]>([])
const loading = ref(false)
const treeProps = { children: 'children', label: 'orgName' }

const dialogVisible = ref(false)
const form = ref({ orgCode: '', orgName: '', orgType: '工厂', parentId: '', sortOrder: 0 })
const formRef = ref()
const selectedNode = ref<SysOrg | null>(null)

function openCreate(node?: SysOrg) {
  selectedNode.value = node || null
  form.value = { orgCode: '', orgName: '', orgType: '工厂', parentId: node?.id || '', sortOrder: 0 }
  dialogVisible.value = true
}
async function handleSave() {
  await formRef.value?.validate()
  await orgsApi.create(form.value)
  ElMessage.success('创建成功')
  dialogVisible.value = false
  fetchData()
}
async function handleDelete(node: SysOrg) {
  await ElMessageBox.confirm(`确认删除组织「${node.orgName}」？`, '警告', { type: 'warning' })
  await orgsApi.delete(node.id)
  ElMessage.success('已删除')
  fetchData()
}
function handleNodeClick(node: SysOrg) { selectedNode.value = node }

async function fetchData() {
  loading.value = true
  try { treeData.value = await orgsApi.tree() || [] } finally { loading.value = false }
}

const orgTypes = ['公司', '工厂', '车间', '产线', '工位']
onMounted(() => fetchData())
</script>

<template>
  <div class="system-org">
    <el-row :gutter="14">
      <el-col :span="12">
        <el-card shadow="never">
          <template #header>
            <div class="card-header">
              <span>组织架构</span>
              <el-button v-if="can('system.org.list')" type="primary" size="small" @click="openCreate()">+ 新建</el-button>
            </div>
          </template>
          <el-tree :data="treeData" :props="treeProps" default-expand-all v-loading="loading"
            @node-click="handleNodeClick" highlight-current>
            <template #default="{ data }">
              <span class="tree-node">
                <span>{{ data.orgName }}</span>
                <el-tag size="small" type="info">{{ data.orgType }}</el-tag>
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
            <el-descriptions-item label="编码">{{ selectedNode.orgCode }}</el-descriptions-item>
            <el-descriptions-item label="名称">{{ selectedNode.orgName }}</el-descriptions-item>
            <el-descriptions-item label="类型">{{ selectedNode.orgType }}</el-descriptions-item>
            <el-descriptions-item label="排序">{{ selectedNode.sortOrder }}</el-descriptions-item>
            <el-descriptions-item label="父节点">{{ selectedNode.parentId || '(根节点)' }}</el-descriptions-item>
          </el-descriptions>
        </el-card>
      </el-col>
    </el-row>
    <el-dialog v-model="dialogVisible" title="新建组织" width="400px">
      <el-form ref="formRef" :model="form" label-width="80px">
        <el-form-item label="编码" required><el-input v-model="form.orgCode" /></el-form-item>
        <el-form-item label="名称" required><el-input v-model="form.orgName" /></el-form-item>
        <el-form-item label="类型"><el-select v-model="form.orgType"><el-option v-for="t in orgTypes" :key="t" :label="t" :value="t" /></el-select></el-form-item>
        <el-form-item label="父节点"><el-input v-model="form.parentId" placeholder="留空=根节点" /></el-form-item>
        <el-form-item label="排序"><el-input-number v-model="form.sortOrder" :min="0" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="dialogVisible = false">取消</el-button><el-button type="primary" @click="handleSave">确定</el-button></template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.system-org { padding: 16px; }
.card-header { display: flex; align-items: center; justify-content: space-between; }
.tree-node { display: flex; align-items: center; gap: 8px; width: 100%; .node-actions { margin-left: auto; opacity: 0; } &:hover .node-actions { opacity: 1; } }
</style>
