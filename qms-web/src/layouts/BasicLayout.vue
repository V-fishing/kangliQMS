<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { useUserStore } from '@/stores/user'
import { useCompanyStore } from '@/stores/company'
import { ROLES, type RoleId } from '@/mock/roles'
import type { CompanyId } from '@/types/company'
import { getMockMenuTree } from '@/mock/system'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()
const userStore = useUserStore()
const companyStore = useCompanyStore()

const menus = getMockMenuTree()
const roleMenuOpen = ref(false)
const companyMenuOpen = ref(false)
const clock = ref('')

let timer: ReturnType<typeof setInterval>

function tickClock() {
  const d = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  clock.value = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

onMounted(() => {
  tickClock()
  timer = setInterval(tickClock, 1000)
  userStore.refreshTodoCount()
  userStore.refreshNotice()
})

onUnmounted(() => clearInterval(timer))

const activeModule = computed(() => (route.meta.module as string) || 'overview')

/** 当前模块的二级子页面（用于顶部标签栏） */
const subTabs = computed(() => {
  const menu = menus.find((m) => m.module === activeModule.value)
  return menu?.children ?? []
})

/** 当前激活的二级标签 path（如 dash / flow） */
const activeTab = computed(() => {
  const seg = route.path.split('/').filter(Boolean)
  return seg[1] || ''
})

function switchModule(path: string) {
  router.push(`/${path}`)
}

function switchTab(tabPath: string) {
  router.push(`/${activeModule.value}/${tabPath}`)
}

function switchRole(role: RoleId) {
  authStore.switchRole(role)
  roleMenuOpen.value = false
  // 刷新当前页面
  router.replace(route.fullPath)
}

/** 顶栏切换公司（免重登） */
function switchCompany(id: CompanyId) {
  companyStore.switchCompany(id)
  companyMenuOpen.value = false
}
function switchToGroup() {
  companyStore.switchToGroup()
  companyMenuOpen.value = false
}

function getFirstPath(module: string): string {
  const menu = menus.find((m) => m.path === module)
  if (menu?.children?.length) {
    return `/${module}/${menu.children[0].path}`
  }
  return `/${module}`
}
</script>

<template>
  <div class="app-layout">
    <header class="topbar">
      <div class="brand">
        <div class="logo">KL</div>
        <span class="title">康立质量过程管理系统</span>
        <small>QMS</small>
      </div>
      <div class="topbar-right">
        <span class="watermark">演示静态数据</span>

        <!-- 当前公司切换器（多分公司上下文） -->
        <div class="company-switcher">
          <button class="company-btn" @click="companyMenuOpen = !companyMenuOpen">
            <span
              class="dot"
              :style="{ background: companyStore.isGroup ? '#7a5bb0' : companyStore.currentCompany?.color || '#5b8def' }"
            ></span>
            <span class="ctx">{{ companyStore.contextLabel() }}</span>
            <span v-if="!companyStore.isGroup" class="perm">{{
              companyStore.currentCompany ? companyStore.accountPerm[companyStore.currentCompany.id] : ''
            }}</span>
            <span class="arrow">▾</span>
          </button>
          <div v-show="companyMenuOpen" class="company-menu" @click.stop>
            <div class="cm-head">切换公司上下文（免重新登录）</div>
            <div
              v-for="c in companyStore.availableCompanies"
              :key="c.id"
              class="cm-opt"
              :class="{ active: !companyStore.isGroup && companyStore.currentCompanyId === c.id }"
              @click="switchCompany(c.id)"
            >
              <span class="dot" :style="{ background: c.color }"></span>
              <span class="nm">{{ c.shortName }}</span>
              <span class="pm">{{ companyStore.accountPerm[c.id] }}</span>
            </div>
            <div
              v-if="companyStore.canSwitchGroup"
              class="cm-opt group"
              :class="{ active: companyStore.isGroup }"
              @click="switchToGroup()"
            >
              <span class="dot" style="background: #7a5bb0"></span>
              <span class="nm">集团总览</span>
              <span class="pm">只读</span>
            </div>
          </div>
        </div>

        <div class="role-switcher">
          <button class="role-btn" @click="roleMenuOpen = !roleMenuOpen">
            <span class="dot" :style="{ background: authStore.currentRole?.color }"></span>
            {{ authStore.currentRole?.name }}
            <span class="arrow">▾</span>
          </button>
          <div v-show="roleMenuOpen" class="role-menu" @click.stop>
            <div
              v-for="r in ROLES"
              :key="r.id"
              class="role-opt"
              :class="{ active: authStore.role === r.id }"
              @click="switchRole(r.id)"
            >
              <span class="dot" :style="{ background: r.color }"></span>
              <span>{{ r.icon }} {{ r.name }}</span>
              <span class="desc">{{ r.perm.slice(0, 8) }}…</span>
            </div>
          </div>
        </div>

        <span class="clock">{{ clock }}</span>
      </div>
    </header>
    <div class="body">
      <nav class="sidebar" :class="{ collapsed: appStore.sidebarCollapsed }">
        <div class="nav-group">主导航</div>
        <div
          v-for="m in menus"
          :key="m.path"
          class="nav-item"
          :class="{ active: activeModule === m.module }"
          @click="switchModule(getFirstPath(m.path).slice(1))"
        >
          <span class="ico">{{ m.icon }}</span>
          <span>{{ m.title }}</span>
        </div>
      </nav>
      <main class="content-wrap">
        <nav v-if="subTabs.length" class="sub-tabs">
          <div
            v-for="t in subTabs"
            :key="t.path"
            class="sub-tab"
            :class="{ active: activeTab === t.path }"
            @click="switchTab(t.path)"
          >
            <span class="ico">{{ t.icon }}</span>
            <span>{{ t.title }}</span>
          </div>
        </nav>
        <div class="content">
          <RouterView v-slot="{ Component }">
            <transition name="fade">
              <component :is="Component" :key="route.fullPath + '#' + companyStore.currentCompanyId" />
            </transition>
          </RouterView>
        </div>
      </main>
    </div>
  </div>
</template>

<style scoped lang="scss">
.app-layout {
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

.topbar {
  height: 56px;
  background: linear-gradient(90deg, #1e4d8b, #2a6bb0);
  color: #fff;
  display: flex;
  align-items: center;
  padding: 0 20px;
  flex-shrink: 0;
  box-shadow: 0 2px 6px rgba(16, 42, 71, 0.15);
  z-index: 20;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 17px;
  font-weight: 600;

  .logo {
    width: 30px;
    height: 30px;
    border-radius: 6px;
    background: #fff;
    color: #1e4d8b;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 800;
    font-size: 15px;
  }

  small {
    font-weight: 400;
    opacity: 0.8;
    font-size: 12px;
  }
}

.topbar-right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 16px;
}

.watermark {
  font-size: 12px;
  background: rgba(255, 255, 255, 0.15);
  padding: 4px 10px;
  border-radius: 12px;
  border: 1px dashed rgba(255, 255, 255, 0.4);
}

.clock {
  font-size: 12px;
  opacity: 0.9;
}

/* 公司切换器 */
.company-switcher {
  position: relative;
}
.company-btn {
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  padding: 7px 14px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;

  &:hover {
    background: rgba(255, 255, 255, 0.28);
  }
  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.7);
  }
  .ctx {
    font-weight: 600;
  }
  .perm {
    font-size: 11px;
    background: rgba(255, 255, 255, 0.2);
    padding: 1px 6px;
    border-radius: 8px;
  }
  .arrow {
    font-size: 10px;
  }
}
.company-menu {
  position: absolute;
  right: 0;
  top: 44px;
  background: #fff;
  color: #1f2d3d;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(16, 42, 71, 0.18);
  min-width: 230px;
  padding: 6px;
  z-index: 50;

  .cm-head {
    font-size: 11px;
    color: #8a9bb0;
    padding: 6px 10px;
  }
  .cm-opt {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 13px;

    &:hover {
      background: #eef4fb;
    }
    &.active {
      background: #eef4fb;
      color: #1e4d8b;
      font-weight: 600;
    }
    .dot {
      width: 10px;
      height: 10px;
      border-radius: 50%;
      flex-shrink: 0;
    }
    .nm {
      flex: 1;
    }
    .pm {
      font-size: 11px;
      color: #5a6b7e;
    }
    &.group {
      border-top: 1px dashed #e1e8f0;
      margin-top: 4px;
    }
  }
}

/* 角色切换器 */
.role-switcher {
  position: relative;
}
.role-btn {
  background: rgba(255, 255, 255, 0.16);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;
  padding: 7px 14px;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;

  &:hover {
    background: rgba(255, 255, 255, 0.28);
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    border: 2px solid rgba(255, 255, 255, 0.7);
  }

  .arrow {
    font-size: 10px;
  }
}

.role-menu {
  position: absolute;
  right: 0;
  top: 44px;
  background: #fff;
  color: #1f2d3d;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(16, 42, 71, 0.18);
  min-width: 230px;
  padding: 6px;
  z-index: 50;
  max-height: 440px;
  overflow-y: auto;
}

.role-opt {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 12px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;

  &:hover {
    background: #eef4fb;
  }

  &.active {
    background: #eef4fb;
    color: #1e4d8b;
    font-weight: 600;
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .desc {
    font-size: 11px;
    color: #5a6b7e;
    margin-left: auto;
  }
}

.body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.sidebar {
  width: 188px;
  background: #102a47;
  color: #cfdcec;
  flex-shrink: 0;
  padding: 14px 0;
  overflow-y: auto;
}

.nav-group {
  padding: 8px 20px 4px;
  font-size: 11px;
  color: #7e93ad;
  letter-spacing: 1px;
}

.nav-item {
  padding: 12px 20px;
  cursor: pointer;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  border-left: 3px solid transparent;
  transition: 0.15s;

  &:hover {
    background: rgba(255, 255, 255, 0.06);
    color: #fff;
  }

  &.active {
    background: rgba(255, 255, 255, 0.1);
    color: #fff;
    border-left-color: #4ea3ff;
    font-weight: 600;
  }

  .ico {
    width: 18px;
    text-align: center;
    opacity: 0.9;
  }
}

.content-wrap {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sub-tabs {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 16px;
  height: 46px;
  background: #fff;
  border-bottom: 1px solid #e3e9f0;
  overflow-x: auto;
  box-shadow: 0 1px 3px rgba(16, 42, 71, 0.05);
}

.sub-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  font-size: 13px;
  color: #5a6b7e;
  cursor: pointer;
  border-radius: 6px;
  white-space: nowrap;
  border-bottom: 2px solid transparent;
  transition: 0.15s;

  &:hover {
    background: #eef4fb;
    color: #1e4d8b;
  }

  &.active {
    color: #1e4d8b;
    font-weight: 600;
    background: #eef4fb;
    border-bottom-color: #2a6bb0;
  }

  .ico {
    font-size: 14px;
  }
}

.content {
  flex: 1;
  overflow-y: auto;
  padding: 18px 22px;
}
</style>
