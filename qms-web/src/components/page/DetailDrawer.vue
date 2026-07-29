<!--
  详情抽屉 — 统一详情/编辑侧滑面板
  用法: <DetailDrawer v-model="visible" title="来料检验详情" :loading="loading" @close="visible=false">
          <el-descriptions :column="2"><el-descriptions-item label="物料编码">MAT-001</el-descriptions-item></el-descriptions>
          <template #footer><el-button @click="visible=false">关闭</el-button></template>
        </DetailDrawer>
-->
<script setup lang="ts">
defineProps<{ title: string; loading?: boolean; size?: string }>()
const visible = defineModel<boolean>({ default: false })
</script>

<template>
  <el-drawer v-model="visible" :title="title" :size="size ?? '640px'" destroy-on-close>
    <div v-loading="loading" class="drawer-body">
      <slot />
    </div>
    <div v-if="$slots.footer" class="drawer-footer">
      <slot name="footer" />
    </div>
  </el-drawer>
</template>

<style lang="scss" scoped>
.drawer-body { padding: 0; }
.drawer-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 16px 0 0; border-top: 1px solid #eef1f5; margin-top: 16px; }
</style>
