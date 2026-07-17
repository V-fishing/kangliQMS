<script setup lang="ts">
import { ref } from 'vue'
import SchemaForm from '@/components/form/SchemaForm.vue'
import type { SchemaField } from '@/components/form/SchemaForm.vue'

const formData = ref<Record<string, unknown>>({})

const schema: SchemaField[] = [
  { prop: 'appName', label: '系统名称', type: 'input', value: '康立质量过程管理系统', span: 24 },
  { prop: 'pageSize', label: '默认分页大小', type: 'inputNumber', value: 20, min: 10, max: 100, span: 12 },
  { prop: 'sessionTimeout', label: '会话超时(分)', type: 'inputNumber', value: 30, min: 5, max: 120, span: 12 },
  { prop: 'enablePwa', label: '启用离线模式', type: 'switch', value: false, span: 12 },
  { prop: 'enableSse', label: '启用实时推送', type: 'switch', value: true, span: 12 },
  { prop: 'enableHighContrast', label: '高亮屏模式', type: 'switch', value: false, span: 12 },
  { prop: 'spcAlarmThreshold', label: 'SPC告警阈值', type: 'select', value: '3sigma', options: [
    { label: '2σ(预警)', value: '2sigma' }, { label: '3σ(标准)', value: '3sigma' }, { label: '6σ(严格)', value: '6sigma' }
  ], span: 12 },
  { prop: 'fiaTimeout', label: '首件超时(小时)', type: 'inputNumber', value: 4, min: 1, max: 24, span: 12 },
]

function onSubmit(data: Record<string, unknown>) {
  console.info('config saved', data)
  ElMessage.success('配置已保存')
}
</script>

<template>
  <div class="system-config">
    <div class="qms-card">
      <div class="card-h"><h3>系统配置中心</h3></div>
      <div class="card-b">
        <SchemaForm :schema="schema" v-model="formData" @submit="onSubmit" />
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.card-h { padding: 10px 14px; border-bottom: 1px solid #e1e8f0; background: #fafcff; h3 { font-size: 13.5px; } }
.card-b { padding: 14px; }
</style>
