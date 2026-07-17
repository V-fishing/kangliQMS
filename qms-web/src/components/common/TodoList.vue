<script setup lang="ts">
import { computed } from 'vue'

interface TodoItem {
  id: string
  title: string
  module: string
  priority: 'high' | 'medium' | 'low'
  time: string
}

const props = defineProps<{
  items: TodoItem[]
  title?: string
}>()

const emit = defineEmits<{
  click: [item: TodoItem]
}>()

const sorted = computed(() =>
  [...props.items].sort((a, b) => {
    const order = { high: 0, medium: 1, low: 2 }
    return order[a.priority] - order[b.priority]
  }),
)

const priorityMap = {
  high: { text: '紧急', color: '#c0392b', bg: '#fdecea' },
  medium: { text: '一般', color: '#d4a017', bg: '#fff7e0' },
  low: { text: '低', color: '#5a6b7e', bg: '#eef1f5' },
}
</script>

<template>
  <div class="todo-list qms-card">
    <div class="card-h">
      <h3>{{ title ?? '待办事项' }}</h3>
      <span class="tag">{{ sorted.length }}</span>
    </div>
    <div class="list">
      <div
        v-for="item in sorted"
        :key="item.id"
        class="list-row"
        @click="emit('click', item)"
      >
        <span
          class="pill"
          :style="{ color: priorityMap[item.priority].color, background: priorityMap[item.priority].bg }"
        >
          {{ priorityMap[item.priority].text }}
        </span>
        <div class="grow">
          <div class="title">{{ item.title }}</div>
          <div class="meta">{{ item.module.toUpperCase() }} · {{ item.time }}</div>
        </div>
      </div>
      <div v-if="!sorted.length" class="empty">暂无待办</div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.card-h {
  padding: 10px 14px;
  border-bottom: 1px solid #e1e8f0;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fafcff;

  h3 { font-size: 13.5px; color: #1f2d3d; }
  .tag { font-size: 10.5px; background: #eef4fb; color: #1e4d8b; padding: 2px 8px; border-radius: 10px; }
}

.list-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  border-bottom: 1px solid #e1e8f0;
  cursor: pointer;
  transition: 0.15s;

  &:hover { background: #f7fbff; }
  &:last-child { border-bottom: none; }

  .pill {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 600;
    flex-shrink: 0;
  }

  .grow { flex: 1; min-width: 0; }
  .title { font-size: 12.5px; color: #1f2d3d; }
  .meta { font-size: 11px; color: #5a6b7e; margin-top: 2px; }
}

.empty {
  padding: 30px;
  text-align: center;
  color: #5a6b7e;
  font-size: 13px;
}
</style>
