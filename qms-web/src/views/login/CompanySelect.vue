<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { ROLES } from '@/mock/roles'
import type { CompanyId } from '@/types/company'

const authStore = useAuthStore()
const companyStore = useCompanyStore()
const router = useRouter()

const account = computed(() => companyStore.pendingAccount)
const companies = computed(() => companyStore.availableCompanies)
const canGroup = computed(() => companyStore.canSwitchGroup)
const selectedId = ref<CompanyId | ''>('')

const roleName = computed(() => {
  const r = account.value?.role
  return r ? ROLES.find((x) => x.id === r)?.name ?? '' : ''
})

function confirmCompany(id: CompanyId) {
  companyStore.selectCompany(id)
  ElMessage.success(`已进入「${companyStore.currentCompany?.shortName}」`)
  router.replace('/')
}

function enterGroup() {
  if (!companyStore.canSwitchGroup) {
    ElMessage.warning('当前账号无集团总览权限')
    return
  }
  companyStore.selectGroup()
  router.replace('/')
}

function backToLogin() {
  authStore.logout()
  router.replace('/login')
}
</script>

<template>
  <div class="sel-page">
    <div class="sel-box">
      <div class="head">
        <div class="logo">KL</div>
        <div>
          <h1>选择公司</h1>
          <p class="sub">
            {{ account?.name }}（{{ account?.account }}）· {{ roleName }} ·
            关联 {{ companies.length }} 家公司
          </p>
        </div>
      </div>

      <p class="tip">请选择本次登录要操作的公司上下文（数据按所选公司隔离展示）。</p>

      <div class="cards">
        <button
          v-for="c in companies"
          :key="c.id"
          type="button"
          class="card"
          :class="{ active: selectedId === c.id }"
          :style="{ borderColor: selectedId === c.id ? c.color : '' }"
          @click="selectedId = c.id"
        >
          <span class="dot" :style="{ background: c.color }"></span>
          <span class="name">{{ c.shortName }}</span>
          <span class="full">{{ c.name }}</span>
          <span class="region">{{ c.region }}</span>
          <span class="perm">权限：{{ account ? account.perm[c.id] : '' }}</span>
        </button>
      </div>

      <div class="actions">
        <button class="btn ghost" type="button" @click="backToLogin">返回登录</button>
        <button
          class="btn primary"
          type="button"
          :disabled="!selectedId"
          @click="selectedId && confirmCompany(selectedId)"
        >
          {{ companies.length === 1 ? '确认进入' : '进入所选公司' }}
        </button>
      </div>

      <button
        v-if="canGroup"
        class="group-entry"
        type="button"
        @click="enterGroup"
      >
        🌐 进入集团总览（聚合两家公司数据，只读）
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.sel-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #102a47, #1e4d8b 60%, #2a6bb0);
}

.sel-box {
  background: #fff;
  border-radius: 14px;
  padding: 30px 34px;
  width: 560px;
  max-width: 92vw;
  box-shadow: 0 18px 50px rgba(8, 24, 46, 0.35);
  animation: pop 0.22s ease;
}

.head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;

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
  h1 { font-size: 19px; color: #1e4d8b; margin: 0; }
  .sub { font-size: 12.5px; color: #5a6b7e; margin: 3px 0 0; }
}

.tip {
  font-size: 12.5px;
  color: #5a6b7e;
  margin: 0 0 16px;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 12px;
}

.card {
  text-align: left;
  border: 2px solid #e1e8f0;
  border-radius: 10px;
  padding: 14px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: #fafcff;
  transition: 0.15s;

  &:hover { box-shadow: 0 4px 14px rgba(16, 42, 71, 0.12); }

  .dot { width: 12px; height: 12px; border-radius: 50%; }
  .name { font-size: 16px; font-weight: 700; color: #1f2d3d; }
  .full { font-size: 12px; color: #5a6b7e; }
  .region { font-size: 11px; color: #8a9bb0; }
  .perm { font-size: 11px; color: #2a6bb0; margin-top: 2px; }
}

.actions {
  display: flex;
  gap: 12px;
  margin-top: 20px;

  .btn {
    flex: 1;
    height: 42px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: 0.15s;
  }
  .primary {
    border: none;
    background: linear-gradient(90deg, #1e4d8b, #2a6bb0);
    color: #fff;
    &:hover:not(:disabled) { filter: brightness(1.06); }
    &:disabled { opacity: 0.55; cursor: default; }
  }
  .ghost {
    border: 1px solid #d4dde8;
    background: #fff;
    color: #5a6b7e;
    &:hover { background: #f4f7fb; }
  }
}

.group-entry {
  width: 100%;
  margin-top: 14px;
  padding: 12px;
  border: 1px dashed #2a6bb0;
  background: #eef4fb;
  color: #1e4d8b;
  border-radius: 8px;
  font-size: 13.5px;
  font-weight: 600;
  cursor: pointer;
  transition: 0.15s;
  &:hover { background: #e0ecfa; }
}

@keyframes pop {
  from { transform: translateY(8px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
</style>
