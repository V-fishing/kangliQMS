<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/config/banners'
import { ncmApi } from '@/api'
import ScanInput from '@/components/common/ScanInput.vue'
import QuickDefectEntry from '@/components/form/QuickDefectEntry.vue'

const authStore = useAuthStore()
const banner = BANNERS.ncm?.[authStore.role] || {
  title: 'NCM · 不良录入',
  desc: '扫码识别工单，快速录入不良数据（≤ 3 步完成）',
}

const scanned = ref(false)
const prod = reactive({ wo: '', prod: '', line: '' })
const src = ref<'manual' | 'device'>('manual')

const records = ref<any[]>([])
async function loadRecords() {
  try {
    const [list, dicts] = await Promise.all([ncmApi.getRecords(), ncmApi.getDict()])
    const nameMap: Record<string, string> = {}
    dicts.forEach((d) => { if (d.code) nameMap[d.code] = d.name })
    records.value = list.map((r) => ({
      id: r.id, type: nameMap[r.type] || r.type, proc: r.proc,
      cnt: r.cnt, sev: r.sev, t: r.t, src: '人工', who: r.who,
    }))
  } catch { records.value = [] }
}
onMounted(loadRecords)

/* 统计 */
const stats = computed(() => ({
  total: records.value.length,
  severe: records.value.filter((r) => r.sev === '严重').length,
  device: records.value.filter((r) => r.src === '设备').length,
  manual: records.value.filter((r) => r.src === '人工').length,
}))

/* 设备检测通道演示 */
const deviceFeed = ref<any[]>([])
const deviceSamples = [
  { type: '尺寸超差', proc: '焊接', cnt: 2, sev: '严重', dev: 'AOI-检测机-03' },
  { type: '外观毛刺', proc: '注塑', cnt: 5, sev: '一般', dev: '视觉检测站-01' },
  { type: '装配错位', proc: '组装', cnt: 1, sev: '一般', dev: '扭矩检测台-02' },
  { type: '密封不良', proc: '检测', cnt: 3, sev: '严重', dev: '气密测试仪-05' },
]
function simulateDevice() {
  const s = deviceSamples[Math.floor(Math.random() * deviceSamples.length)]
  const rec = {
    id: 'NCM-D' + String(deviceFeed.value.length + 1).padStart(2, '0'),
    type: s.type, proc: s.proc, cnt: s.cnt, sev: s.sev,
    t: new Date().toTimeString().slice(0, 5), src: '设备', who: s.dev,
  }
  deviceFeed.value.unshift(rec)
  records.value.unshift({ ...rec })
  ElMessage.success(`${s.dev} 上报「${s.type}」${s.cnt} 件，已关联工序与批次`)
}

function onScan(v: string) { scanned.value = true; prod.wo = v || prod.wo; ElMessage.success(`已识别：${prod.wo}`) }
/** 长 ID 缩写：UUID / 36位字符串取最后 8 位 */
function shortId(id?: string): string {
  if (!id) return '—'
  return id.length > 8 ? '…' + id.slice(-8) : id
}
async function onDefect(d: any) {
  try {
    await ncmApi.createRecord({
      woNo: prod.wo || d.batchNo || undefined,
      batchNo: d.batchNo || undefined,
      processCode: d.proc,
      defectDictCode: d.type,
      severity: d.sev,
      defectCount: d.count,
      batchTotal: d.batchTotal,
      source: '手动',
      remark: d.desc || undefined,
    })
    ElMessage.success('不良已录入')
    await loadRecords()
  } catch { /* 拦截器统一提示 */ }
}
</script>

<template>
  <div class="ncm-entry">
    <!-- Banner -->
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">📝</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <!-- ===== Step 1：扫码识别（始终可见）===== -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>① 扫码识别工单</h3>
        <span v-if="scanned" class="qms-pill g">✓ 已识别</span>
        <div class="grow"></div>
        <span class="kpi-quick">
          已录入 <b>{{ stats.total }}</b> 项 ｜ 严重 <b class="r">{{ stats.severe }}</b> 项
        </span>
      </div>
      <div class="qms-card__body">
        <ScanInput placeholder="扫描工单条码 / 输入工单号" @scan="onScan" />

        <!-- 产品信息（识别后展示） -->
        <div v-if="scanned" class="prod-info">
          <div class="pi-item"><span>工单号</span><b>{{ prod.wo }}</b></div>
          <div class="pi-item"><span>产品</span><b>{{ prod.prod || '（录入时补充）' }}</b></div>
          <div class="pi-item"><span>产线</span><b>{{ prod.line || '（录入时补充）' }}</b></div>
        </div>
      </div>
    </div>

    <!-- ===== Step 2：不良录入（人工 / 设备两通道）===== -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>② 不良录入</h3>
        <div class="seg">
          <button :class="['seg-btn', { on: src === 'manual' }]" @click="src = 'manual'">✏️ 人工录入</button>
          <button :class="['seg-btn', { on: src === 'device' }]" @click="src = 'device'">🤖 设备通道</button>
        </div>
      </div>

      <div v-if="src === 'manual'" class="qms-card__body">
        <div v-if="!scanned" class="hint">💡 建议先扫码识别工单，系统将自动关联批次与工序信息</div>
        <QuickDefectEntry @submit="onDefect" />
      </div>

      <div v-else class="qms-card__body">
        <div class="note">设备完成自动检测后，系统自动识别不良品并记录类型与数量（SR-NCM-002）。</div>
        <div class="toolbar" style="margin-top:8px">
          <span class="sp"></span>
          <el-button type="primary" size="small" @click="simulateDevice">🔄 模拟设备检测</el-button>
        </div>
        <el-table v-if="deviceFeed.length" :data="deviceFeed" border size="small" style="margin-top:8px">
          <el-table-column prop="id" label="记录" width="100" />
          <el-table-column prop="type" label="类型" width="110" />
          <el-table-column prop="proc" label="工序" width="80" />
          <el-table-column prop="cnt" label="数量" width="60" />
          <el-table-column label="严重度" width="80">
            <template #default="{ row }"><span class="qms-pill" :class="row.sev === '严重' ? 'r' : 'y'">{{ row.sev }}</span></template>
          </el-table-column>
          <el-table-column prop="who" label="设备" width="140" />
          <el-table-column prop="t" label="时间" />
        </el-table>
        <div v-else class="empty">暂无设备记录，点击「模拟设备检测」演示自动上报</div>
      </div>
    </div>

    <!-- ===== Step 3：不良记录台账 ===== -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>③ 不良记录台账</h3>
        <span class="tag">人工 · 设备 统一视图</span>
        <div class="grow"></div>
        <span class="meta">共 {{ stats.total }} 条</span>
      </div>
      <div class="qms-card__body" style="padding:0">
        <el-table :data="records" border size="small" :row-key="(r) => r.id">
          <el-table-column label="编号" width="100">
            <template #default="{ row }">
              <el-tooltip :content="row.id" placement="top"><span class="ellipsis">{{ shortId(row.id) }}</span></el-tooltip>
            </template>
          </el-table-column>
          <el-table-column label="来源" width="70">
            <template #default="{ row }"><span class="qms-pill" :class="row.src === '设备' ? 'b' : 'g'">{{ row.src }}</span></template>
          </el-table-column>
          <el-table-column prop="type" label="不良类别" min-width="100" show-overflow-tooltip />
          <el-table-column prop="proc" label="工序" width="80" />
          <el-table-column prop="cnt" label="数量" width="60" />
          <el-table-column label="严重度" width="75">
            <template #default="{ row }"><span class="qms-pill" :class="row.sev === '严重' ? 'r' : 'y'">{{ row.sev }}</span></template>
          </el-table-column>
          <el-table-column label="录入方" width="120">
            <template #default="{ row }">
              <el-tooltip :content="row.who" placement="top"><span class="ellipsis">{{ shortId(row.who) }}</span></el-tooltip>
            </template>
          </el-table-column>
          <el-table-column prop="t" label="时间" width="80" />
        </el-table>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.ncm-entry { display: flex; flex-direction: column; gap: 14px; }
.grow { flex: 1; }
.seg { display: inline-flex; gap: 4px; }
.seg-btn {
  border: 1px solid #dbe7f7; background: #fff; border-radius: 4px;
  padding: 4px 12px; font-size: 12px; cursor: pointer; transition: 0.15s;
  &:hover { border-color: #1e4d8b; }
  &.on { background: #1e4d8b; border-color: #1e4d8b; color: #fff; }
}
.prod-info {
  display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px 16px;
  margin-top: 10px;
  .pi-item { display: flex; flex-direction: column; gap: 2px;
    span { font-size: 11px; color: #5a6b7e; }
    b { font-size: 13.5px; color: #1f2d3d; }
  }
}
.kpi-quick { font-size: 12px; color: #5a6b7e;
  b { font-weight: 600; color: #1e4d8b; }
  b.r { color: #c0392b; }
}
.note { padding: 8px 12px; background: #eef4fb; border-left: 3px solid #1e4d8b; border-radius: 0 6px 6px 0; font-size: 12px; color: #5a6b7e; }
.empty { padding: 24px; text-align: center; color: #8a9bb0; font-size: 13px; }
.hint { padding: 8px 12px; background: #fff8e1; border: 1px solid #f0c14b; border-radius: 6px; font-size: 12px; color: #7a6500; margin-bottom: 12px; }
.toolbar { display: flex; align-items: center; gap: 8px; .sp { flex: 1; } }
.meta { font-size: 12px; color: #8a94a6; }
.ellipsis { font-family: ui-monospace, "Cascadia Mono", Consolas, monospace; color: #1e4d8b; cursor: help; }
</style>
