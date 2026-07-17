<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { findDemoAccount, DEMO_ACCOUNTS } from '@/mock/company'

const authStore = useAuthStore()
const router = useRouter()

const account = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

function fillDemo(acc: string, pwd: string) {
  account.value = acc
  password.value = pwd
  error.value = ''
}

function onSubmit() {
  error.value = ''
  if (!account.value.trim() || !password.value) {
    error.value = '请输入账号和密码'
    return
  }
  const acc = findDemoAccount(account.value)
  if (!acc) {
    error.value = '账号不存在，可用下方演示账号'
    return
  }
  if (acc.password !== password.value) {
    error.value = '密码错误（演示密码：123456）'
    return
  }
  loading.value = true
  authStore.loginWithAccount(acc)
  ElMessage.success(`欢迎，${acc.name}`)
  router.replace('/company-select')
}
</script>

<template>
  <div class="login-page">
    <div class="login-box">
      <div class="brand">
        <div class="logo">KL</div>
        <div>
          <h1>康立质量过程管理系统</h1>
          <p class="subtitle">QMS · 多分公司统一登录</p>
        </div>
      </div>

      <form class="form" @submit.prevent="onSubmit">
        <label class="field">
          <span>账号</span>
          <input v-model="account" type="text" placeholder="请输入账号" autocomplete="username" />
        </label>
        <label class="field">
          <span>密码</span>
          <input v-model="password" type="password" placeholder="请输入密码" autocomplete="current-password" />
        </label>

        <p v-if="error" class="err">{{ error }}</p>

        <button class="submit" type="submit" :disabled="loading">
          {{ loading ? '登录中…' : '登 录' }}
        </button>
      </form>

      <div class="demo">
        <div class="demo-head">演示账号（点击填充）</div>
        <div class="demo-list">
          <button
            v-for="d in DEMO_ACCOUNTS"
            :key="d.account"
            class="demo-item"
            type="button"
            @click="fillDemo(d.account, d.password)"
          >
            <span class="da">{{ d.account }}</span>
            <span class="dn">{{ d.name }} · {{ d.isGroupAdmin ? '集团管理员' : '单公司' }}</span>
          </button>
        </div>
        <p class="demo-tip">密码统一 123456；集团管理员 admin 可选“集团总览”，单公司账号仅能进入其所属公司。</p>
      </div>
    </div>
    <div class="hint">仅前端演示数据 · 多分公司数据隔离流程</div>
  </div>
</template>

<style scoped lang="scss">
.login-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #102a47, #1e4d8b 60%, #2a6bb0);
  gap: 14px;
}

.login-box {
  background: #fff;
  border-radius: 14px;
  padding: 34px 38px;
  width: 420px;
  max-width: 92vw;
  box-shadow: 0 18px 50px rgba(8, 24, 46, 0.35);
  animation: pop 0.22s ease;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 22px;

  .logo {
    width: 42px;
    height: 42px;
    border-radius: 9px;
    background: linear-gradient(135deg, #1e4d8b, #2a6bb0);
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 18px;
  }

  h1 {
    font-size: 19px;
    color: #1e4d8b;
    margin: 0;
  }
  .subtitle {
    font-size: 12.5px;
    color: #5a6b7e;
    margin: 3px 0 0;
  }
}

.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  span {
    font-size: 12.5px;
    color: #1f2d3d;
    font-weight: 600;
  }
  input {
    height: 40px;
    border: 1px solid #d4dde8;
    border-radius: 8px;
    padding: 0 12px;
    font-size: 14px;
    outline: none;
    transition: 0.15s;
    &:focus {
      border-color: #2a6bb0;
      box-shadow: 0 0 0 3px rgba(42, 107, 176, 0.15);
    }
  }
}

.err {
  margin: 0;
  color: #c0392b;
  font-size: 12.5px;
  background: #fdecea;
  padding: 8px 12px;
  border-radius: 6px;
}

.submit {
  height: 42px;
  border: none;
  border-radius: 8px;
  background: linear-gradient(90deg, #1e4d8b, #2a6bb0);
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.15s;
  &:hover { filter: brightness(1.06); }
  &:disabled { opacity: 0.7; cursor: default; }
}

.demo {
  margin-top: 22px;
  border-top: 1px dashed #e1e8f0;
  padding-top: 14px;

  .demo-head {
    font-size: 12px;
    color: #5a6b7e;
    margin-bottom: 8px;
  }
  .demo-list {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .demo-item {
    text-align: left;
    border: 1px solid #e1e8f0;
    background: #fafcff;
    border-radius: 7px;
    padding: 8px 10px;
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 2px;
    transition: 0.15s;
    &:hover {
      border-color: #2a6bb0;
      background: #eef4fb;
    }
    .da { font-size: 13px; font-weight: 700; color: #1e4d8b; }
    .dn { font-size: 11px; color: #5a6b7e; }
  }
  .demo-tip {
    margin: 10px 0 0;
    font-size: 11px;
    color: #8a9bb0;
    line-height: 1.5;
  }
}

.hint {
  color: rgba(255, 255, 255, 0.7);
  font-size: 12px;
}

@keyframes pop {
  from { transform: translateY(8px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
