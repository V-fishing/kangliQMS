<script setup lang="ts">
import { computed } from 'vue'
import TraceTreeNode from '@/views/sqm/TraceTreeNode.vue'
import { nodeTypeLabel, typeTagType, downstreamAddableOf } from '../composables/useTrace'
import type { TraceNodeTreeVO, TraceDirectionNode } from '@/types/sqm'

const props = defineProps<{
  modelValue: boolean
  title: string
  tree: TraceNodeTreeVO | null
  upTree: TraceNodeTreeVO | null
  selectedNode: TraceNodeTreeVO | null
  traceDir: 'all' | 'forward' | 'backward'
  directionNodes: TraceDirectionNode[]
  dirLabel: string
  treeFocusId: string | null
  treePathSet: string[]
  treeLoadError: string | null
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'add-component', kind: 'raw' | 'semi' | 'ship'): void
  (e: 'add-customer'): void
  (e: 'bind-upstream'): void
  (e: 'detail', id: string): void
  (e: 'select', node: TraceNodeTreeVO): void
  (e: 'change-dir', v: 'all' | 'forward' | 'backward'): void
  (e: 'focus', id: string): void
  (e: 'refresh'): void
}>()

const addable = computed(() => downstreamAddableOf(props.selectedNode?.nodeType))
const canBind = computed(() => !!props.selectedNode && props.selectedNode.nodeType !== 'incoming')
// raw 与 incoming 不需要"合格资质"标签
const focusName = computed(() => props.selectedNode?.nodeName || props.selectedNode?.batchNo || '')

function close() {
  emit('update:modelValue', false)
}
function onDirChange(v: 'all' | 'forward' | 'backward') {
  emit('change-dir', v)
}
function focus(id?: string) {
  if (id) emit('focus', id)
}
</script>

<template>
  <el-drawer
    :model-value="modelValue"
    :title="'追溯树：' + title"
    size="64%"
    @update:model-value="close"
    :destroy-on-close="true"
  >
    <template #header>
      <div class="wb-head">
        <span class="wb-title">追溯树：{{ title }}</span>
        <div class="wb-actions">
          <el-button v-if="addable.raw" type="success" size="small" plain @click="emit('add-component', 'raw')">＋ 添加来料</el-button>
          <el-button v-if="addable.semi" type="success" size="small" plain @click="emit('add-component', 'semi')">＋ 添加半成品</el-button>
          <el-button v-if="addable.ship" type="success" size="small" plain @click="emit('add-component', 'ship')">＋ 添加成品</el-button>
          <el-button v-if="addable.customer" type="warning" size="small" plain @click="emit('add-customer')">＋ 添加客户出货</el-button>
          <el-button v-if="canBind" type="primary" size="small" plain @click="emit('bind-upstream')">＋ 绑定上游节点</el-button>
          <el-button
            v-if="selectedNode"
            size="small"
            @click="emit('detail', selectedNode.id)"
          >查看「{{ focusName }}」明细</el-button>
          <el-button size="small" @click="emit('refresh')">刷新树</el-button>
        </div>
      </div>
    </template>

    <div class="wb-content">
      <div class="wb-link-tip">
        提示：在 <b>上游节点</b> 上点「添加」并选「引用已有节点」，即可把已存在的孤立节点挂为其下游；
        例如选中<b>物料</b>→「添加半成品」→「引用已有节点」= 把已有半成品绑定为该物料的下游。
      </div>

      <div v-if="treeLoadError" class="wb-warn">⚠ {{ treeLoadError }}</div>

      <div class="wb-main">
        <div class="wb-tree-pane">
          <div class="wb-tree-pane-title up">↑ 上游组成（来料 / 半成品 / 成品）</div>
          <div v-if="upTree" class="wb-tree-canvas">
            <TraceTreeNode
              :node="upTree"
              :focus-id="treeFocusId"
              :path-set="treePathSet"
              @detail="(n: TraceNodeTreeVO) => emit('select', n)"
            />
          </div>
          <div v-else class="wb-tree-empty">无上游组成（该节点为根节点）</div>
        </div>

        <div class="wb-tree-pane">
          <div class="wb-tree-pane-title down">⬇ 下游去向（加工 / 出货 / 客户）</div>
          <div v-if="tree" class="wb-tree-canvas">
            <TraceTreeNode
              :node="tree"
              :focus-id="treeFocusId"
              :path-set="treePathSet"
              @detail="(n: TraceNodeTreeVO) => emit('select', n)"
            />
          </div>
          <div v-else class="wb-tree-empty">无下游数据</div>
        </div>
      </div>

      <el-divider />

      <div class="wb-dir">
        <div class="wb-dir-head">
          <span>{{ dirLabel }}（按层级顺序）</span>
          <el-radio-group :model-value="traceDir" size="small" @change="onDirChange">
            <el-radio-button value="all">全部</el-radio-button>
            <el-radio-button value="forward">正向</el-radio-button>
            <el-radio-button value="backward">反向</el-radio-button>
          </el-radio-group>
        </div>
        <div v-if="directionNodes.length" class="wb-dir-list">
          <span
            v-for="n in directionNodes"
            :key="n.id"
            class="wb-dir-chip"
            :class="{ focus: n.id === treeFocusId }"
            @click="focus(n.id)"
          >
            <el-tag size="small" :type="typeTagType(n.nodeType)">{{ nodeTypeLabel(n.nodeType) }}</el-tag>
            <span class="wb-dir-name">{{ n.nodeName }}<template v-if="n.batchNo"> / {{ n.batchNo }}</template></span>
          </span>
        </div>
        <el-empty v-else description="暂无追溯路径" :image-size="48" />
      </div>
    </div>
  </el-drawer>
</template>

<style scoped>
.wb-head { display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 12px; }
.wb-title { font-weight: 600; }
.wb-actions { display: flex; flex-wrap: wrap; gap: 6px; }
.wb-content { padding: 4px 0; }
.wb-link-tip {
  background: #f0f9ff; border: 1px solid #bae6fd; color: #075985;
  padding: 8px 10px; border-radius: 6px; font-size: 12px; line-height: 1.5; margin-bottom: 10px;
}
.wb-warn { color: #b45309; font-size: 13px; margin-bottom: 10px; }
.wb-main { display: flex; gap: 16px; align-items: flex-start; }
.wb-tree-pane { flex: 1; min-width: 0; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; }
.wb-tree-pane-title { font-weight: 600; margin-bottom: 8px; font-size: 13px; }
.wb-tree-pane-title.up { color: #2563eb; }
.wb-tree-pane-title.down { color: #16a34a; }
.wb-tree-empty { color: #94a3b8; font-size: 12px; padding: 12px 0; text-align: center; }
.wb-dir-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.wb-dir-list { display: flex; flex-wrap: wrap; gap: 8px; }
.wb-dir-chip {
  display: inline-flex; align-items: center; gap: 6px;
  border: 1px solid #e5e7eb; border-radius: 16px; padding: 3px 10px; cursor: pointer; background: #fff;
}
.wb-dir-chip.focus { border-color: #2563eb; background: #eff6ff; }
.wb-dir-name { font-size: 12px; }
</style>
