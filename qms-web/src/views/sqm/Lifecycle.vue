<script setup lang="ts">
import { ref, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/mock/roles'
import { supplierLifecycles } from '@/mock/sqm'
import type { SupLifecycle, SupQualification } from '@/types/sqm'

const authStore = useAuthStore()
const banner = BANNERS.sqm?.[authStore.role] || {
  title: 'SQM · 供应商全生命周期管理',
  desc: '从准入建档、资质预警、绩效趋势到状态流转的供应商全过程电子档案',
}

// 演示当前时钟（用于资质到期预警计算）
const TODAY = '2025-02-01'

const list = ref<SupLifecycle[]>([...supplierLifecycles])

// 选中供应商（默认第一个）
const curId = ref(list.value[0]?.id || '')
const cur = computed(() => list.value.find((s) => s.id === curId.value) || list.value[0])

function select(id: string) {
  curId.value = id
}

function warnColor(w: SupQualification['warnLevel']) {
  return {
    正常: '#2f7d32',
    提醒: '#1e88e5',
    警告: '#f59e0b',
    紧急: '#ef6c00',
    已过期: '#c0392b',
  }[w] || '#6b7785'
}

// 资质到期剩余天数（TODAY ~ 到期日）
function daysLeft(q: SupQualification) {
  const t = new Date(TODAY).getTime()
  const e = new Date(q.expireDate).getTime()
  return Math.ceil((e - t) / 86400000)
}

// 资产到期预警：剩余 ≤90 天高亮（SR-SBM-003 三级预警 90/60/30）
const warnList = computed(() => {
  const out: { sup: string; q: SupQualification }[] = []
  list.value.forEach((s) => {
    s.qualifications.forEach((q) => {
      const d = daysLeft(q)
      if (d <= 90) out.push({ sup: s.name, q })
    })
  })
  return out.sort((a, b) => daysLeft(a.q) - daysLeft(b.q))
})

const TODAY_SCORE = (s: SupLifecycle) => s.perfTrend[s.perfTrend.length - 1]?.score || 0

function statusPill(st: SupLifecycle['status']) {
  return { 待审核: 'gray', 合格: 'g', 暂停: 'r', 淘汰: 'r' }[st] || 'gray'
}
function riskPill(r: SupLifecycle['risk']) {
  return { 高: 'r', 中: 'y', 低: 'g' }[r] || 'gray'
}
</script>

<template>
  <div class="sqm-life">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">🗂️</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <!-- KPI -->
    <div class="kpi-row" style="grid-template-columns: repeat(4, 1fr)">
      <div class="kpi"><div class="val">{{ list.length }}</div><div class="lbl">在管供应商</div></div>
      <div class="kpi"><div class="val" style="color:#2f7d32">{{ list.filter(s => s.status === '合格').length }}</div><div class="lbl">合格</div></div>
      <div class="kpi"><div class="val" style="color:#c0392b">{{ list.filter(s => s.status === '暂停' || s.status === '淘汰').length }}</div><div class="lbl">暂停/淘汰</div></div>
      <div class="kpi"><div class="val" style="color:#ef6c00">{{ list.filter(s => s.risk === '高').length }}</div><div class="lbl">高风险</div></div>
    </div>

    <!-- 资质到期预警（SR-SBM-003 三级预警 90/60/30 天） -->
    <el-alert
      v-if="warnList.length"
      type="warning" :closable="false" show-icon
      :title="`资质到期预警：${warnList.length} 项资质将在 90 天内到期，需及时换证/更新`"
    />
    <div v-if="warnList.length" class="qms-card warn-card">
      <div class="qms-card__body" style="padding:10px 12px">
        <div v-for="(w, i) in warnList" :key="i" class="warn-item">
          <span class="qms-pill" :style="{ background: warnColor(w.q.warnLevel), color:'#fff' }">{{ w.q.warnLevel }}</span>
          <span class="wsup">{{ w.sup }}</span>
          <span class="wname">{{ w.q.name }}</span>
          <span class="wmuted">到期 {{ w.q.expireDate }} · 剩余 {{ daysLeft(w.q) }} 天</span>
        </div>
      </div>
    </div>

    <!-- 供应商选择条 -->
    <div class="sup-strip">
      <div
        v-for="s in list" :key="s.id"
        class="sup-chip" :class="{ active: s.id === curId }"
        @click="select(s.id)"
      >
        <div class="sc-name">{{ s.name }}</div>
        <div class="sc-meta">
          <span class="qms-pill" :class="statusPill(s.status)">{{ s.status }}</span>
          <span class="qms-pill" :class="riskPill(s.risk)">{{ s.risk }}风险</span>
          <span class="sc-score">评分 {{ TODAY_SCORE(s) }}</span>
        </div>
      </div>
    </div>

    <div v-if="cur" class="detail-grid">
      <!-- 基本档案 -->
      <div class="qms-card">
        <div class="qms-card__header"><h3>基本档案</h3></div>
        <div class="qms-card__body">
          <div class="kv-box">
            <div class="kv"><div class="k">供应商编号</div><div>{{ cur.id }}（{{ cur.code }}）</div></div>
            <div class="kv"><div class="k">类别</div><div>{{ cur.category }}</div></div>
            <div class="kv"><div class="k">状态</div><div><span class="qms-pill" :class="statusPill(cur.status)">{{ cur.status }}</span> · <span class="qms-pill" :class="riskPill(cur.risk)">{{ cur.risk }}风险</span></div></div>
            <div class="kv"><div class="k">联系人</div><div>{{ cur.contact }} / {{ cur.tel }}</div></div>
            <div class="kv"><div class="k">地址</div><div>{{ cur.address }}</div></div>
            <div class="kv"><div class="k">审核 / 整改</div><div>{{ cur.auditCount }} 次审核 · {{ cur.rectifyCount }} 次整改 </div></div>
          </div>
        </div>
      </div>

      <!-- 资质证书 + 三级预警 -->
      <div class="qms-card">
        <div class="qms-card__header"><h3>资质证书与到期预警</h3></div>
        <div class="qms-card__body" style="padding:0;overflow-x:auto">
          <table class="tbl" style="min-width:520px">
            <thead>
              <tr><th>资质名称</th><th>类型</th><th>上传人</th><th>到期日</th><th>剩余</th><th>预警</th></tr>
            </thead>
            <tbody>
              <tr v-for="(q, i) in cur.qualifications" :key="i">
                <td><strong>{{ q.name }}</strong></td>
                <td>{{ q.type }}</td>
                <td>{{ q.uploader }}<div class="muted" style="font-size:11px">{{ q.uploadDate }}</div></td>
                <td>{{ q.expireDate }}</td>
                <td :class="daysLeft(q) <= 30 ? 'od' : (daysLeft(q) <= 90 ? 'warn-t' : 'muted')">{{ daysLeft(q) }} 天</td>
                <td><span class="qms-pill" :style="{ background: warnColor(q.warnLevel), color:'#fff' }">{{ q.warnLevel }}</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- 绩效趋势 -->
      <div class="qms-card">
        <div class="qms-card__header"><h3>季度绩效趋势</h3></div>
        <div class="qms-card__body">
          <div class="trend">
            <div v-for="(p, i) in cur.perfTrend" :key="i" class="trend-col">
              <div class="tval">{{ p.score }}</div>
              <div class="tbar" :style="{ height: p.score + 'px', background: p.score >= 90 ? '#2f7d32' : p.score >= 80 ? '#1e88e5' : '#c0392b' }"></div>
              <div class="tq">{{ p.q }}</div>
            </div>
          </div>
        </div>
      </div>

      <!-- 生命周期轨迹 -->
      <div class="qms-card">
        <div class="qms-card__header"><h3>生命周期状态流转轨迹</h3></div>
        <div class="qms-card__body">
          <div class="flow">
            <div v-for="(t, i) in cur.timeline" :key="i" class="flow-item" :class="{ last: i === cur.timeline.length - 1 }">
              <div class="dot" />
              <div class="fdate">{{ t.date }}</div>
              <div class="faction">{{ t.action }}</div>
              <div class="fop">操作人：{{ t.operator }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.sqm-life { display: flex; flex-direction: column; gap: 14px; }
.kpi-row { display: grid; gap: 14px; }
.kpi { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; text-align: center;
  .val { font-size: 24px; font-weight: 700; color: #1e4d8b; }
  .lbl { font-size: 12px; color: #6b7785; margin-top: 4px; }
}
.warn-card { border-color: #f5d6a8; }
.warn-item { display: flex; align-items: center; gap: 10px; padding: 5px 0; font-size: 13px; border-bottom: 1px dashed #eef2f7;
  &:last-child { border-bottom: none; }
  .wsup { font-weight: 600; color: #2c3a47; }
  .wname { color: #44515f; }
  .wmuted { color: #8a94a6; margin-left: auto; }
}
.sup-strip { display: flex; gap: 12px; flex-wrap: wrap; }
.sup-chip { flex: 1 1 220px; border: 1px solid #e5e7eb; border-radius: 10px; padding: 12px; cursor: pointer; background: #fff; transition: 0.15s;
  &:hover { border-color: #9db8dd; }
  &.active { border-color: #1e4d8b; box-shadow: 0 0 0 2px rgba(30,77,139,.12); }
  .sc-name { font-weight: 600; font-size: 13px; color: #1f2d3d; margin-bottom: 8px; }
  .sc-meta { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
  .sc-score { font-size: 12px; color: #6b7785; margin-left: auto; }
}
.detail-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
@media (max-width: 980px) { .detail-grid { grid-template-columns: 1fr; } }
.kv-box { display: flex; flex-direction: column; gap: 8px; }
.kv { display: grid; grid-template-columns: 96px 1fr; gap: 8px; font-size: 13px; align-items: start; }
.kv .k { color: #6b7785; }
.trend { display: flex; align-items: flex-end; gap: 18px; height: 140px; padding-top: 8px; }
.trend-col { display: flex; flex-direction: column; align-items: center; justify-content: flex-end; height: 100%; }
.tval { font-size: 12px; color: #44515f; margin-bottom: 4px; }
.tbar { width: 28px; border-radius: 4px 4px 0 0; min-height: 4px; }
.tq { font-size: 11px; color: #8a94a6; margin-top: 6px; }
.flow { display: flex; flex-direction: column; gap: 0; }
.flow-item { position: relative; padding: 0 0 14px 18px; border-left: 2px solid #e5e7eb;
  &.last { border-left-color: transparent; }
  .dot { position: absolute; left: -6px; top: 2px; width: 10px; height: 10px; border-radius: 50%; background: #1e4d8b; }
  .fdate { font-size: 12px; color: #8a94a6; }
  .faction { font-size: 13px; color: #2c3a47; font-weight: 600; margin: 2px 0; }
  .fop { font-size: 12px; color: #6b7785; }
}
.qms-select, .qms-input {
  height: 32px; border: 1px solid var(--line, #d8dee6); border-radius: 6px; padding: 0 10px;
  font-size: 13px; background: #fff; color: #1f2d3d;
}
.btn {
  border: 1px solid #e1e8f0; background: #fff; border-radius: 6px; padding: 4px 10px; font-size: 12px; cursor: pointer; transition: 0.15s;
  &.sm { padding: 3px 8px; }
  &.pri { background: #1e4d8b; border-color: #1e4d8b; color: #fff; }
  &.ghost { background: #fff; color: #5a6b7e; }
  &:hover { filter: brightness(0.96); }
}
.muted { color: #8a94a6; }
.od { color: #c0392b; font-weight: 600; }
.warn-t { color: #ef6c00; font-weight: 600; }
</style>
