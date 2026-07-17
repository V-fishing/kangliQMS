<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/mock/roles'
import { fmeaRisks } from '@/mock/sqm'
import type { FmeaRisk } from '@/types/sqm'

const authStore = useAuthStore()
const banner = BANNERS.sqm?.[authStore.role] || {
  title: 'SQM · FMEA 风险跟踪',
  desc: '供应商过程 FMEA 高风险项（RPN≥100）识别与闭环跟踪',
}

const risks = ref<FmeaRisk[]>(fmeaRisks)

const overdueList = computed(() => risks.value.filter((r) => isOverdue(r)))

const total = computed(() => risks.value.length)
const closed = computed(() => risks.value.filter((r) => r.status === '已闭环').length)
const inProgress = computed(() => risks.value.filter((r) => r.status === '进行中').length)
const pending = computed(() => risks.value.filter((r) => r.status === '待闭环').length)
const completionRate = computed(() => (total.value ? Math.round((closed.value / total.value) * 100) : 0))
const rateColor = computed(() =>
  completionRate.value >= 80 ? '#2f7d32' : completionRate.value >= 50 ? '#d4a017' : '#c0392b',
)

function rpnPill(rpn: number) {
  return rpn >= 150 ? 'r' : rpn >= 100 ? 'y' : 'g'
}
function statusPill(st: FmeaRisk['status']) {
  return st === '已闭环' ? 'g' : st === '进行中' ? 'b' : 'y'
}
function riskLevel(rpn: number) {
  return rpn >= 150 ? { txt: '高', pill: 'r' } : { txt: '中高', pill: 'y' }
}

// 高风险判定（SR-PTL-022）：RPN>100 或 严重度 S≥9（严重度优先原则）
function isHighRisk(r: FmeaRisk) {
  return r.rpn > 100 || r.severity >= 9
}
function highReason(r: FmeaRisk) {
  if (r.severity >= 9 && r.rpn <= 100) return 'S≥9（严重度优先）'
  return `RPN>${100}`
}

// 超期预警（SR-PTL-026）：目标日期已过且未闭环 → 超期通知责任人
const TODAY = '2025-02-01' // 演示用当前时钟
function isOverdue(r: FmeaRisk) {
  return r.status !== '已闭环' && r.targetDate < TODAY
}

// S-O-D 风险矩阵（SR-PTL-028）：热力图，单元格颜色由 RPN 决定，叠加风险标记
const S_VALS = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1]
const O_VALS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
function cellRisks(s: number, o: number) {
  return risks.value.filter((r) => r.severity === s && r.occurrence === o)
}
function cellRpn(s: number, o: number) {
  const rs = cellRisks(s, o)
  return rs.length ? Math.max(...rs.map((r) => r.rpn)) : 0
}
function rpnColor(rpn: number) {
  return rpn >= 150 ? '#e7b4ad' : rpn >= 100 ? '#f3d9a8' : rpn >= 50 ? '#f3ecc0' : ''
}
function rpnTextColor(rpn: number) {
  return rpn >= 100 ? '#fff' : '#5a6b7e'
}

// 详情弹窗
const detailVisible = ref(false)
const cur = ref<FmeaRisk | null>(null)
function showDetail(r: FmeaRisk) {
  cur.value = r
  detailVisible.value = true
}

function savePlan() {
  ElMessage.success('已保存为常用方案（演示）')
}
</script>

<template>
  <div class="sqm-fmea">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">🎯</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <!-- 完成率概览 -->
    <div class="fmea-kpi-row">
      <div class="kpi">
        <div class="val" :style="{ color: rateColor }">{{ completionRate }}%</div>
        <div class="lbl">高风险项闭环完成率</div>
        <div class="bar"><div class="bar-fill" :style="{ width: completionRate + '%', background: rateColor }"></div></div>
      </div>
      <div class="kpi"><div class="val">{{ total }}</div><div class="lbl">高风险项总数</div></div>
      <div class="kpi"><div class="val" style="color: #2f7d32">{{ closed }}</div><div class="lbl">已闭环</div></div>
      <div class="kpi"><div class="val" style="color: #1e4d8b">{{ inProgress }}</div><div class="lbl">进行中</div></div>
      <div class="kpi"><div class="val" style="color: #c0392b">{{ pending }}</div><div class="lbl">待闭环</div></div>
    </div>

    <!-- 超期预警（SR-PTL-026） -->
    <el-alert
      v-if="overdueList.length"
      type="error" show-icon :closable="false" style="margin-bottom: 14px"
      :title="`超期预警（${overdueList.length} 项）：${overdueList.map(r => r.id).join('、')} 目标日期已过且未闭环，系统已通知责任人`"
    />

    <!-- 高风险分布表 -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>FMEA 高风险项分布（RPN ≥ 100 或 S ≥ 9）</h3>
        </div>
      <div class="qms-card__body" style="padding: 0">
        <el-table :data="risks" border size="small">
          <el-table-column prop="id" label="风险编号" width="90" />
          <el-table-column prop="product" label="产品" width="110" />
          <el-table-column prop="process" label="工序" width="100" />
          <el-table-column prop="failureMode" label="失效模式" width="110" />
          <el-table-column label="S" width="42" align="center"><template #default="{ row }"><span :class="row.severity >= 9 ? 's9' : ''">{{ row.severity }}</span></template></el-table-column>
          <el-table-column label="O" width="42" align="center"><template #default="{ row }">{{ row.occurrence }}</template></el-table-column>
          <el-table-column label="D" width="42" align="center"><template #default="{ row }">{{ row.detection }}</template></el-table-column>
          <el-table-column label="RPN" width="64" align="center"><template #default="{ row }"><span class="qms-pill" :class="rpnPill(row.rpn)">{{ row.rpn }}</span></template></el-table-column>
          <el-table-column label="风险等级" width="80" align="center"><template #default="{ row }"><span class="qms-pill" :class="riskLevel(row.rpn).pill">{{ riskLevel(row.rpn).txt }}</span></template></el-table-column>
          <el-table-column label="高风险标记" width="120" align="center">
            <template #default="{ row }">
              <span v-if="isHighRisk(row)" class="qms-pill r">{{ highReason(row) }}</span>
              <span v-else class="qms-pill g">否</span>
            </template>
          </el-table-column>
          <el-table-column label="状态" width="84" align="center"><template #default="{ row }"><span class="qms-pill" :class="statusPill(row.status)">{{ row.status }}</span><div v-if="isOverdue(row)" class="od">超期</div></template></el-table-column>
          <el-table-column prop="owner" label="责任人" width="90" />
          <el-table-column prop="targetDate" label="目标日期" width="110" />
          <el-table-column label="操作" width="80" fixed="right"><template #default="{ row }"><button class="btn sm" @click="showDetail(row)">详情</button></template></el-table-column>
        </el-table>
      </div>
    </div>

    <!-- S-O-D 风险矩阵（SR-PTL-028） -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>S-O-D 风险矩阵（严重度 × 频度热力图）</h3>
        </div>
      <div class="qms-card__body">
        <div class="matrix-wrap">
          <table class="matrix">
            <thead>
              <tr>
                <th class="corner">S\O</th>
                <th v-for="o in O_VALS" :key="'o' + o">{{ o }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="s in S_VALS" :key="'s' + s">
                <th class="rowh">{{ s }}</th>
                <td
                  v-for="o in O_VALS" :key="'c' + s + o"
                  :style="{ background: rpnColor(cellRpn(s, o)), color: rpnTextColor(cellRpn(s, o)) }"
                  :class="{ hot: cellRpn(s, o) >= 100 }"
                  @click="cellRisks(s, o).length && showDetail(cellRisks(s, o)[0])"
                >
                  <template v-if="cellRisks(s, o).length">{{ cellRisks(s, o).length }}</template>
                </td>
              </tr>
            </tbody>
          </table>
          <div class="legend">
            <span><i class="sw" style="background: #e7b4ad"></i>RPN ≥ 150 (高)</span>
            <span><i class="sw" style="background: #f3d9a8"></i>RPN ≥ 100</span>
            <span><i class="sw" style="background: #f3ecc0"></i>RPN ≥ 50</span>
            <span><i class="sw" style="background: #f5f7fa"></i>&lt; 50</span>
            <div class="legend-tip">点击高亮单元格可查看对应失效模式详情</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" :title="'FMEA 高风险项详情 · ' + (cur?.id || '')" width="460px">
      <div v-if="cur" class="kv">
        <div class="k">风险编号</div><div><strong>{{ cur.id }}</strong></div>
        <div class="k">产品</div><div>{{ cur.product }}</div>
        <div class="k">工序</div><div>{{ cur.process }}</div>
        <div class="k">失效模式</div><div>{{ cur.failureMode }}</div>
        <div class="k">严重度(S)</div><div>{{ cur.severity }}<span v-if="cur.severity >= 9" class="qms-pill r" style="margin-left:6px">S≥9 严重度优先</span></div>
        <div class="k">频度(O)</div><div>{{ cur.occurrence }}</div>
        <div class="k">探测度(D)</div><div>{{ cur.detection }}</div>
        <div class="k">RPN</div><div><span class="qms-pill" :class="rpnPill(cur.rpn)">{{ cur.rpn }}</span></div>
        <div class="k">高风险标记</div><div><span class="qms-pill" :class="isHighRisk(cur) ? 'r' : 'g'">{{ isHighRisk(cur) ? highReason(cur) : '否' }}</span></div>
        <div class="k">建议措施</div><div>{{ cur.action }}</div>
        <div class="k">责任人</div><div>{{ cur.owner }}</div>
        <div class="k">目标日期</div><div>{{ cur.targetDate }}<span v-if="isOverdue(cur)" class="qms-pill r" style="margin-left:6px">已超期</span></div>
        <div class="k">状态</div><div><span class="qms-pill" :class="statusPill(cur.status)">{{ cur.status }}</span></div>
        <template v-if="cur.evidence">
          <div class="k">闭环证据</div><div>{{ cur.evidence }}</div>
        </template>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.sqm-fmea { display: flex; flex-direction: column; gap: 14px; }
.fmea-kpi-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 14px;
  .bar {
    margin-top: 10px;
    height: 6px;
    background: #e5e7eb;
    border-radius: 3px;
    overflow: hidden;
    .bar-fill { height: 100%; transition: width 0.5s; }
  }
}
.kv {
  display: grid;
  grid-template-columns: 92px 1fr;
  gap: 8px 12px;
  font-size: 13px;
  .k { color: #5a6b7e; }
}
.s9 { color: #c0392b; font-weight: 700; }
.od { font-size: 10px; color: #c0392b; margin-top: 2px; }
.matrix-wrap { display: flex; gap: 18px; flex-wrap: wrap; align-items: flex-start; }
table.matrix {
  border-collapse: collapse;
  font-size: 12px;
  th.corner { background: #1e4d8b; color: #fff; }
  th.rowh { background: #f0f4fa; color: #1e4d8b; font-weight: 600; }
  th, td { border: 1px solid #dce3ec; width: 30px; height: 28px; text-align: center; }
  td { cursor: default; }
  td.hot { cursor: pointer; font-weight: 700; }
}
.legend { font-size: 12px; color: #5a6b7e; display: flex; flex-direction: column; gap: 6px; .sw { display: inline-block; width: 14px; height: 14px; border-radius: 3px; margin-right: 6px; vertical-align: -2px; border: 1px solid #dce3ec; } .legend-tip { margin-top: 4px; color: #8a97a6; } }

.btn {
  border: 1px solid #e1e8f0;
  background: #fff;
  border-radius: 6px;
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  transition: 0.15s;
  &.sm { padding: 3px 8px; }
  &:hover { border-color: #1e4d8b; color: #1e4d8b; }
}
</style>
