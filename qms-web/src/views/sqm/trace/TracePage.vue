<script setup lang="ts">
import { onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useTrace, TABS } from './composables/useTrace'
import { sqmApi } from '@/api/modules/sqm'
import TraceNodeTable from './components/TraceNodeTable.vue'
import TraceNodeFormDialog from './components/TraceNodeFormDialog.vue'
import TraceTreeDrawer from './components/TraceTreeDrawer.vue'
import BindUpstreamDialog from './components/BindUpstreamDialog.vue'
import NodeDetailDrawer from './components/NodeDetailDrawer.vue'
import TraceTreeNode from '@/views/sqm/TraceTreeNode.vue'
import type { TraceNodeSearchVO } from '@/types/sqm'

const trace = useTrace()
const {
  orgId,
  activeTab,
  currentTab,
  keyword,
  tablePage,
  tableSize,
  tableTotal,
  tableData,
  tableLoading,
  treeMode,
  rootBatchId,
  rootBatchOptions,
  rootBatchLoading,
  upTree,
  treeVisible,
  treeTitle,
  tree,
  treeFocusId,
  treePathSet,
  treeLoadError,
  selectedNode,
  traceDir,
  directionNodes,
  dirLabel,
  displayDirectionNodes,
  detailVisible,
  detailNodeId,
  formVisible,
  formMode,
  formNodeType,
  formInitial,
  formKey,
  submitting,
  bindUpstreamVisible,
  onTabChange,
  onSearch,
  onReset,
  onAddRoot,
  onRootBatchChange,
  remoteSearchBatch,
  loadRootTree,
  exitTreeMode,
  openTree,
  onTreeClose,
  onTreeSelect,
  openBindUpstream,
  confirmBindUpstream,
  applyDirection,
  focusDirectionNode,
  openDetail,
  onOpenRelatedNode,
  addComponent,
  addCustomer,
  onFormSave,
  init,
} = trace

// ---- 列表交互 ----
function onKeyword(v: string) {
  keyword.value = v
}
function onPageChange(p: number) {
  tablePage.value = p
  trace.loadTable()
}
async function editRow(row: TraceNodeSearchVO) {
  try {
    const detail = await sqmApi.getTraceNodeDetail(row.id)
    const node = detail?.node || {}
    const detailData = detail?.detail || {}
    const merged: Record<string, any> = { ...node, ...detailData, nodeType: row.nodeType, id: row.id }
    trace.openForm('create', row.nodeType, null, merged)
  } catch (e: any) {
    ElMessage.error('读取节点详情失败：' + (e?.message || e))
  }
}
// ---- 追溯方向切换 ----
function onDirChange(v: 'all' | 'forward' | 'backward') {
  traceDir.value = v
  applyDirection()
}

onMounted(() => {
  init()
})
</script>

<template>
  <div class="trace-page">
    <el-tabs v-model="activeTab" class="trace-tabs" @tab-change="onTabChange">
      <el-tab-pane v-for="t in TABS" :key="t.key" :name="t.key" :label="t.label" />
    </el-tabs>

    <!-- 批次根树模式（批次选择器驱动） -->
    <div v-if="treeMode" class="wb-batch">
      <div class="wb-batch-bar">
        <el-select
          v-model="rootBatchId"
          filterable
          remote
          reserve-keyword
          :remote-method="remoteSearchBatch"
          :loading="rootBatchLoading"
          placeholder="选择批次根节点查看整树"
          class="wb-batch-select"
          @change="onRootBatchChange"
        >
          <el-option v-for="o in rootBatchOptions" :key="o.value" :value="o.value" :label="o.label" />
        </el-select>
        <el-button @click="exitTreeMode">返回列表</el-button>
      </div>
      <div class="wb-batch-tree">
        <div class="wb-tree-pane">
          <div class="wb-tree-pane-title up">↑ 上游组成（来料 / 半成品 / 成品）</div>
          <TraceTreeNode
            v-if="upTree"
            :node="upTree"
            :focus-id="treeFocusId"
            :path-set="treePathSet"
            @detail="(n) => onTreeSelect(n)"
          />
          <div v-else class="wb-tree-empty">无上游（根节点）</div>
        </div>
        <div class="wb-tree-pane">
          <div class="wb-tree-pane-title down">⬇ 下游去向（加工 / 出货 / 客户）</div>
          <TraceTreeNode
            v-if="tree"
            :node="tree"
            :focus-id="treeFocusId"
            :path-set="treePathSet"
            @detail="(n) => onTreeSelect(n)"
          />
          <div v-else class="wb-tree-empty">无下游数据</div>
        </div>
      </div>
    </div>

    <!-- 列表模式 -->
    <TraceNodeTable
      v-else
      :data="tableData"
      :loading="tableLoading"
      :total="tableTotal"
      :page="tablePage"
      :size="tableSize"
      :keyword="keyword"
      :tab-label="currentTab.label"
      :tab-key="activeTab"
      @update:keyword="onKeyword"
      @search="onSearch"
      @reset="onReset"
      @add="onAddRoot"
      @edit="editRow"
      @trace="openTree"
      @detail="(row) => openDetail(row.id)"
      @page-change="onPageChange"
    />

    <!-- 树下钻抽屉 -->
    <TraceTreeDrawer
      v-model="treeVisible"
      :title="treeTitle"
      :tree="tree"
      :up-tree="upTree"
      :selected-node="selectedNode"
      :trace-dir="traceDir"
      :direction-nodes="displayDirectionNodes"
      :dir-label="dirLabel"
      :tree-focus-id="treeFocusId"
      :tree-path-set="treePathSet"
      :tree-load-error="treeLoadError"
      @add-component="addComponent"
      @add-customer="addCustomer"
      @bind-upstream="openBindUpstream"
      @detail="(id) => openDetail(id)"
      @select="onTreeSelect"
      @change-dir="onDirChange"
      @focus="(id) => focusDirectionNode(id)"
      @refresh="trace.loadTree()"
    />

    <!-- 节点表单弹窗 -->
    <TraceNodeFormDialog
      v-model="formVisible"
      :mode="formMode"
      :node-type="formNodeType"
      :parent-name="selectedNode?.nodeName || selectedNode?.batchNo || ''"
      :tab-label="currentTab.label"
      :initial="formInitial"
      :org-id="orgId"
      :submitting="submitting"
      :key="formKey"
      @save="onFormSave"
    />

    <!-- 绑定上游节点弹窗 -->
    <BindUpstreamDialog
      v-model="bindUpstreamVisible"
      :node="selectedNode"
      :org-id="orgId"
      @confirm="confirmBindUpstream"
    />

    <!-- 节点详情抽屉 -->
    <NodeDetailDrawer v-model="detailVisible" :node-id="detailNodeId" @open-node="onOpenRelatedNode" />
  </div>
</template>

<style scoped>
.trace-page { padding: 4px 0; }
.trace-tabs { margin-bottom: 12px; }
.wb-batch-bar { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; }
.wb-batch-select { width: 360px; }
.wb-batch-tree { display: flex; gap: 16px; align-items: flex-start; }
.wb-tree-pane { flex: 1; min-width: 0; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; }
.wb-tree-pane-title { font-weight: 600; margin-bottom: 8px; font-size: 13px; }
.wb-tree-pane-title.up { color: #2563eb; }
.wb-tree-pane-title.down { color: #16a34a; }
.wb-tree-empty { color: #94a3b8; font-size: 12px; padding: 12px 0; text-align: center; }
</style>
