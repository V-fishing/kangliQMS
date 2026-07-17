<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/mock/roles'
import ScanInput from '@/components/common/ScanInput.vue'
import QuickDefectEntry from '@/components/form/QuickDefectEntry.vue'
import PhotoWatermark from '@/components/common/PhotoWatermark.vue'

const authStore = useAuthStore()
const banner = BANNERS.ncm?.[authStore.role] || {
  title: 'NCM · 不良录入',
  desc: '扫码识别工单，快速录入不良并拍照留证',
}

const scanned = ref(false)
const prod = reactive({ wo: 'WO-88231', prod: '外壳A-蓝', line: '产线A-注塑' })

// 录入通道：人工录入 / 设备自动检测（SR-NCM-001 人工 · SR-NCM-002 设备通道）
const src = ref<'manual' | 'device'>('manual')

const curUser = computed(() => authStore.currentRole?.name || '检验员')

const records = ref<any[]>([
  { id: 'NCM-001', type: '划伤', proc: '注塑', cnt: 3, sev: '一般', t: '13:20', src: '人工', who: '张检验' },
  { id: 'NCM-002', type: '缺料', proc: '组装', cnt: 1, sev: '严重', t: '12:50', src: '人工', who: '张检验' },
  { id: 'NCM-D01', type: '尺寸超差', proc: '焊接', cnt: 2, sev: '严重', t: '12:30', src: '设备', who: 'AOI-检测机-03' },
])

// 设备检测通道模拟（SR-NCM-002：设备上报自动记录并关联工序/批次）
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
  ElMessage.success(`设备自动检测：${s.dev} 上报「${s.type}」${s.cnt} 件，已自动关联工序与批次`)
}

function onScan(v: string) { scanned.value = true; prod.wo = v || prod.wo; ElMessage.success(`已识别：${prod.wo}`) }
function onDefect(d: any) {
  records.value.unshift({ id: 'NCM-' + (records.value.length + 1), type: d.type, proc: d.proc, cnt: d.count, sev: d.sev, t: new Date().toTimeString().slice(0, 5), src: '人工', who: curUser.value })
  ElMessage.success('不良已录入（人工）')
}
function onPhoto(d: { photo: string; timestamp: string; gps?: string }) { ElMessage.success(`照片已水印留存：${d.timestamp}`) }
</script>

<template>
  <div class="ncm-entry">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">📝</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <div class="filter-bar">
      <ScanInput placeholder="扫码识别工单 / 产品" @scan="onScan" />
      <span v-if="scanned" class="qms-pill g">已识别</span>
      <span class="sp" />
      <span class="lbl">录入通道：</span>
      <div class="seg">
        <el-button :type="src === 'manual' ? 'primary' : 'default'" size="small" @click="src = 'manual'">✏️ 人工录入</el-button>
        <el-button :type="src === 'device' ? 'primary' : 'default'" size="small" @click="src = 'device'">🤖 设备自动检测</el-button>
      </div>
    </div>

    <div class="qms-card" v-if="scanned">
      <div class="qms-card__header"><h3>产品信息</h3></div>
      <div class="qms-card__body">
        <div class="info-grid">
          <div><span>工单号</span><b>{{ prod.wo }}</b></div>
          <div><span>产品</span><b>{{ prod.prod }}</b></div>
          <div><span>产线</span><b>{{ prod.line }}</b></div>
        </div>
      </div>
    </div>

    <!-- 人工录入 -->
    <template v-if="src === 'manual'">
      <div class="chart-grid chart-grid--2">
        <div class="qms-card">
          <div class="qms-card__header"><h3>不良快速录入（≤3步）</h3></div>
          <div class="qms-card__body"><QuickDefectEntry @submit="onDefect" /></div>
        </div>
        <div class="qms-card">
          <div class="qms-card__header"><h3>照片水印留证</h3></div>
          <div class="qms-card__body"><PhotoWatermark @capture="onPhoto" /></div>
        </div>
      </div>
    </template>

    <!-- 设备自动检测通道 -->
    <template v-else>
      <div class="qms-card">
        <div class="qms-card__header">
          <h3>设备自动检测通道</h3>
          <span class="tag">设备上报自动记录 · 关联工序与批次</span>
          <div class="grow"></div>
          <el-button type="primary" size="small" @click="simulateDevice">模拟设备检测</el-button>
        </div>
        <div class="qms-card__body">
          <div class="note">设备完成自动检测并上报结果后，系统自动识别不良品、记录不良类型与数量，并自动关联当前生产工序与批次（SR-NCM-002 / SR-NCM-003）。设备数据格式异常时拒绝写入并告警设备维护人员。</div>
          <el-table :data="deviceFeed" border size="small" style="margin-top: 10px">
            <el-table-column prop="id" label="检测记录" width="120" />
            <el-table-column prop="type" label="不良类型" width="130" />
            <el-table-column prop="proc" label="工序" width="100" />
            <el-table-column prop="cnt" label="数量" width="80" />
            <el-table-column label="严重度" width="90">
              <template #default="{ row }"><span class="qms-pill" :class="row.sev === '严重' ? 'r' : 'y'">{{ row.sev }}</span></template>
            </el-table-column>
            <el-table-column prop="who" label="检测设备" width="140" />
            <el-table-column prop="t" label="时间" />
          </el-table>
          <div v-if="!deviceFeed.length" class="empty">暂无设备检测数据，点击「模拟设备检测」演示自动采集</div>
        </div>
      </div>
    </template>

    <div class="qms-card">
      <div class="qms-card__header"><h3>不良记录</h3><span class="tag">人工 + 设备 统一台账</span></div>
      <div class="qms-card__body" style="padding: 0">
        <el-table :data="records" border size="small">
          <el-table-column prop="id" label="记录号" width="120" />
          <el-table-column label="来源" width="80">
            <template #default="{ row }">
              <span class="qms-pill" :class="row.src === '设备' ? 'b' : 'g'">{{ row.src }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="type" label="不良类别" width="120" />
          <el-table-column prop="proc" label="工序" width="100" />
          <el-table-column prop="cnt" label="数量" width="70" />
          <el-table-column label="严重度" width="90">
            <template #default="{ row }"><span class="qms-pill" :class="row.sev === '严重' ? 'r' : 'y'">{{ row.sev }}</span></template>
          </el-table-column>
          <el-table-column prop="who" label="录入方" width="130" />
          <el-table-column prop="t" label="时间" width="80" />
        </el-table>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.ncm-entry { display: flex; flex-direction: column; gap: 14px; }
.filter-bar { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; .sp { flex: 1; } .lbl { font-weight: 600; } .grow { flex: 1; } }
.seg { display: inline-flex; gap: 6px; }
.info-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 24px;
  div { display: flex; flex-direction: column; gap: 2px; span { font-size: 11px; color: #5a6b7e; } b { font-size: 13.5px; } } }
.note { margin-top: 4px; padding: 10px 14px; background: #eef4fb; border-left: 3px solid #1e4d8b; border-radius: 0 6px 6px 0; font-size: 12px; color: #5a6b7e; line-height: 1.6; }
.empty { padding: 18px; text-align: center; color: #8a9bb0; font-size: 13px; }
</style>
