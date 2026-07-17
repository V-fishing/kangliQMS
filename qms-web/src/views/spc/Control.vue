<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/mock/roles'
import { spcSubgroups, spcLimit, spcMarks } from '@/mock/spc'
import SpcControlChart from '@/components/charts/SpcControlChart.vue'
import type { SpcSubgroup, SpcLimit, SpcMark } from '@/types/spc'

const router = useRouter()
const authStore = useAuthStore()
const banner = BANNERS.spc?.[authStore.role] || {
  title: 'SPC · 控制图监控',
  desc: 'Xbar-R 控制图实时监控与判异（SR-SPC-005/008）',
}

// ====== 8 步原子流程（对应 HTML renderSpcControl 监控原子流程） ======
const steps = [
  { cn: '①数据采集', cd: '人工/设备录入', st: 'done' },
  { cn: '②完整性校验', cd: '缺失标记告警', st: 'done' },
  { cn: '③基线建立', cd: '前25子组', st: 'done' },
  { cn: '④控制限计算', cd: 'UCL/CL/LCL动态', st: 'done' },
  { cn: '⑤判异规则', cd: 'WE①②③⑤检测', st: 'current' },
  { cn: '⑥告警分级', cd: '预警/报警', st: 'current' },
  { cn: '⑦多渠道通知', cd: '弹窗+企微', st: 'pending' },
  { cn: '⑧关闭填因', cd: '30分钟抑制', st: 'pending' },
] as const



// ====== 筛选栏（参数 / 时间范围 / 导出） ======
const params = ['注塑压力(MPa)', '焊接温度(℃)', '组装扭矩(N·m)']
const ranges = ['近25子组', '今日', '本周']
const selectedParam = ref(params[0])
const selectedRange = ref(ranges[0])
function onExport() {
  ElMessage.success('已导出 Excel + 图片（演示）')
}

// ====== 控制图（使用 mock spcSubgroups / spcLimit） ======
const subgroups = ref<SpcSubgroup[]>(spcSubgroups)
const limit = spcLimit as SpcLimit
// rules：用于 SpcControlChart 着色（code 与 sub.outlierRule 对应）
const rules = computed(() => spcMarks.map((m: SpcMark) => ({
  code: m.rule.charAt(0),
  level: m.level as '预警' | '报警',
})))
const anomalyCount = spcMarks.length

// 控制限信息（对应 HTML 控制限信息卡）
const controlInfo = [
  { k: '子组大小', v: '5' },
  { k: '子组数', v: '25' },
  { k: '图表类型', v: 'Xbar-R(子组<10)' },
  { k: 'UCL(Xbar)', v: limit.ucl.toFixed(2), danger: true },
  { k: 'CL(Xbar)', v: limit.cl.toFixed(2), ok: true },
  { k: 'LCL(Xbar)', v: limit.lcl.toFixed(2), danger: true },
  { k: '基线来源', v: '前25子组' },
]

// ====== 异常点（对应 HTML 异常点与判异规则命中） ======
const anomalies = spcMarks.map((m: SpcMark) => {
  if (m.range) {
    return {
      sub: `#${m.i + 1}-${m.i + 6}`,
      level: m.level,
      desc: `子组 #${m.i + 1}-${m.i + 6} ${m.rule} · 规则${m.rule.charAt(0)}`,
    }
  }
  return {
    sub: `#${m.i + 1}`,
    level: m.level,
    desc: `子组 #${m.i + 1} Xbar=${spcSubgroups[m.i].xbar.toFixed(2)} 超 UCL(${limit.ucl.toFixed(2)}) · 规则${m.rule.charAt(0)}`,
  }
})
function goAlarm() {
  router.push({ name: 'SpcAlarm' })
}
</script>

<template>
  <div class="spc-control">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">📈</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <!-- 8 步原子流程链 -->
    <div class="qms-card">
      <div class="qms-card__header"><h3>SPC 监控原子流程</h3><span class="tag">8 个原子节点</span></div>
      <div class="qms-card__body">
        <div class="step-chain">
          <div v-for="(s, i) in steps" :key="i" class="chain-step" :class="s.st">
            <div class="cn">{{ s.cn }}</div>
            <div class="cd">{{ s.cd }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 筛选栏 -->
    <div class="filter-bar">
      <label>参数：</label>
      <el-select v-model="selectedParam" style="width: 180px">
        <el-option v-for="p in params" :key="p" :label="p" :value="p" />
      </el-select>
      <label>时间范围：</label>
      <el-select v-model="selectedRange" style="width: 140px">
        <el-option v-for="r in ranges" :key="r" :label="r" :value="r" />
      </el-select>
      <span class="sp" />
      <el-button type="primary" size="small" @click="onExport">导出</el-button>
    </div>

    <div class="chart-grid chart-grid--2-1">
      <!-- 控制图 -->
      <div class="qms-card">
        <div class="qms-card__header">
          <h3>Xbar-R 控制图（{{ selectedParam }}）</h3>
          <span class="tag r">{{ anomalyCount }} 处异常</span>
        </div>
        <div class="qms-card__body">
          <div class="legend-inline">
            <span><i style="background:#c0392b" />报警(①超3σ)</span>
            <span><i style="background:#d4a017" />预警(③连续6点递增)</span>
            <span><i style="background:#2f7d32" />UCL/CL/LCL</span>
          </div>
          <SpcControlChart :subgroups="subgroups" :limit="limit" :rules="rules" chart-type="Xbar-R" :height="320" />
        </div>
      </div>

      <!-- 控制限信息 -->
      <div class="qms-card">
        <div class="qms-card__header"><h3>控制限信息</h3></div>
        <div class="qms-card__body">
          <div class="kv">
            <template v-for="row in controlInfo" :key="row.k">
              <span class="k">{{ row.k }}</span>
              <span :class="{ danger: row.danger, ok: row.ok }">{{ row.v }}</span>
            </template>
          </div>
          <div class="ex-box">前25子组含异常点时提示管理员决定是否剔除后重建基线；大数据量自动聚合并支持手动加载。</div>
        </div>
      </div>
    </div>

    <!-- 子组数据表 -->
    <div class="qms-card">
      <div class="qms-card__header"><h3>子组数据表（25 组）</h3></div>
      <div class="qms-card__body" style="padding: 0; max-height: 260px; overflow: auto">
        <el-table :data="subgroups" border size="small">
          <el-table-column prop="no" label="子组" width="70" />
          <el-table-column prop="time" label="时间" width="110" />
          <el-table-column prop="xbar" label="Xbar" width="100" />
          <el-table-column prop="r" label="R" width="100" />
          <el-table-column label="判定" width="100">
            <template #default="{ row }">
              <span class="qms-pill" :class="row.outlierRule ? (row.outlierRule === '①' ? 'r' : 'y') : 'g'">
                {{ row.outlierRule ? '异常' : '正常' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="outlierRule" label="规则" />
        </el-table>
      </div>
    </div>

    <!-- 异常点与判异规则命中 -->
    <div class="qms-card">
      <div class="qms-card__header"><h3>异常点与判异规则命中</h3><span class="tag r">{{ anomalyCount }} 处</span></div>
      <div class="qms-card__body">
        <div v-for="(a, i) in anomalies" :key="i" class="list-row">
          <span class="qms-pill" :class="a.level === '报警' ? 'r' : 'y'">{{ a.level }}</span>
          <span class="grow"><b>子组 {{ a.sub }}</b> {{ a.desc }}</span>
          <el-button size="small" @click="goAlarm">去处理</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.spc-control { display: flex; flex-direction: column; gap: 14px; }
.filter-bar { display: flex; gap: 10px; align-items: center; label { font-size: 12.5px; color: #5a6b7e; } .sp { flex: 1; } }
.chart-grid { display: grid; gap: 14px; &--2-1 { grid-template-columns: 2fr 1fr; } }

// 8 步原子流程链
.step-chain { display: flex; gap: 6px; flex-wrap: wrap; }
.chain-step {
  flex: 1 1 120px; min-width: 120px; padding: 10px 12px; border-radius: 8px; font-size: 12px;
  background: #eef4fb; color: #5a6b7e; border: 1px solid #e4ecf5;
  .cn { font-weight: 600; color: #1f2d3d; }
  .cd { font-size: 11px; color: #5a6b7e; margin-top: 2px; }
  .cs { margin-top: 5px; display: flex; flex-wrap: wrap; gap: 4px; }
  &.done { background: #e8f5e9; border-color: #cdeccd; .cn { color: #2f7d32; } }
  &.current { background: #fff7e0; border-color: #f3e2b0; .cn { color: #d4a017; } }
}

.legend-inline { display: flex; gap: 16px; font-size: 11.5px; color: #5a6b7e; padding: 0 0 8px; flex-wrap: wrap;
  span { display: inline-flex; align-items: center; }
  i { width: 10px; height: 10px; border-radius: 2px; margin-right: 5px; display: inline-block; } }

// 控制限信息 kv
.kv { display: grid; grid-template-columns: auto 1fr; gap: 0; font-size: 13px;
  .k { padding: 8px 4px; color: #5a6b7e; border-bottom: 1px solid #eef4fb; }
  span:not(.k) { padding: 8px 4px; color: #1f2d3d; font-weight: 600; border-bottom: 1px solid #eef4fb; text-align: right;
    &.danger { color: #c0392b; } &.ok { color: #2f7d32; } } }
.ex-box { font-size: 12px; color: #5a6b7e; padding: 10px 12px; background: #fffbeb; border: 1px solid #fde9b8; border-radius: 6px; margin-top: 10px; line-height: 1.6; }

.list-row { display: flex; align-items: center; gap: 10px; padding: 10px 4px; border-bottom: 1px solid #eef4fb; font-size: 12.5px;
  .grow { flex: 1; } }
</style>
