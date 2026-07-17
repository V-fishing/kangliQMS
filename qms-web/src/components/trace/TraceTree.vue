<script setup lang="ts">
import { ref } from 'vue'
import type { TraceNode } from '@/types/sqm'

const props = defineProps<{
  data: TraceNode[]
  direction?: 'forward' | 'backward'
}>()

const emit = defineEmits<{
  select: [node: TraceNode]
}>()

const expandedKeys = ref<Set<string>>(new Set())

function toggle(node: TraceNode) {
  if (expandedKeys.value.has(node.id)) {
    expandedKeys.value.delete(node.id)
  } else {
    expandedKeys.value.add(node.id)
  }
}

function isExpanded(id: string) {
  return expandedKeys.value.has(id)
}

const typeColors: Record<string, string> = {
  product: '#1e4d8b',
  batch: '#16a085',
  material: '#d4a017',
  ship: '#5b8def',
  process: '#8e44ad',
}
</script>

<template>
  <div class="trace-tree">
    <div class="dir-tabs">
      <button :class="{ on: direction === 'forward' }">正向追溯 →</button>
      <button :class="{ on: direction === 'backward' }">← 逆向追溯</button>
    </div>
    <div class="tree-container">
      <template v-for="node in data" :key="node.id">
        <div class="tree-node" :style="{ borderColor: typeColors[node.type] ?? '#1e4d8b' }">
          <div class="node-content" @click="emit('select', node)">
            <span class="node-type" :style="{ background: typeColors[node.type] ?? '#1e4d8b' }">
              {{ node.type }}
            </span>
            <span class="node-label">{{ node.label }}</span>
            <div v-if="node.info" class="node-info">
              <span v-if="node.info.batchNo">批次: {{ node.info.batchNo }}</span>
              <span v-if="node.info.qty">数量: {{ node.info.qty }}</span>
              <span v-if="node.info.date">日期: {{ node.info.date }}</span>
              <span v-if="node.info.supplier">供应商: {{ node.info.supplier }}</span>
            </div>
          </div>
          <button
            v-if="node.children?.length"
            class="toggle"
            @click="toggle(node)"
          >
            {{ isExpanded(node.id) ? '▼' : '▶' }} {{ node.children.length }}
          </button>
          <div v-if="node.children?.length && isExpanded(node.id)" class="children">
            <TraceTree :data="node.children" :direction="direction" @select="emit('select', $event)" />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped lang="scss">
.trace-tree {
  .dir-tabs {
    display: inline-flex;
    gap: 6px;
    margin-bottom: 10px;

    button {
      padding: 6px 14px;
      border: 1px solid #e1e8f0;
      background: #fff;
      border-radius: 6px;
      font-size: 12px;
      cursor: pointer;

      &.on { background: #1e4d8b; color: #fff; border-color: #1e4d8b; }
    }
  }
}

.tree-container { padding: 8px 0; }

.tree-node {
  border: 1.5px solid;
  border-radius: 8px;
  padding: 8px 12px;
  margin-bottom: 6px;
  background: #fff;
  position: relative;
}

.node-content {
  cursor: pointer;

  .node-type {
    display: inline-block;
    font-size: 10px;
    color: #fff;
    padding: 1px 6px;
    border-radius: 8px;
    margin-right: 6px;
  }

  .node-label {
    font-size: 13px;
    font-weight: 600;
    color: #1f2d3d;
  }

  .node-info {
    margin-top: 4px;
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    font-size: 11px;
    color: #5a6b7e;
  }
}

.toggle {
  border: none;
  background: #eef4fb;
  color: #1e4d8b;
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 4px;
  cursor: pointer;
  margin-top: 4px;
}

.children {
  margin-left: 20px;
  padding-left: 12px;
  border-left: 2px dashed #d4e2f3;
}
</style>
