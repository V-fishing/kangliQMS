<script setup lang="ts">
import { ref, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/mock/roles'
import SchemaForm from '@/components/form/SchemaForm.vue'
import { spcParams } from '@/mock/spc'
import type { SpcParam } from '@/types/spc'

const authStore = useAuthStore()
const banner = BANNERS.spc?.[authStore.role] || {
  title: 'SPC · 参数配置',
  desc: '监控参数、规格限与控制图类型维护',
}

const list = ref<SpcParam[]>([...spcParams])

// 基线与控制限
const cfg = reactive({
  baseline: '前25子组',
  subgroupSize: 5,
  autoXbarR: true,
  autoXbarS: true,
  autoImr: true,
})
// CPK 计算配置
const calc = reactive({
  period: '按月',
  levelOk: 1.33,
  levelWarn: 1.0,
  specSource: '标准库',
})

const dialog = ref(false)
const schema = [
  { prop: 'p', label: '参数名', type: 'input', required: true },
  { prop: 'proc', label: '工序', type: 'input', required: true },
  { prop: 'unit', label: '单位', type: 'input', required: true },
  { prop: 'sl', label: '规格上下限', type: 'input', required: true },
  { prop: 'sg', label: '子组大小', type: 'inputNumber', value: 5, min: 1, max: 25 },
  { prop: 'freq', label: '采集频率', type: 'input', value: '1次/30min' },
  {
    prop: 'chartType',
    label: '控制图类型',
    type: 'select',
    options: [{ label: 'Xbar-R', value: 'Xbar-R' }, { label: 'Xbar-s', value: 'Xbar-s' }, { label: 'I-MR', value: 'I-MR' }],
  },
]
const model = ref<Record<string, unknown>>({})

function openAdd() { model.value = {}; dialog.value = true }
function openEdit(r: SpcParam) { model.value = { ...r }; dialog.value = true }
function onSubmit(v: Record<string, unknown>) {
  const idx = list.value.findIndex((x) => x.p === v.p)
  if (idx >= 0) list.value[idx] = { ...list.value[idx], ...(v as SpcParam) }
  else list.value.unshift(v as SpcParam)
  dialog.value = false
  ElMessage.success('参数已保存')
}
function onDelete(r: SpcParam) {
  ElMessageBox.confirm(`参数「${r.p}」关联子组数据 N 条，确认删除？`, '删除确认', {
    confirmButtonText: '确认删除',
    cancelButtonText: '取消',
    type: 'warning',
  }).then(() => {
    list.value = list.value.filter((x) => x.p !== r.p)
    ElMessage.success('已删除')
  }).catch(() => {})
}
</script>

<template>
  <div class="spc-param">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">⚙️</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <div class="qms-card">
      <div class="qms-card__header">
        <h3>SPC 参数配置</h3>
        <span class="tag">工序-参数 CRUD</span>
        <span class="sp"></span>
        <el-button type="primary" size="small" @click="openAdd">+ 新增参数</el-button>
      </div>
      <div class="qms-card__body" style="padding: 0">
        <el-table :data="list" border size="small">
          <el-table-column prop="p" label="参数" min-width="100" />
          <el-table-column prop="proc" label="工序" width="90" />
          <el-table-column prop="unit" label="单位" width="80" />
          <el-table-column prop="sl" label="规格上下限" min-width="110" />
          <el-table-column prop="sg" label="子组大小" width="90" />
          <el-table-column prop="freq" label="采集频率" min-width="100" />
          <el-table-column prop="chartType" label="控制图类型" width="110" />
          <el-table-column label="操作" width="130">
            <template #default="{ row }">
              <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="onDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <div class="chart-grid chart-grid--2">
      <div class="qms-card">
        <div class="qms-card__header"><h3>基线与控制限</h3></div>
        <div class="qms-card__body">
          <div class="form-grid">
            <div class="form-row">
              <label>基线建立</label>
              <div class="seg">
                <el-button :type="cfg.baseline === '前25子组' ? 'primary' : 'default'" size="small" @click="cfg.baseline = '前25子组'">前25子组建基线，后续动态更新</el-button>
                <el-button :type="cfg.baseline === '历史预设' ? 'primary' : 'default'" size="small" @click="cfg.baseline = '历史预设'">历史预设值</el-button>
              </div>
            </div>
            <div class="form-row">
              <label>子组大小默认</label>
              <el-input v-model.number="cfg.subgroupSize" style="width: 64px" />
              <span class="meta">（1-25，0或负数拒绝）</span>
            </div>
            <div class="form-row">
              <label>控制图自动选择</label>
              <div class="check-list">
                <label><el-checkbox v-model="cfg.autoXbarR" /> 子组&lt;10 → Xbar-R</label>
                <label><el-checkbox v-model="cfg.autoXbarS" /> 子组≥10 → Xbar-s</label>
                <label><el-checkbox v-model="cfg.autoImr" /> 单值 → I-MR</label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="qms-card">
        <div class="qms-card__header"><h3>CPK 计算配置</h3></div>
        <div class="qms-card__body">
          <div class="form-grid">
            <div class="form-row">
              <label>计算周期</label>
              <div class="seg">
                <el-button :type="calc.period === '按月' ? 'primary' : 'default'" size="small" @click="calc.period = '按月'">按月(滑动30天)</el-button>
                <el-button :type="calc.period === '按批次' ? 'primary' : 'default'" size="small" @click="calc.period = '按批次'">按批次</el-button>
                <el-button :type="calc.period === '按天' ? 'primary' : 'default'" size="small" @click="calc.period = '按天'">按天</el-button>
              </div>
            </div>
            <div class="form-row">
              <label>等级阈值</label>
              <span class="meta">充足 ≥</span>
              <el-input v-model.number="calc.levelOk" style="width: 64px" />
              <span class="meta">/ 尚可 ≥</span>
              <el-input v-model.number="calc.levelWarn" style="width: 64px" />
            </div>
            <div class="form-row">
              <label>规格限来源</label>
              <div class="seg">
                <el-button :type="calc.specSource === '标准库' ? 'primary' : 'default'" size="small" @click="calc.specSource = '标准库'">检验标准库(当前生效版本)</el-button>
                <el-button :type="calc.specSource === '手工' ? 'primary' : 'default'" size="small" @click="calc.specSource = '手工'">手工配置</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <el-dialog v-model="dialog" :title="model.p ? '编辑参数' : '新增参数'" width="560px">
      <SchemaForm :schema="schema" :model-value="model" @submit="onSubmit" />
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.spc-param { display: flex; flex-direction: column; gap: 14px; }
.check-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 6px 2px;
  label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #1f2d3d;
  }
}
</style>
