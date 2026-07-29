<!--
  数据表格 — 统一列表页
  用法: <DataTable :data="list" :loading="loading" :total="total"
            @page-change="onPage" @size-change="onSize">
          <el-table-column prop="name" label="名称" />
        </DataTable>
-->
<script setup lang="ts">
defineProps<{
  data: any[]; loading?: boolean; total?: number
  page?: number; size?: number; sizeOptions?: number[]
  emptyText?: string
}>()
defineEmits<{ 'update:page': [n: number]; 'update:size': [n: number] }>()
</script>

<template>
  <div class="data-table-wrap">
    <el-table :data="data" v-loading="loading" stripe border
      style="width:100%" size="small" :highlight-current-row="true"
      :header-cell-style="{ background:'#f7f9fc', color:'#4a5568', fontWeight:600, fontSize:'12px' }"
      empty-text="No matching data found"
    >
      <slot />
    </el-table>
    <div v-if="total !== undefined" class="dt-pager">
      <el-pagination
        :current-page="page ?? 1" :page-size="size ?? 20" :total="total"
        :page-sizes="sizeOptions ?? [10,20,50,100]"
        layout="total, sizes, prev, pager, next, jumper"
        small background
        @current-change="(p:number) => $emit('update:page', p)"
        @size-change="(s:number) => $emit('update:size', s)"
      />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.data-table-wrap { background: #fff; border-radius: 6px; }
.dt-pager { display: flex; justify-content: flex-end; padding: 12px 0 0; }
</style>
