<script setup lang="ts">
// 触发事件类型配置（共享字典）：被首件检验 / NCM(8D、CAPA) / 来料异常 / 审核 等多个模块引用，
// 故统一收口到「系统管理 / 配置中心」，作为跨模块的公共配置。
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { fiaApi } from '@/api/modules/fia'
import type { FiaTrigType } from '@/types/fia'

const loading = ref(false)
const triggers = ref<FiaTrigType[]>([])

async function refreshTriggers() {
  loading.value = true
  try {
    triggers.value = await fiaApi.getTriggerTypes()
  } catch {
    // 保留当前列表
  } finally {
    loading.value = false
  }
}
onMounted(refreshTriggers)

const dlg = reactive({ show: false, name: '', desc: '', editing: '' as string | null })
function openAdd() {
  dlg.editing = null
  dlg.name = ''
  dlg.desc = ''
  dlg.show = true
}
function openEdit(t: FiaTrigType) {
  dlg.editing = t.id ?? null
  dlg.name = t.name
  dlg.desc = t.desc
  dlg.show = true
}

const savingType = ref(false)
async function saveType() {
  const name = dlg.name.trim()
  if (!name) { ElMessage.warning('请输入触发类型名称'); return }
  if (!dlg.editing && triggers.value.some((x) => x.name === name)) {
    ElMessage.warning('触发类型已存在'); return
  }
  savingType.value = true
  try {
    if (dlg.editing) {
      const t = triggers.value.find((x) => x.id === dlg.editing)
      if (t?.id) {
        await fiaApi.updateTriggerType({ id: t.id, name, desc: dlg.desc.trim(), enabled: t.enabled })
      } else {
        await fiaApi.createTriggerType({ name, desc: dlg.desc.trim() })
      }
    } else {
      await fiaApi.createTriggerType({ name, desc: dlg.desc.trim() })
    }
    await refreshTriggers()
    dlg.show = false
    ElMessage.success('触发类型已保存')
  } catch (e: any) {
    ElMessage.error(e?.msg || e?.message || '保存失败，请重试')
  } finally {
    savingType.value = false
  }
}

async function toggle(t: FiaTrigType) {
  if (!t.id) return
  const next = !t.enabled
  t.enabled = next
  try {
    await fiaApi.toggleTriggerType(t.id, next)
  } catch (e: any) {
    t.enabled = !next
    ElMessage.error(e?.msg || e?.message || '操作失败')
  }
}

async function delType(t: FiaTrigType) {
  if (!t.id) return
  try {
    await ElMessageBox.confirm(`确认删除触发类型「${t.name}」？`, '删除确认', { type: 'warning' })
  } catch {
    return
  }
  try {
    await fiaApi.deleteTriggerType(t.id)
    await refreshTriggers()
    ElMessage.success('已删除')
  } catch (e: any) {
    ElMessage.error(e?.msg || e?.message || '删除失败')
  }
}
</script>

<template>
  <div class="qms-card trig-type-config">
    <div class="qms-card__header">
      <h3>触发事件类型配置</h3>
      <span class="tag">可增删改 · 即时生效（首件 / 来料异常 / 8D / CAPA 共用）</span>
    </div>
    <div class="qms-card__body">
      <el-table :data="triggers" v-loading="loading" stripe border style="width: 100%">
        <el-table-column label="触发类型" min-width="180">
          <template #default="{ row }">
            <div class="t-name">{{ row.name }}</div>
            <div class="t-desc">{{ row.desc }}</div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag size="small" :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '启用' : '停用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" align="center">
          <template #default="{ row }">
            <el-button size="small" @click="toggle(row)">{{ row.enabled ? '停用' : '启用' }}</el-button>
            <el-button size="small" text type="primary" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" text type="danger" @click="delType(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <div style="margin-top: 10px">
        <el-button type="primary" size="small" @click="openAdd">+ 新增类型</el-button>
      </div>
    </div>

    <el-dialog v-model="dlg.show" :title="dlg.editing ? '编辑触发类型' : '新增触发类型'" width="420px">
      <div class="form-grid">
        <div class="form-row full">
          <label>类型名称<span class="req">*</span></label>
          <el-input v-model="dlg.name" placeholder="如：换模具" style="max-width:240px" />
        </div>
        <div class="form-row full">
          <label>说明</label>
          <el-input v-model="dlg.desc" type="textarea" :rows="2" placeholder="触发条件说明" style="max-width:320px" />
        </div>
      </div>
      <template #footer>
        <el-button @click="dlg.show = false">取消</el-button>
        <el-button type="primary" :loading="savingType" @click="saveType">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.t-name { font-size: 13px; font-weight: 600; color: #1f2d3d; }
.t-desc { font-size: 11.5px; color: #909399; margin-top: 2px; }
</style>
