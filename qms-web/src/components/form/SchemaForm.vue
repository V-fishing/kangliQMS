<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import type { FormInstance } from 'element-plus'

export interface SchemaField {
  prop: string
  label: string
  type: 'input' | 'number' | 'select' | 'date' | 'textarea' | 'switch' | 'inputNumber'
  value?: unknown
  options?: { label: string; value: string | number }[]
  required?: boolean
  placeholder?: string
  min?: number
  max?: number
  step?: number
  unit?: string
  span?: number
}

const props = withDefaults(defineProps<{
  schema: SchemaField[]
  modelValue?: Record<string, unknown>
  labelWidth?: string
  rules?: Record<string, unknown>
  readonly?: boolean
}>(), {
  modelValue: () => ({}),
  labelWidth: '100px',
  rules: () => ({}),
  readonly: false,
})

const emit = defineEmits<{
  'update:modelValue': [val: Record<string, unknown>]
  submit: [val: Record<string, unknown>]
}>()

const formRef = ref<FormInstance>()
const formData = ref<Record<string, unknown>>({})

// 初始化表单数据
function initForm() {
  const data: Record<string, unknown> = { ...props.modelValue }
  props.schema.forEach((f) => {
    if (data[f.prop] === undefined) {
      data[f.prop] = f.value ?? (f.type === 'switch' ? false : f.type === 'number' || f.type === 'inputNumber' ? 0 : '')
    }
  })
  formData.value = data
}

initForm()
watch(() => props.schema, initForm, { deep: true })

watch(formData, (v) => emit('update:modelValue', v), { deep: true })

const formRules = computed(() => {
  const r: Record<string, unknown> = { ...props.rules }
  props.schema.forEach((f) => {
    if (f.required && !r[f.prop]) {
      r[f.prop] = [{ required: true, message: `请输入${f.label}`, trigger: 'blur' }]
    }
  })
  return r
})

async function validate(): Promise<boolean> {
  if (!formRef.value) return true
  try {
    await formRef.value.validate()
    return true
  } catch {
    return false
  }
}

function submit() {
  validate().then((valid) => {
    if (valid) emit('submit', { ...formData.value })
  })
}

function reset() {
  formRef.value?.resetFields()
  initForm()
}

defineExpose({ validate, submit, reset, formData })
</script>

<template>
  <el-form
    ref="formRef"
    :model="formData"
    :rules="formRules"
    :label-width="labelWidth"
    :disabled="readonly"
    class="schema-form"
  >
    <el-row :gutter="16">
      <el-col
        v-for="field in schema"
        :key="field.prop"
        :span="field.span ?? 12"
      >
        <el-form-item :label="field.label" :prop="field.prop">
          <el-input
            v-if="field.type === 'input'"
            v-model="formData[field.prop] as string"
            :placeholder="field.placeholder ?? `请输入${field.label}`"
          />
          <el-input-number
            v-else-if="field.type === 'number' || field.type === 'inputNumber'"
            v-model="formData[field.prop] as number"
            :min="field.min"
            :max="field.max"
            :step="field.step ?? 0.01"
          />
          <el-select
            v-else-if="field.type === 'select'"
            v-model="formData[field.prop] as string"
            :placeholder="field.placeholder ?? `请选择${field.label}`"
            style="width: 100%"
          >
            <el-option
              v-for="opt in field.options"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
          <el-date-picker
            v-else-if="field.type === 'date'"
            v-model="formData[field.prop] as string"
            type="date"
            value-format="YYYY-MM-DD"
            :placeholder="`请选择${field.label}`"
            style="width: 100%"
          />
          <el-input
            v-else-if="field.type === 'textarea'"
            v-model="formData[field.prop] as string"
            type="textarea"
            :rows="3"
            :placeholder="`请输入${field.label}`"
          />
          <el-switch
            v-else-if="field.type === 'switch'"
            v-model="formData[field.prop] as boolean"
          />
          <span v-if="field.unit" class="unit">{{ field.unit }}</span>
        </el-form-item>
      </el-col>
    </el-row>
    <el-form-item v-if="!readonly">
      <el-button type="primary" @click="submit">提交</el-button>
      <el-button @click="reset">重置</el-button>
    </el-form-item>
  </el-form>
</template>

<style scoped lang="scss">
.schema-form {
  .unit {
    margin-left: 6px;
    font-size: 12px;
    color: #5a6b7e;
  }
}
</style>
