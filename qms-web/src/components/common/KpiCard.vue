<script setup lang="ts">
import type { KpiData } from '@/types/common'

defineProps<{
  label: string
  value: number | string
  unit?: string
  sub?: string
  status?: 'ok' | 'warn' | 'bad'
}>()
</script>

<template>
  <div class="kpi-card" :class="status">
    <div class="bar"></div>
    <div class="lbl">{{ label }}</div>
    <div class="val">{{ value }}<span v-if="unit" class="unit">{{ unit }}</span></div>
    <div v-if="sub" class="sub">{{ sub }}</div>
  </div>
</template>

<style scoped lang="scss">
.kpi-card {
  position: relative;
  overflow: hidden;
  background: #fff;
  border: 1px solid #e1e8f0;
  border-radius: 8px;
  padding: 14px 16px;
  box-shadow: 0 1px 3px rgba(16, 42, 71, 0.08), 0 1px 2px rgba(16, 42, 71, 0.06);

  .bar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 4px;
    background: #1e4d8b;
  }

  .lbl {
    font-size: 12px;
    color: #5a6b7e;
  }

  .val {
    font-size: 26px;
    font-weight: 700;
    margin-top: 4px;
    color: #1e4d8b;
  }

  .unit {
    font-size: 13px;
    font-weight: 500;
    color: #5a6b7e;
    margin-left: 3px;
  }

  .sub {
    font-size: 11px;
    color: #5a6b7e;
    margin-top: 2px;
  }

  &.ok .val { color: #2f7d32; }
  &.ok .bar { background: #2f7d32; }
  &.warn .val { color: #d4a017; }
  &.warn .bar { background: #d4a017; }
  &.bad .val { color: #c0392b; }
  &.bad .bar { background: #c0392b; }
}
</style>
