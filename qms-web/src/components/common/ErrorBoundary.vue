<script setup lang="ts">
import { onErrorCaptured, ref } from 'vue'

const emit = defineEmits<{ (e: 'error', err: unknown): void }>()

const hasError = ref(false)
const errorMessage = ref('')
const errorStack = ref('')

// 捕获本边界内任意子组件渲染期异常，隔离到当前模块内容区，
// 不再向上冒泡到 App.vue 顶层导致整页白屏。
onErrorCaptured((err: unknown, _instance, info) => {
  errorMessage.value = err instanceof Error ? err.message : String(err)
  errorStack.value = err instanceof Error ? err.stack || '' : ''
  hasError.value = true
  console.error('[Module ErrorBoundary]', err, info)
  emit('error', err)
  // 返回 false 阻止错误继续向上传播到 App 顶层
  return false
})

function reload() {
  hasError.value = false
  errorMessage.value = ''
  errorStack.value = ''
  location.reload()
}

function dismiss() {
  // 关闭提示后仅隐藏本模块的渲染结果，导航到其它模块时本组件会因 key 变化重新挂载并复位
  hasError.value = false
}
</script>

<template>
  <slot v-if="!hasError" />
  <div v-else class="eb">
    <div class="eb-box">
      <div class="eb-icon">⚠️</div>
      <h3 class="eb-title">该模块加载出现异常</h3>
      <p class="eb-msg">{{ errorMessage }}</p>
      <details v-if="errorStack" class="eb-details">
        <summary>错误堆栈</summary>
        <pre class="eb-stack">{{ errorStack }}</pre>
      </details>
      <div class="eb-actions">
        <button class="eb-btn primary" @click="reload">重新加载页面</button>
        <button class="eb-btn" @click="dismiss">仅关闭提示</button>
      </div>
      <p class="eb-tip">提示：切换到其它模块可自动恢复本区域显示。</p>
    </div>
  </div>
</template>

<style scoped lang="scss">
.eb {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 320px;
  padding: 24px;
}
.eb-box {
  max-width: 560px;
  background: #fff;
  border: 1px solid #f0d4d0;
  border-radius: 10px;
  padding: 24px 28px;
  text-align: center;
  box-shadow: 0 6px 20px rgba(192, 57, 43, 0.08);
}
.eb-icon { font-size: 32px; }
.eb-title { margin: 8px 0 6px; font-size: 16px; color: #c0392b; }
.eb-msg {
  margin: 0 0 12px;
  font-size: 13px;
  color: #5a6b7e;
  word-break: break-all;
  background: #fdecea;
  border-radius: 6px;
  padding: 8px 10px;
}
.eb-details { text-align: left; margin-bottom: 12px; }
.eb-details summary { cursor: pointer; font-size: 12px; color: #8a9bb0; }
.eb-stack {
  margin-top: 6px;
  max-height: 160px;
  overflow: auto;
  font-size: 11px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
  background: #f7f9fc;
  border-radius: 6px;
  padding: 8px;
}
.eb-actions { display: flex; gap: 10px; justify-content: center; }
.eb-btn {
  border: 1px solid #d8e0ea;
  background: #fff;
  color: #5a6b7e;
  padding: 7px 16px;
  font-size: 13px;
  border-radius: 6px;
  cursor: pointer;
  transition: 0.15s;
  &:hover { filter: brightness(0.97); }
  &.primary { background: #1e4d8b; border-color: #1e4d8b; color: #fff; }
}
.eb-tip { margin: 12px 0 0; font-size: 12px; color: #8a9bb0; }
</style>
