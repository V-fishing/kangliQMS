<script setup lang="ts">
import { ref } from 'vue'

interface FlowNodeData {
  id: string
  label: string
  type: 'start' | 'task' | 'decision' | 'end'
  approver?: string
  status?: 'pending' | 'approved' | 'rejected'
}

const props = defineProps<{
  nodes: FlowNodeData[]
  edges?: { from: string; to: string; label?: string }[]
  readonly?: boolean
}>()

const emit = defineEmits<{
  select: [node: FlowNodeData]
}>()

const selectedId = ref('')

function selectNode(node: FlowNodeData) {
  selectedId.value = node.id
  emit('select', node)
}
</script>

<template>
  <div class="flow-designer">
    <div class="flow-canvas">
      <template v-for="(node, i) in nodes" :key="node.id">
        <div
          class="flow-node"
          :class="[node.type, node.status ?? '', { selected: selectedId === node.id }]"
          @click="selectNode(node)"
        >
          <div class="node-label">{{ node.label }}</div>
          <div v-if="node.approver" class="node-approver">{{ node.approver }}</div>
        </div>
        <div v-if="i < nodes.length - 1" class="flow-arrow">→</div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.flow-designer {
  background: #fafcff;
  border: 1px solid #e1e8f0;
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
}

.flow-canvas {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: max-content;
}

.flow-node {
  background: #fff;
  border: 2px solid #1e4d8b;
  border-radius: 8px;
  padding: 10px 16px;
  cursor: pointer;
  min-width: 120px;
  text-align: center;
  transition: 0.15s;
  flex-shrink: 0;

  &:hover { box-shadow: 0 4px 12px rgba(16, 42, 71, 0.15); }
  &.selected { box-shadow: 0 0 0 3px rgba(30, 77, 139, 0.2); }

  &.start { border-color: #2f7d32; border-radius: 20px; }
  &.end { border-color: #c0392b; border-radius: 20px; }
  &.decision { border-color: #d4a017; }
  &.approved { background: #e8f5e9; border-color: #2f7d32; }
  &.rejected { background: #fdecea; border-color: #c0392b; }

  .node-label { font-size: 13px; font-weight: 600; color: #1f2d3d; }
  .node-approver { font-size: 11px; color: #5a6b7e; margin-top: 2px; }
}

.flow-arrow {
  color: #1e4d8b;
  font-size: 20px;
  flex-shrink: 0;
}
</style>
