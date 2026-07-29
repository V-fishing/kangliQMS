<!--
  页面区块容器 — 统一页面结构
  用法: <PageSection title="来料异常列表">
          <template #actions><el-button>新建</el-button></template>
          <YourContent />
        </PageSection>
-->
<script setup lang="ts">
defineProps<{ title: string; subtitle?: string; loading?: boolean }>()
</script>

<template>
  <div class="page-section">
    <div class="ps-header">
      <div>
        <h2 class="ps-title">{{ title }}</h2>
        <p v-if="subtitle" class="ps-sub">{{ subtitle }}</p>
      </div>
      <div v-if="$slots.actions" class="ps-actions">
        <slot name="actions" />
      </div>
    </div>
    <div v-loading="loading" class="ps-body">
      <slot />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.page-section { background: #fff; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,.04); }
.ps-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid #eef1f5; }
.ps-title { margin: 0; font-size: 16px; font-weight: 600; color: #1f2d3d; }
.ps-sub { margin: 3px 0 0; font-size: 12px; color: #8a9bb0; }
.ps-actions { display: flex; gap: 8px; }
.ps-body { padding: 16px 20px; }
</style>
