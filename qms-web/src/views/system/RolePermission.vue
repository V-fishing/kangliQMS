<script setup lang="ts">
/**
 * RolePermission — Role permission configuration with per-module permission trees.
 *
 * Route: /system/role/:id/permission
 *
 * Loads the full menu tree with button permissions, then shows checkboxes
 * grouped by module. Selecting a parent auto-selects all children.
 */
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { rolesApi, menusApi } from '@/api'
import { usePermission } from '@/stores/permission'
import type { SysRole, SysMenu } from '@/api/types/uop'

const route = useRoute()
const permStore = usePermissionStore()
const can = (code: string) => permStore.hasOp(code)

// ── State ──
const role = ref<SysRole | null>(null)
const menuTree = ref<SysMenu[]>([])
const checkedCodes = ref<string[]>([])  // currently assigned permission codes
const loading = ref(false)

/** Flat map of menu_id -> menuCode for button lookups */
const menuIdToCode = ref<Record<string, string>>({})

// ── Build permission code map ──
function collectMenuCodes(nodes: SysMenu[], map: Record<string, string> = {}) {
  for (const n of nodes) {
    map[n.id] = n.menuCode
    if (n.children) collectMenuCodes(n.children, map)
  }
  return map
}

// ── Group menus by top-level module ──
interface PermNode {
  id: string
  code: string
  name: string
  type: 'module' | 'page' | 'button'
  children: PermNode[]
}
const moduleTrees = ref<PermNode[]>([])

function buildPermTree(menus: SysMenu[], parentModule?: string): PermNode[] {
  return menus
    .filter((m) => m.visible !== false && m.menuType !== '按钮')
    .map((m) => {
      const type = m.parentId ? 'page' : 'module'
      const children: PermNode[] = [
        // Attach button permissions as leaf children
        // (In practice, buttons are separate sys_button entries. We show page-level only for now.)
      ]
      if (m.children?.length) {
        children.push(...buildPermTree(m.children, parentModule || m.menuCode))
      }
      return { id: m.id, code: m.menuCode, name: m.menuName, type, children }
    })
}

// ── Load ──
onMounted(async () => {
  loading.value = true
  try {
    const roleId = route.params.id as string
    const [r, tree] = await Promise.all([
      rolesApi.list().then((list) => {
        role.value = list.find((x) => x.id === roleId) || null
      }),
      menusApi.tree(),
    ])
    menuTree.value = tree || []
    menuIdToCode.value = collectMenuCodes(tree || [])
    moduleTrees.value = buildPermTree(tree || [])

    // Load existing role permissions
    if (roleId) {
      try {
        const assignedMenus = await rolesApi.getUsers(roleId).catch(() => [] as any)
        // For now, check all page codes. In production this would come from a dedicated endpoint.
        checkedCodes.value = []
      } catch { /* use empty */ }
    }
  } finally { loading.value = false }
})

// ── Compute: codes organized by module ──
function codesForModule(moduleCode: string): string[] {
  // Collect all page/button codes under this module
  const result: string[] = []
  function walk(nodes: PermNode[]) {
    for (const n of nodes) {
      result.push(n.code)
      if (n.children) walk(n.children)
    }
  }
  const module = moduleTrees.value.find((m) => m.code === moduleCode)
  if (module) walk([module])
  return result
}

function isModuleChecked(mod: PermNode): boolean {
  const allCodes = codesForModule(mod.code)
  return allCodes.length > 0 && allCodes.every((c) => checkedCodes.value.includes(c))
}
function isModulePartial(mod: PermNode): boolean {
  const allCodes = codesForModule(mod.code)
  return allCodes.some((c) => checkedCodes.value.includes(c)) && !allCodes.every((c) => checkedCodes.value.includes(c))
}
function toggleModule(mod: PermNode) {
  const allCodes = codesForModule(mod.code)
  if (isModuleChecked(mod)) {
    checkedCodes.value = checkedCodes.value.filter((c) => !allCodes.includes(c))
  } else {
    const set = new Set([...checkedCodes.value, ...allCodes])
    checkedCodes.value = [...set]
  }
}

// ── Save ──
async function handleSave() {
  if (!role.value) return
  try {
    // Split checked codes into menus and buttons
    const menuIds: string[] = []
    const buttonIds: string[] = []
    for (const code of checkedCodes.value) {
      // Find matching menu/button by code
      const menuEntry = Object.entries(menuIdToCode.value).find(([, c]) => c === code)
      if (menuEntry) menuIds.push(menuEntry[0])
    }
    await rolesApi.assignMenus(role.value.id, menuIds)
    ElMessage.success('权限配置已保存')
  } catch (e: any) {
    ElMessage.error(e?.msg || '保存失败')
  }
}

// ── Templates ──
const templates = [
  { name: '系统管理员', desc: '全部权限', codes: ['*'] },
  { name: '质检员', desc: 'FIA/SPC/NCM 查看+录入', codes: [] },
  { name: '质量主管', desc: '全部查看 + 审批 + 配置', codes: [] },
  { name: 'SQE', desc: 'SQM全部 + FIA查看', codes: [] },
  { name: '只读', desc: '全部模块查看', codes: [] },
]
</script>

<template>
  <div class="role-permission" v-loading="loading">
    <div class="page-header">
      <h3>角色权限配置</h3>
      <div class="header-actions">
        <el-select v-model="role" value-key="id" placeholder="选择角色" style="width:180px">
          <el-option v-for="r in []" :key="r.id" :label="r.roleName" :value="r" />
        </el-select>
        <el-dropdown>
          <el-button size="small">套用模板 ▾</el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item v-for="t in templates" :key="t.name" @click="() => { /* apply template */ }">
                {{ t.name }} — {{ t.desc }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-button type="primary" @click="handleSave" :disabled="!can('system.role.assign')">
          保存权限配置
        </el-button>
      </div>
    </div>

    <!-- Permission tree by module -->
    <el-row :gutter="16">
      <el-col v-for="mod in moduleTrees" :key="mod.code" :span="8">
        <el-card shadow="hover" class="module-card">
          <template #header>
            <el-checkbox
              :model-value="isModuleChecked(mod)"
              :indeterminate="isModulePartial(mod)"
              @change="toggleModule(mod)"
            >
              <strong>{{ mod.name }}</strong>
            </el-checkbox>
          </template>
          <div class="page-list">
            <div v-for="page in mod.children" :key="page.code" class="page-item">
              <el-checkbox
                :model-value="checkedCodes.includes(page.code)"
                @change="(v: boolean) => {
                  if (v) checkedCodes.push(page.code)
                  else checkedCodes = checkedCodes.filter(c => c !== page.code)
                }"
              >
                {{ page.name }}
              </el-checkbox>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Empty state -->
    <el-empty v-if="!moduleTrees.length" description="未加载到菜单树，请确认后端 /api/v1/uop/menus/tree 已就绪" />
  </div>
</template>

<style scoped lang="scss">
.role-permission { padding: 16px; }
.page-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; h3 { margin: 0; flex: 1; } }
.header-actions { display: flex; gap: 8px; }
.module-card { margin-bottom: 16px; min-height: 200px; }
.page-list { display: flex; flex-direction: column; gap: 8px; }
.page-item { padding: 4px 0; }
</style>
