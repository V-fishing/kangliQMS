<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import NodeForm from './NodeForm.vue'
import { nodeTypeLabel } from '../composables/useTrace'

const props = defineProps<{
  modelValue: boolean
  mode: 'create' | 'add-child'
  nodeType: string
  parentName?: string
  tabLabel?: string
  initial?: Record<string, any>
  orgId?: string
  submitting?: boolean
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'save', payload: { form: Record<string, any>; qualificationType: string }): void
}>()

const nodeFormRef = ref<InstanceType<typeof NodeForm>>()
// raw(来料组成) 与 incoming(入库批次) 不参与合格资质，其余默认"合格"
const qual = ref<string>('合格')
const showQual = computed(() => props.nodeType !== 'raw' && props.nodeType !== 'incoming')

watch(
  () => [props.modelValue, props.nodeType],
  () => {
    if (props.modelValue) qual.value = props.nodeType === 'raw' ? '常规' : '合格'
  },
  { immediate: true },
)

const title = computed(() => {
  if (props.mode === 'add-child') {
    return `在「${props.parentName || '节点'}」下添加${nodeTypeLabel(props.nodeType)}`
  }
  return `新增${props.tabLabel || nodeTypeLabel(props.nodeType)}`
})

function close() {
  emit('update:modelValue', false)
}

function onSave() {
  const nf = nodeFormRef.value
  if (!nf) return
  const v = nf.validate()
  if (!v || !v.ok) {
    ElMessage.error('请填写必填项：' + (v?.missing || []).join('、'))
    return
  }
  emit('save', { form: nf.getForm(), qualificationType: qual.value })
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="title"
    width="560px"
    @update:model-value="close"
    :close-on-click-modal="false"
  >
    <NodeForm
      ref="nodeFormRef"
      :node-type="(nodeType as any)"
      :initial="initial"
      :org-id="orgId"
      :mode="mode"
      :component-type="nodeType"
      :allow-ref="true"
    />
    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button v-if="showQual" type="primary" :loading="submitting" @click="onSave">保存</el-button>
      <el-button v-else type="primary" :loading="submitting" @click="onSave">保存</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
</style>
