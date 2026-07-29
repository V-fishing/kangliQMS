<script setup lang="ts">
import { computed } from 'vue'
import { nodeTypeLabel, typeTagType } from '../composables/useTrace'
import type { TraceNodeSearchVO } from '@/types/sqm'

const props = defineProps<{
  data: TraceNodeSearchVO[]
  loading: boolean
  total: number
  page: number
  size: number
  keyword: string
  tabLabel: string
  tabKey: string
}>()
const emit = defineEmits<{
  (e: 'update:keyword', v: string): void
  (e: 'search'): void
  (e: 'reset'): void
  (e: 'add'): void
  (e: 'edit', row: TraceNodeSearchVO): void
  (e: 'trace', row: TraceNodeSearchVO): void
  (e: 'detail', row: TraceNodeSearchVO): void
  (e: 'page-change', page: number): void
}>()

const addLabel = computed(() => (props.tabKey === 'incoming' ? '＋ 来料入库' : `＋ 新增${props.tabLabel}`))

function onPageChange(p: number) {
  emit('page-change', p)
}
</script>

<template>
  <div class="tb-wrap">
    <div class="tb-toolbar">
      <el-input
        :model-value="keyword"
        placeholder="搜索名称 / 批次号 / 编码"
        clearable
        class="tb-search"
        @update:model-value="(v: string) => emit('update:keyword', v)"
        @keyup.enter="emit('search')"
        @clear="emit('reset')"
      />
      <el-button type="primary" @click="emit('search')">搜索</el-button>
      <el-button @click="emit('reset')">重置</el-button>
      <el-button type="success" @click="emit('add')">{{ addLabel }}</el-button>
    </div>

    <el-table :data="data" v-loading="loading" border stripe size="small" class="tb-table">
      <el-table-column prop="nodeName" label="名称" min-width="150" show-overflow-tooltip />
      <el-table-column label="类型" width="96">
        <template #default="{ row }">
          <el-tag size="small" :type="typeTagType(row.nodeType)">{{ nodeTypeLabel(row.nodeType) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="batchNo" label="批次号" min-width="130" show-overflow-tooltip />
      <el-table-column prop="qty" label="数量" width="90" align="right" />
      <el-table-column prop="unit" label="单位" width="70" />
      <el-table-column prop="nodeDate" label="日期" width="120" />
      <el-table-column prop="qualificationType" label="资质" width="90" />
      <el-table-column label="操作" width="170" fixed="right">
        <template #default="{ row }">
          <el-button text type="primary" size="small" @click="emit('trace', row)">追溯树</el-button>
          <el-button text type="primary" size="small" @click="emit('detail', row)">详情</el-button>
          <el-button text type="warning" size="small" @click="emit('edit', row)">编辑</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="tb-pager">
      <el-pagination
        :current-page="page"
        :page-size="size"
        :total="total"
        layout="total, prev, pager, next"
        @current-change="onPageChange"
      />
    </div>
  </div>
</template>

<style scoped>
.tb-wrap { padding: 4px 0; }
.tb-toolbar { display: flex; gap: 8px; align-items: center; margin-bottom: 12px; }
.tb-search { width: 320px; }
.tb-table { width: 100%; }
.tb-pager { display: flex; justify-content: flex-end; margin-top: 12px; }
</style>
