<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useDictStore } from '@/stores/dict'
import { BANNERS } from '@/config/banners'
import SchemaForm from '@/components/form/SchemaForm.vue'
import { ncmApi } from '@/api'

const authStore = useAuthStore()
const dictStore = useDictStore()
const banner = BANNERS.ncm?.[authStore.role] || {
  title: 'NCM · 不良字典',
  desc: '不良类别与不良代码维护（SR-NCM-005）',
}

/** 不良字典数据（编码全局唯一 · 停用不可复用） */
const list = ref<Record<string, unknown>[]>([])

/** 分类/等级选项统一取自系统字典 sys_dict（ncm_defect_category / severity），
 *  避免「库内无字典时下拉为空、无法录入首条」的鸡生蛋问题，并与全系统保持一致 */

/** 加载字典数据 */
const loading = ref(false)
async function loadDict() {
  loading.value = true
  try {
    const data = await ncmApi.getDict()
    list.value = data.map((d) => ({ ...d }))
  } catch (e) {
    list.value = []
  } finally {
    loading.value = false
  }
}
onMounted(loadDict)

/** 筛选条件 */
const fCat = ref('')
const fLvl = ref('')
const fQ = ref('')

const filtered = computed(() => {
  const q = fQ.value.trim().toLowerCase()
  return list.value.filter((d: any) =>
    (!fCat.value || d.cat === fCat.value) &&
    (!fLvl.value || d.lvl === fLvl.value) &&
    (!q || (d.code + ' ' + d.name).toLowerCase().includes(q)),
  )
})

/** 编辑弹窗 */
const dialog = ref(false)
const isEdit = ref(false)
const schema = computed(() => [
  { prop: 'code', label: '不良代码', type: 'input', required: true, placeholder: '如 D006', span: 12 },
  { prop: 'name', label: '不良名称', type: 'input', required: true, placeholder: '如 毛边', span: 12 },
  { prop: 'cat', label: '分类', type: 'select', required: true, options: dictStore.defectCategories, span: 12 },
  { prop: 'lvl', label: '严重等级', type: 'select', required: true, options: dictStore.severities, span: 12 },
])
const model = ref<Record<string, unknown>>({})
function openAdd() { isEdit.value = false; model.value = { status: '启用' }; dialog.value = true }
function openEdit(r: any) { isEdit.value = true; model.value = { ...r }; dialog.value = true }
async function onSubmit(v: Record<string, unknown>) {
  // 前端字段 cat/lvl → 后端 category/level
  const payload: Record<string, unknown> = {
    code: v.code,
    name: v.name,
    category: v.cat,
    level: v.lvl,
    status: v.status ?? '启用',
  }
  try {
    if (v.id) {
      await ncmApi.updateDict(String(v.id), payload)
    } else {
      await ncmApi.createDict(payload)
    }
    dialog.value = false
    ElMessage.success('不良代码已保存')
    await loadDict()
  } catch (e: any) {
    ElMessage.error(e?.msg || e?.message || '保存失败')
  }
}

/** 停用 / 启用（有统计数不可删除，仅可停用，HTML 规则） */
async function toggleStatus(r: any) {
  if (!r.id) { ElMessage.error('缺少后端标识，无法更新'); return }
  const next = r.status === '启用' ? '停用' : '启用'
  try {
    await ncmApi.updateDict(r.id, { status: next })
    ElMessage.success(`已${next} ${r.code}`)
    await loadDict()
  } catch (e: any) {
    ElMessage.error(e?.msg || e?.message || '状态更新失败')
  }
}
/** 删除：仅当统计数为 0 时允许 */
function remove(r: any) {
  if (r.cnt > 0) {
    ElMessage.warning('有统计数据，不可删除，仅可停用')
    return
  }
  if (!r.id) { ElMessage.error('缺少后端标识，无法删除'); return }
  ElMessageBox.confirm(`确认删除不良代码 ${r.code}（${r.name}）？`, '删除确认', {
    type: 'warning',
  }).then(async () => {
    try {
      await ncmApi.deleteDict(r.id)
      ElMessage.success('已删除')
      await loadDict()
    } catch (e: any) {
      ElMessage.error(e?.msg || e?.message || '删除失败')
    }
  }).catch(() => {})
}

function downloadTpl() { ElMessage.success('模板已下载（演示）') }
function importExcel() { ElMessage.success('导入校验完成（演示）') }
</script>

<template>
  <div class="ncm-dict">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">📚</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <div class="qms-card">
      <div class="qms-card__header">
        <h3>不良字典维护</h3>
        <span class="qms-tag">SR-NCM-005</span>
        <span class="qms-tag ghost">编码全局唯一 · 停用不可复用</span>
        <span class="sp" />
        <el-button size="small" type="primary" @click="openAdd">+ 新增</el-button>
        <el-button size="small" @click="downloadTpl">下载模板</el-button>
        <el-button size="small" @click="importExcel">Excel 导入</el-button>
      </div>

      <div class="qms-card__body">
        <div class="filter-bar">
          <el-select v-model="fCat" placeholder="全部分类" clearable style="width: 150px">
            <el-option v-for="c in dictStore.defectCategories" :key="c.value" :label="c.label" :value="c.value" />
          </el-select>
          <el-select v-model="fLvl" placeholder="全部等级" clearable style="width: 130px">
            <el-option v-for="s in dictStore.severities" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
          <el-input v-model="fQ" placeholder="搜索编码 / 名称" clearable style="width: 200px" />
          <span class="sp" />
          <span class="meta">共 {{ filtered.length }} 条</span>
        </div>

        <el-table :data="filtered" border size="small" class="dict-table">
          <el-table-column prop="code" label="编码" width="110" />
          <el-table-column prop="name" label="名称" min-width="120" />
          <el-table-column prop="cat" label="分类" width="100" />
          <el-table-column label="等级" width="90">
            <template #default="{ row }">
              <span class="qms-pill" :class="row.lvl === '严重' ? 'r' : 'y'">{{ row.lvl }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="cnt" label="统计数" width="90" align="right" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <el-tag :type="row.status === '启用' ? 'success' : 'info'" size="small" effect="light">
                {{ row.status }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" min-width="190" fixed="right">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
              <el-button
                v-if="row.status === '启用'"
                link
                :type="row.cnt > 0 ? 'warning' : 'danger'"
                size="small"
                @click="row.cnt > 0 ? toggleStatus(row) : remove(row)"
              >
                {{ row.cnt > 0 ? '停用' : '删除' }}
              </el-button>
              <el-button v-else link type="success" size="small" @click="toggleStatus(row)">启用</el-button>
            </template>
          </el-table-column>
          <template #empty>无匹配不良类型</template>
        </el-table>

        <div class="note">
          📌 有统计数据的不良类型不可删除，仅可停用；停用后不出现在录入列表，历史记录可查；编码全局唯一，停用编码不可复用。
        </div>
      </div>
    </div>

    <el-dialog v-model="dialog" :title="isEdit ? '编辑不良代码' : '新增不良代码'" width="520px">
      <SchemaForm :schema="schema" :model-value="model" @submit="onSubmit" />
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.ncm-dict { display: flex; flex-direction: column; gap: 14px; }

.qms-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
  .sp { flex: 1; }
}
.qms-tag {
  font-size: 12px;
  padding: 1px 8px;
  border-radius: 10px;
  background: #eef2f7;
  color: #5a6b7e;
  &.ghost { background: transparent; border: 1px solid #d8e0ea; }
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  .sp { flex: 1; }
  .meta { color: #8a98a8; font-size: 13px; }
}

.dict-table { width: 100%; }

.note {
  margin-top: 12px;
  padding: 10px 12px;
  background: #f5f8fc;
  border: 1px solid #e3eaf2;
  border-radius: 8px;
  color: #6b7a8c;
  font-size: 12.5px;
  line-height: 1.6;
}
</style>
