<script setup lang="ts">
import { useRouter } from 'vue-router'
const router = useRouter()
</script>

<template>
  <div class="not-found">
    <div class="code">404</div>
    <p class="msg">页面不存在</p>
    <el-button type="primary" @click="router.push('/')">返回首页</el-button>
  </div>
</template>

<style scoped lang="scss">
.not-found {
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;

  .code {
    font-size: 72px;
    font-weight: 800;
    color: #1e4d8b;
  }

  .msg {
    font-size: 16px;
    color: #5a6b7e;
  }
}
</style>
