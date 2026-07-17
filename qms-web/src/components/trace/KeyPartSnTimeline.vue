<script setup lang="ts">
interface SnEvent {
  time: string
  event: string
  operator: string
  detail?: string
}

defineProps<{
  sn: string
  partName: string
  events: SnEvent[]
}>()
</script>

<template>
  <div class="sn-timeline">
    <div class="header">
      <h4>关键件追溯: {{ partName }}</h4>
      <span class="sn">序列号: {{ sn }}</span>
    </div>
    <div class="timeline">
      <div
        v-for="(e, i) in events"
        :key="i"
        class="tl-item"
        :class="{ done: i < events.length - 1 }"
      >
        <div class="tl-time">{{ e.time }}</div>
        <div class="tl-event">{{ e.event }}</div>
        <div class="tl-op">操作人: {{ e.operator }}</div>
        <div v-if="e.detail" class="tl-detail">{{ e.detail }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.sn-timeline {
  .header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
    h4 { font-size: 14px; color: #1e4d8b; }
    .sn {
      font-family: monospace;
      font-size: 12px;
      background: #eef4fb;
      color: #1e4d8b;
      padding: 2px 8px;
      border-radius: 8px;
    }
  }
}

.timeline {
  position: relative;
  padding-left: 26px;

  &::before {
    content: '';
    position: absolute;
    left: 9px;
    top: 6px;
    bottom: 6px;
    width: 2px;
    background: #e1e8f0;
  }
}

.tl-item {
  position: relative;
  padding: 0 0 16px 10px;
  font-size: 12.5px;

  &::before {
    content: '';
    position: absolute;
    left: -23px;
    top: 3px;
    width: 13px;
    height: 13px;
    border-radius: 50%;
    background: #1e4d8b;
    border: 2px solid #fff;
    box-shadow: 0 0 0 2px #1e4d8b;
  }

  &.done::before { background: #2f7d32; box-shadow: 0 0 0 2px #2f7d32; }

  .tl-time { color: #5a6b7e; font-size: 11px; }
  .tl-event { color: #1f2d3d; font-weight: 600; margin: 2px 0; }
  .tl-op { color: #1e4d8b; font-size: 11px; }
  .tl-detail { color: #5a6b7e; font-size: 11px; margin-top: 2px; }
}
</style>
