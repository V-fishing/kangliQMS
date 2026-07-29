<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useAppStore } from '@/stores/app'
import { useCompanyStore } from '@/stores/company'
import { usePermissionStore } from '@/stores/permission'
import { MODULE_MENU_GROUPS } from '@/permission'
import type { CompanyId } from '@/types/company'
import { ROLES, type RoleId } from '@/mock/roles'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const appStore = useAppStore()
const companyStore = useCompanyStore()
const permStore = usePermissionStore()

// ── 侧边栏：分组 + 折叠 ──────────────────────────────

/** 展开的菜单组索引（默认第一个展开，其余折叠） */
const expandedGroups = ref<number[]>([0])

function toggleGroup(idx: number) {
  const i = expandedGroups.value.indexOf(idx)
  if (i >= 0) expandedGroups.value.splice(i, 1)
  else expandedGroups.value.push(idx)
}

/** 当前角色可见的菜单组 */
const visibleGroups = computed(() =>
  MODULE_MENU_GROUPS
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        item.roles.includes(authStore.currentRole?.id ?? '') || permStore.isAdmin,
      ),
    }))
    .filter((group) => group.items.length > 0),
)

const activeModule = computed(() => (route.meta.module as string) || 'overview')
const activePath = computed(() => '/' + route.path.split('/').filter(Boolean).slice(0, 2).join('/'))

// ── 顶栏 ────────────────────────────────────────────

const devPanelOpen = ref(false)
const clock = ref('')
let timer: ReturnType<typeof setInterval>

function tickClock() {
  const d = new Date(); const p = (n: number) => String(n).padStart(2, '0')
  clock.value = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`
}

onMounted(() => { tickClock(); timer = setInterval(tickClock, 30000) })
onUnmounted(() => clearInterval(timer))

// ── 导航 ────────────────────────────────────────────

function navigate(path: string) {
  router.push(path)
}

function switchCompany(id: CompanyId) { companyStore.switchCompany(id); companyMenuOpen.value = false }
function switchToGroup() { companyStore.switchToGroup(); companyMenuOpen.value = false }

const companyMenuOpen = ref(false)
</script>

<template>
  <div class="app-shell">
    <!-- ═══ 顶栏 ═══ -->
    <header class="topbar">
      <div class="brand">
        <span class="brand-icon">KL</span>
        <span class="brand-title">康立 QMS</span>
      </div>

      <div class="topbar-center">
        <span class="env-badge">开发环境</span>
      </div>

      <div class="topbar-right">
        <!-- 公司切换 -->
        <div class="company-picker">
          <button class="cp-btn" @click="companyMenuOpen = !companyMenuOpen">
            <span class="dot" :style="{ background: companyStore.isGroup ? '#7a5bb0' : companyStore.currentCompany?.color || '#5b8def' }" />
            {{ companyStore.contextLabel() }}
            <span class="arrow">▾</span>
          </button>
          <div v-show="companyMenuOpen" class="cp-drop" @click.stop>
            <div v-for="c in companyStore.availableCompanies" :key="c.id" class="cp-opt"
                 :class="{ active: !companyStore.isGroup && companyStore.currentCompanyId === c.id }"
                 @click="switchCompany(c.id)">
              <span class="dot" :style="{ background: c.color }" /> {{ c.shortName }}
              <small>{{ companyStore.accountPerm[c.id] }}</small>
            </div>
            <div v-if="companyStore.canSwitchGroup" class="cp-opt group"
                 :class="{ active: companyStore.isGroup }" @click="switchToGroup()">
              <span class="dot" style="background:#7a5bb0" /> 集团总览 <small>只读</small>
            </div>
          </div>
        </div>

        <!-- 用户 -->
        <span class="user-label">{{ authStore.userName || authStore.account }}</span>
        <button class="icon-btn" title="退出" @click="authStore.logout()">⏻</button>

        <!-- 开发面板 -->
        <button class="icon-btn dev-toggle" @click="devPanelOpen = !devPanelOpen" title="开发工具">⚙</button>
        <span class="clock">{{ clock }}</span>
      </div>
    </header>

    <div class="body">
      <!-- ═══ 侧边栏 ═══ -->
      <aside class="sidebar" :class="{ collapsed: appStore.sidebarCollapsed }">
        <div class="sidebar-scroll">
          <div v-for="(group, gi) in visibleGroups" :key="gi" class="nav-group">
            <div class="nav-group-label" @click="toggleGroup(gi)">
              <span class="expand-icon">{{ expandedGroups.includes(gi) ? '▾' : '▸' }}</span>
              {{ group.label }}
            </div>
            <div v-show="expandedGroups.includes(gi)" class="nav-group-items">
              <router-link
                v-for="item in group.items"
                :key="item.path"
                :to="item.path"
                class="nav-link"
                :class="{ active: activeModule === item.path.slice(1).split('/')[0] }"
              >
                <el-icon class="nav-icon"><component :is="item.icon" /></el-icon>
                <span>{{ item.title }}</span>
              </router-link>
            </div>
          </div>
        </div>

        <!-- 折叠按钮 -->
        <div class="sidebar-fold" @click="appStore.toggleSidebar()">
          {{ appStore.sidebarCollapsed ? '▶' : '◀' }}
        </div>
      </aside>

      <!-- ═══ 主内容 ═══ -->
      <main class="main">
        <RouterView v-slot="{ Component, route: r }">
          <transition name="page-fade" mode="out-in">
            <keep-alive :max="20">
              <component :is="Component" :key="r.fullPath + '#' + companyStore.currentCompanyId" />
            </keep-alive>
          </transition>
        </RouterView>
      </main>
    </div>

    <!-- ═══ 开发面板（角色切换等） ═══ -->
    <Transition name="slide-up">
      <div v-if="devPanelOpen" class="dev-panel">
        <div class="dev-title">开发工具 · 角色切换</div>
        <div class="dev-roles">
          <button v-for="r in ROLES" :key="r.id"
            class="dev-role-btn"
            :class="{ active: authStore.role === r.id }"
            @click="authStore.switchRole(r.id); router.replace(route.fullPath)">
            <span class="dot" :style="{ background: r.color }" />
            {{ r.icon }} {{ r.name }}
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style lang="scss">
/* ═══ Design Tokens ═══ */
$c-brand:   #1e4d8b;
$c-brand-l: #2a6bb0;
$c-sidebar: #10243e;
$c-bg:      #f4f6f9;
$c-border:  #e4e8ee;
$c-text:    #2c3e50;
$c-text-l:  #6b7d95;
$c-active-bg: rgba(30, 77, 139, 0.08);
$c-active-tx: $c-brand;

/* ═══ Shell ═══ */
.app-shell {
  display: flex; flex-direction: column; height: 100vh; overflow: hidden;
  font-family: "PingFang SC", "Microsoft YaHei", "Helvetica Neue", sans-serif;
  color: $c-text; background: $c-bg;
}

/* ── Topbar ── */
.topbar {
  height: 48px; background: $c-brand; color: #fff;
  display: flex; align-items: center; padding: 0 16px; flex-shrink: 0;
  box-shadow: 0 1px 4px rgba(0,0,0,.12); z-index: 30;
}
.brand { display: flex; align-items: center; gap: 8px; }
.brand-icon {
  width: 26px; height: 26px; border-radius: 5px; background: #fff; color: $c-brand;
  display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 13px;
}
.brand-title { font-size: 15px; font-weight: 600; letter-spacing: .5px; }

.topbar-center { flex: 1; display: flex; justify-content: center; }
.env-badge { font-size: 11px; background: rgba(255,255,255,.15); padding: 2px 8px; border-radius: 10px; }

.topbar-right { display: flex; align-items: center; gap: 10px; }
.user-label { font-size: 13px; opacity: .85; }
.icon-btn { background: none; border: none; color: #fff; font-size: 16px; cursor: pointer; padding: 4px 6px; border-radius: 4px; opacity: .75; &:hover { opacity: 1; background: rgba(255,255,255,.1); } }
.dev-toggle { font-size: 14px; }
.clock { font-size: 12px; opacity: .7; font-variant-numeric: tabular-nums; }

/* Company Picker */
.company-picker { position: relative; }
.cp-btn {
  background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.25); color: #fff;
  padding: 5px 10px; border-radius: 5px; cursor: pointer; font-size: 12px;
  display: flex; align-items: center; gap: 6px;
  &:hover { background: rgba(255,255,255,.22); }
  .dot { width: 8px; height: 8px; border-radius: 50%; border: 1.5px solid rgba(255,255,255,.6); }
  .arrow { font-size: 9px; }
}
.cp-drop {
  position: absolute; right: 0; top: 38px; background: #fff; color: $c-text;
  border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,.15); min-width: 200px; padding: 4px; z-index: 50;
}
.cp-opt {
  display: flex; align-items: center; gap: 8px; padding: 8px 10px; border-radius: 6px; cursor: pointer; font-size: 13px;
  &:hover { background: $c-active-bg; }
  &.active { background: $c-active-bg; color: $c-active-tx; font-weight: 600; }
  .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  small { margin-left: auto; font-size: 11px; color: $c-text-l; }
  &.group { border-top: 1px dashed $c-border; margin-top: 4px; }
}

/* ── Body ── */
.body { display: flex; flex: 1; overflow: hidden; }

/* ── Sidebar ── */
.sidebar {
  width: 200px; background: $c-sidebar; color: #b8c7dd;
  display: flex; flex-direction: column; flex-shrink: 0; transition: width .2s;
  &.collapsed { width: 48px;
    .nav-group-label span:not(.expand-icon), .nav-link span, .sidebar-fold span { display: none; }
  }
}
.sidebar-scroll { flex: 1; overflow-y: auto; padding: 8px 0; }
.sidebar-fold {
  height: 32px; display: flex; align-items: center; justify-content: center;
  cursor: pointer; border-top: 1px solid rgba(255,255,255,.06);
  color: #7e93ad; font-size: 11px;
  &:hover { color: #fff; background: rgba(255,255,255,.04); }
}

/* Nav Group */
.nav-group-label {
  padding: 9px 16px 5px; font-size: 11px; color: #5e7ba0; letter-spacing: 1px; text-transform: uppercase;
  cursor: pointer; user-select: none; display: flex; align-items: center; gap: 4px;
  &:hover { color: #a0b8d4; }
  .expand-icon { font-size: 9px; width: 10px; }
}
.nav-group-items { padding: 0 8px; }
.nav-link {
  display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 6px;
  font-size: 13px; color: #b8c7dd; text-decoration: none; transition: .12s;
  &:hover { background: rgba(255,255,255,.06); color: #fff; }
  &.active { background: rgba(255,255,255,.1); color: #fff; font-weight: 600; }
  .nav-icon { font-size: 16px; }
}

/* ── Main Content ── */
.main { flex: 1; overflow-y: auto; padding: 20px 24px; }

/* ── Dev Panel ── */
.dev-panel {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
  background: #1a2636; color: #cfdcec; padding: 10px 20px;
  box-shadow: 0 -4px 12px rgba(0,0,0,.2);
}
.dev-title { font-size: 11px; color: #7e93ad; margin-bottom: 6px; }
.dev-roles { display: flex; gap: 8px; flex-wrap: wrap; }
.dev-role-btn {
  background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.12); color: #cfdcec;
  padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 12px;
  display: flex; align-items: center; gap: 5px;
  &:hover { background: rgba(255,255,255,.15); }
  &.active { background: rgba(74, 163, 255, .25); border-color: rgba(74,163,255,.4); }
  .dot { width: 7px; height: 7px; border-radius: 50%; }
}

/* ── Transitions ── */
.page-fade-enter-active, .page-fade-leave-active { transition: opacity .15s; }
.page-fade-enter-from, .page-fade-leave-to { opacity: 0; }
.slide-up-enter-active, .slide-up-leave-active { transition: transform .2s ease; }
.slide-up-enter-from, .slide-up-leave-to { transform: translateY(100%); }
</style>
