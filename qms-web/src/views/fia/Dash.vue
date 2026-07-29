<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { BANNERS } from '@/config/banners'
import { fiaApi } from '@/api'
import type { FiaKpi, FiaTaskStatus, FiaPass7d, FiaTrigger, FiaLine, FiaTask } from '@/types/fia'
import { StatCards, ChartCard } from '@/components/page'

const auth = useAuthStore()
const company = useCompanyStore()
const banner = BANNERS.fia?.[auth.role] || { title: '首件检验看板', desc: '首件检验任务、合格率、锁定工单、超时任务一览' }

const kpi = ref<FiaKpi>({ pending: 0, passRate: 0, locked: 0, overdue: 0 })
const taskStatus = ref<FiaTaskStatus[]>([])
const pass7d = ref<FiaPass7d>({ days: [], vals: [], target: 98 })
const triggers = ref<FiaTrigger[]>([])
const lines = ref<FiaLine[]>([])
const lockRate = ref(0)
const urgentCount = ref(0)
const loading = ref(false)

function isLockedTask(t: FiaTask) { return t.result === '不合格' && t.st !== '已作废' && !t.disposition }
function buildTriggers(tasks: FiaTask[]): FiaTrigger[] {
  const m = new Map<string,number>(); for (const t of tasks) { const k=t.trig||'未指定'; m.set(k,(m.get(k)||0)+1) }
  return [...m.entries()].map(([n,v])=>({name:n,value:v})).sort((a,b)=>b.value-a.value)
}
function buildLines(tasks: FiaTask[]): FiaLine[] {
  const total=new Map<string,number>(), done=new Map<string,number>()
  for (const t of tasks) { const k=t.line||'未分配'; total.set(k,(total.get(k)||0)+1); if(t.st==='已完成') done.set(k,(done.get(k)||0)+1) }
  return [...total.entries()].map(([l,c])=>({line:l,rate:c>0?Math.round(((done.get(l)||0)/c)*1000)/10:0})).sort((a,b)=>a.rate-b.rate)
}

onMounted(async () => {
  loading.value = true
  try {
    const [k, ts, p7, tasks] = await Promise.all([fiaApi.getKpi(), fiaApi.getTaskStatus(), fiaApi.getPass7d(), fiaApi.getTasks()])
    const locked = tasks.filter(isLockedTask).length; const total = tasks.length
    const ck = company.kpi()
    kpi.value = { pending:k.pending, passRate:k.passRate||(ck?ck.passRate:0), locked, overdue:k.overdue }
    taskStatus.value=ts; pass7d.value=p7; triggers.value=buildTriggers(tasks); lines.value=buildLines(tasks)
    urgentCount.value=tasks.filter(t=>t.u).length; lockRate.value=total>0?Math.round((locked/total)*1000)/10:0
  } finally { loading.value = false }
})

function donutOpt() { return { tooltip:{trigger:'item',formatter:'{b}: {c} ({d}%)'}, legend:{bottom:0,textStyle:{fontSize:11}}, series:[{type:'pie',radius:['45%','70%'],center:['50%','45%'],label:{formatter:'{c}',fontSize:12,fontWeight:600}, data:taskStatus.value.map(s=>({name:s.name,value:s.value,itemStyle:{color:s.color}}))}] } }
function pieOpt() { const cs=['#1e4d8b','#2f7d32','#d4a017','#8e44ad','#c0392b']; return { tooltip:{trigger:'item'}, legend:{bottom:0}, series:[{type:'pie',radius:'60%',center:['50%','45%'],label:{formatter:'{b}\n{d}%',fontSize:11}, data:triggers.value.map((t,i)=>({name:t.name,value:t.value,itemStyle:{color:cs[i%cs.length]}}))}] } }
function hbarOpt() { return { tooltip:{trigger:'axis',axisPointer:{type:'shadow'}}, grid:{left:80,right:40,top:16,bottom:24}, xAxis:{type:'value',max:100,axisLabel:{formatter:'{value}%',fontSize:10}}, yAxis:{type:'category',data:lines.value.map(d=>d.line)}, series:[{type:'bar',barWidth:16, data:lines.value.map(d=>({value:d.rate,itemStyle:{color:d.rate>=98?'#2f7d32':d.rate>=95?'#d4a017':'#c0392b'}})), label:{show:true,position:'right',formatter:'{c}%',fontSize:11}}] } }
function gaugeOpt() { return { series:[{type:'gauge',radius:'90%',center:['50%','55%'],min:0,max:100, axisLine:{lineStyle:{width:16,color:[[.05,'#2f7d32'],[.15,'#d4a017'],[1,'#c0392b']]}}, pointer:{width:5}, detail:{formatter:'{value}%',fontSize:20,offsetCenter:[0,'70%'],color:'#1f2d3d'}, data:[{value:lockRate.value}] }] } }
</script>

<template>
  <div class="fia-dash">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{background:auth.currentRole?.color}">{{ auth.currentRole?.icon||'🔬' }}</div>
      <div><div class="qms-banner__title">{{ banner.title }}</div><div class="qms-banner__desc">{{ banner.desc }} · {{ company.contextLabel() }}</div></div>
    </div>

    <StatCards :items="[
      { label:'待检任务', value:kpi.pending, unit:'项', color:'#d4a017' },
      { label:'一次合格率', value:kpi.passRate, unit:'%', color:'#2f7d32' },
      { label:'锁定工单', value:kpi.locked, unit:'个', color:'#c0392b' },
      { label:'超时任务', value:kpi.overdue, unit:'项', color:'#c0392b' },
    ]" :loading="loading" />

    <div class="grid-3">
      <ChartCard title="F1 任务状态分布" :option="donutOpt()" :loading="loading" />
      <div class="card"><div class="card-hd"><h3>F2 首件合格率趋势</h3><span class="pill g">{{kpi.passRate}}%</span></div>
        <div class="trend-line" v-for="(v,i) in pass7d.vals" :key="i">
          <span class="day">{{pass7d.days[i]}}</span>
          <div class="bar-wrap"><div class="bar" :style="{width:v+'%',background:v>=98?'#2f7d32':v>=95?'#d4a017':'#c0392b'}"></div></div>
          <span class="val">{{v}}%</span>
        </div>
      </div>
      <ChartCard title="F3 触发事件分布" :option="pieOpt()" :loading="loading" />
    </div>

    <div class="grid-2">
      <ChartCard title="F4 各产线首件完成率" :option="hbarOpt()" :loading="loading" />
      <ChartCard title="F5 工单锁定占比" subtitle="首件未通过比例" :option="gaugeOpt()" :loading="loading" />
    </div>
  </div>
</template>

<style lang="scss" scoped>
.fia-dash { display:flex; flex-direction:column; gap:14px; }
.grid-2,.grid-3 { display:grid; gap:14px; }
.grid-2 { grid-template-columns:1fr 1fr; }
.grid-3 { grid-template-columns:repeat(3,1fr); }
.qms-banner { display:flex; align-items:center; gap:12px; padding:12px 16px; background:linear-gradient(90deg,#eef4fb,#f7fbff); border-radius:8px; border-left:4px solid #1e4d8b; }
.qms-banner__icon { width:44px; height:44px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:22px; color:#fff; flex-shrink:0; }
.qms-banner__title { font-size:15px; font-weight:700; color:#1f2d3d; }
.qms-banner__desc { font-size:12px; color:#5a6b7e; margin-top:2px; }
.card { background:#fff; border-radius:8px; box-shadow:0 1px 4px rgba(0,0,0,.04); overflow:hidden; }
.card-hd { display:flex; align-items:center; gap:8px; padding:12px 16px; border-bottom:1px solid #eef1f5; h3 { margin:0; font-size:14px; font-weight:600; } }
.pill { font-size:10.5px; padding:2px 8px; border-radius:10px; font-weight:600; &.g { background:#e8f5e9; color:#2f7d32; } }
.trend-line { display:flex; align-items:center; gap:8px; padding:4px 16px; font-size:11px; }
.day { width:44px; color:#8a9bb0; flex-shrink:0; }
.bar-wrap { flex:1; height:16px; background:#eef1f5; border-radius:3px; overflow:hidden; }
.bar { height:100%; border-radius:3px; transition:width .3s; }
.val { width:36px; text-align:right; color:#5a6b7e; font-weight:600; }
@media (max-width:1100px) { .grid-3 { grid-template-columns:1fr; } .grid-2 { grid-template-columns:1fr; } }
</style>
