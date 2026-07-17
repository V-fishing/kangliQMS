<script setup lang="ts">
import { onErrorCaptured, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import zhCn from 'element-plus/es/locale/lang/zh-cn'

const error = ref<string | null>(null)
const route = useRoute()

// 顶层兜底：捕获任意未处理的渲染异常，避免整页白屏。
// 导航到其它路由时自动复位，避免偶发错误导致永久白屏。
watch(
  () => route.fullPath,
  () => {
    error.value = null
  },
)

onErrorCaptured((err: unknown) => {
  error.value = err instanceof Error ? err.message : String(err)
  console.error('QMS App Error:', err)
  return false // 阻止错误继续传播
})
</script>

<template>
  <!-- Element Plus 全局配置（按需模式下经 el-config-provider 提供 locale/size） -->
  <el-config-provider :locale="zhCn" size="large">
    <div v-if="error" class="global-error">
      <h1>应用加载错误</h1>
      <pre>{{ error }}</pre>
    </div>
    <RouterView v-else />
  </el-config-provider>
</template>

<style scoped>
.global-error {
  padding: 40px;
  color: #c0392b;
  font-family: monospace;
}
.global-error h1 {
  font-size: 20px;
  margin-bottom: 16px;
}
.global-error pre {
  white-space: pre-wrap;
  word-break: break-all;
  background: #fdecea;
  padding: 16px;
  border-radius: 6px;
}
</style>
