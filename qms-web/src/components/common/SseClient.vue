<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { MockSseClient } from '@/utils/sse'

const props = withDefaults(defineProps<{
  url?: string
  mock?: boolean
  mockInterval?: number
}>(), {
  url: '/sse',
  mock: true,
  mockInterval: 5000,
})

const emit = defineEmits<{
  message: [data: unknown]
}>()

const connected = ref(false)
const messages = ref<{ time: string; data: unknown }[]>([])
let client: MockSseClient | null = null

function onMessage(data: unknown) {
  connected.value = true
  messages.value.unshift({ time: new Date().toLocaleTimeString(), data })
  if (messages.value.length > 50) messages.value.pop()
  emit('message', data)
}

onMounted(() => {
  if (props.mock) {
    client = new MockSseClient(onMessage, props.mockInterval)
    connected.value = true
  }
})

onBeforeUnmount(() => {
  client?.close()
})
</script>

<template>
  <div class="sse-client">
    <div class="status">
      <span class="dot" :class="{ on: connected }"></span>
      <span>{{ connected ? '已连接' : '未连接' }}</span>
    </div>
    <div v-if="messages.length" class="messages">
      <div v-for="(m, i) in messages.slice(0, 5)" :key="i" class="msg">
        <span class="time">{{ m.time }}</span>
        <span class="data">{{ JSON.stringify(m.data).slice(0, 80) }}</span>
      </div>
    </div>
    <slot />
  </div>
</template>

<style scoped lang="scss">
.sse-client {
  .status {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #5a6b7e;

    .dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #c0392b;

      &.on { background: #2f7d32; }
    }
  }

  .messages {
    margin-top: 8px;
    max-height: 200px;
    overflow-y: auto;
  }

  .msg {
    display: flex;
    gap: 8px;
    padding: 4px 0;
    font-size: 11px;
    border-bottom: 1px solid #eef4fb;

    .time { color: #8a9bb0; }
    .data { color: #1e4d8b; font-family: monospace; }
  }
}
</style>
