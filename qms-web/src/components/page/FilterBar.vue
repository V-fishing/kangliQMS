<!--
  筛选栏 — 统一查询条件区域
  用法: <FilterBar @search="query" @reset="reset">
          <el-input v-model="f.keyword" placeholder="关键词" />
          <el-select v-model="f.status"><el-option label="待处理" value="pending" /></el-select>
        </FilterBar>
-->
<script setup lang="ts">
defineEmits<{ search: []; reset: [] }>()
</script>

<template>
  <div class="filter-bar">
    <div class="filter-fields">
      <slot />
    </div>
    <div class="filter-actions">
      <el-button type="primary" @click="$emit('search')"><el-icon><Search /></el-icon>查询</el-button>
      <el-button @click="$emit('reset')">重置</el-button>
      <slot name="extra" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.filter-bar { display: flex; align-items: flex-start; gap: 16px; padding: 12px 0; flex-wrap: wrap; }
.filter-fields { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; flex: 1;
  :deep(.el-input), :deep(.el-select) { width: 160px; }
  :deep(.el-date-picker) { width: 260px; }
}
.filter-actions { display: flex; gap: 8px; flex-shrink: 0; }
</style>
