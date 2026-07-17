<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

const props = withDefaults(defineProps<{
  placeholder?: string
  disabled?: boolean
}>(), {
  placeholder: '扫码 / 输入',
  disabled: false,
})

const emit = defineEmits<{
  submit: [value: string]
  scan: [value: string]
}>()

const inputRef = ref<HTMLInputElement>()
const value = ref('')
const feedback = ref<'idle' | 'success' | 'error'>('idle')

function handleSubmit() {
  const v = value.value.trim()
  if (!v) return
  emit('submit', v)
  emit('scan', v)
  feedback.value = 'success'
  setTimeout(() => (feedback.value = 'idle'), 500)
  value.value = ''
  focusInput()
}

function focusInput() {
  if (!props.disabled) nextTick(() => inputRef.value?.focus())
}

onMounted(() => focusInput())
onUnmounted(() => {})
</script>

<template>
  <div class="scan-input" :class="{ [feedback]: true }">
    <input
      ref="inputRef"
      v-model="value"
      type="text"
      class="input"
      :placeholder="placeholder"
      :disabled="disabled"
      @keydown.enter="handleSubmit"
    />
    <button class="btn" :disabled="!value" @click="handleSubmit">
      扫码
    </button>
  </div>
</template>

<style scoped lang="scss">
.scan-input {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  border: 2px solid #e1e8f0;
  border-radius: 6px;
  overflow: hidden;
  transition: border-color 0.2s;

  &.success { border-color: #2f7d32; }
  &.error { border-color: #c0392b; }

  .input {
    border: none;
    outline: none;
    padding: 8px 12px;
    font-size: 16px;
    width: 240px;
    font-family: inherit;
    background: #fff;

    &:disabled {
      background: #f4f7fb;
      color: #8a9bb0;
    }
  }

  .btn {
    border: none;
    background: #1e4d8b;
    color: #fff;
    padding: 8px 16px;
    font-size: 14px;
    cursor: pointer;
    min-height: 56px;

    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}
</style>
