<!--
  统计卡片行 — KPI 概览
  用法: <StatCards :items="[
          { label:'总批次数', value:128, unit:'批', color:'#1e4d8b' },
          { label:'合格率', value:96.8, unit:'%', color:'#16a085' },
        ]" />
-->
<script setup lang="ts">
defineProps<{ items: { label: string; value: number|string; unit?: string; color?: string; icon?: string }[]; loading?: boolean }>()
</script>

<template>
  <div class="stat-row" v-loading="loading">
    <div v-for="(it, i) in items" :key="i" class="stat-card" :style="{ borderTopColor: it.color || '#1e4d8b' }">
      <div class="sc-label">{{ it.label }}</div>
      <div class="sc-value">
        <span class="sc-num" :style="{ color: it.color || '#1e4d8b' }">{{ it.value }}</span>
        <span v-if="it.unit" class="sc-unit">{{ it.unit }}</span>
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.stat-row { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; margin-bottom: 16px; }
.stat-card {
  background: #fff; border-radius: 8px; padding: 16px; border-top: 3px solid;
  box-shadow: 0 1px 4px rgba(0,0,0,.04);
}
.sc-label { font-size: 12px; color: #8a9bb0; margin-bottom: 6px; }
.sc-value { display: flex; align-items: baseline; gap: 4px; }
.sc-num { font-size: 28px; font-weight: 700; line-height: 1.1; }
.sc-unit { font-size: 13px; color: #8a9bb0; }
</style>
