<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/mock/roles'
import { spcAlarms } from '@/mock/spc'
import type { SpcAlarm } from '@/types/spc'

const authStore = useAuthStore()
const banner = BANNERS.spc?.[authStore.role] || {
  title: 'SPC · 告警处理',
  desc: '控制图判异告警确认、关闭与抑制（SR-SPC-015/017/018）',
}



// ====== 数据（对齐 HTML MOCKX.spc.alarmAll） ======
const list = ref<SpcAlarm[]>(spcAlarms.map((a) => ({ ...a })))
const pendingCount = computed(() => list.value.filter((x) => x.st === '待确认').length)

// ====== 筛选（级别 / 状态 / 关键词） ======
const fLvl = ref('')
const fSt = ref('')
const fKeyword = ref('')
const filtered = computed(() => {
  const q = fKeyword.value.trim().toLowerCase()
  return list.value.filter((x) =>
    (!fLvl.value || x.lvl === fLvl.value) &&
    (!fSt.value || x.st === fSt.value) &&
    (!q || `${x.id} ${x.par} ${x.rule}`.toLowerCase().includes(q)),
  )
})

// ====== 确认关闭（对应 HTML actAlarmClose） ======
const closeShow = ref(false)
const closeTarget = ref<SpcAlarm | null>(null)
const closeForm = ref({ reason: '', measure: '' })
function openClose(row: SpcAlarm) {
  closeTarget.value = row
  closeForm.value = { reason: '', measure: '' }
  closeShow.value = true
}
function doClose() {
  if (!closeForm.value.reason.trim() || !closeForm.value.measure.trim()) {
    ElMessage.warning('关闭原因与处置措施均为必填')
    return
  }
  if (closeTarget.value) {
    closeTarget.value.st = '已关闭'
    closeTarget.value.reason = `${closeForm.value.reason}｜处置：${closeForm.value.measure}`
  }
  closeShow.value = false
  ElMessage.success('告警已确认关闭')
}
function suppress() {
  ElMessage.info('已设置 30 分钟抑制（演示）')
}

// ====== 通知渠道（对应 HTML ②通知渠道） ======
const channels = ref([
  { name: '系统弹窗', on: true },
  { name: '企业微信', on: true },
  { name: '邮件', on: false },
  { name: '短信', on: false },
])

const acItems = [
  '趋势类规则(②③)触发预警(黄)，突破类(①⑤)触发报警(红)',
  '同时触发预警和报警仅展示报警级别',
  '班组长及以上关闭须填原因+处置措施',
  '30分钟内同参数不重复通知',
]
</script>

<template>
  <div class="spc-alarm">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">🔔</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <!-- 告警列表 -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>SPC 告警处理</h3>
        <span class="tag r">{{ pendingCount }} 待确认</span>
      </div>
      <div class="qms-card__body">
        <!-- 筛选栏 -->
        <div class="filter-bar">
          <el-select v-model="fLvl" placeholder="全部级别" clearable style="width: 130px">
            <el-option label="报警" value="报警" /><el-option label="预警" value="预警" />
          </el-select>
          <el-select v-model="fSt" placeholder="全部状态" clearable style="width: 130px">
            <el-option label="待确认" value="待确认" /><el-option label="已关闭" value="已关闭" />
          </el-select>
          <el-input v-model="fKeyword" placeholder="搜索告警号/参数" clearable style="width: 200px" />
          <span class="sp" />
          <span class="meta">共 {{ filtered.length }} 条</span>
        </div>

        <el-table :data="filtered" border size="small">
          <el-table-column prop="id" label="告警号" width="110" />
          <el-table-column prop="par" label="参数" width="130" />
          <el-table-column label="当前值" width="90">
            <template #default="{ row }"><span class="val">{{ row.val }}</span></template>
          </el-table-column>
          <el-table-column prop="rule" label="触发规则" width="150" />
          <el-table-column label="级别" width="80">
            <template #default="{ row }"><span class="qms-pill" :class="row.lvl === '报警' ? 'r' : 'y'">{{ row.lvl }}</span></template>
          </el-table-column>
          <el-table-column prop="t" label="时间" width="80" />
          <el-table-column label="状态" width="90">
            <template #default="{ row }">
              <span class="qms-pill" :class="row.st === '已关闭' ? 'g' : 'r'">{{ row.st }}</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" min-width="120">
            <template #default="{ row }">
              <el-button v-if="row.st === '待确认'" type="primary" size="small" @click="openClose(row)">确认关闭</el-button>
              <span v-else class="muted">{{ row.reason || '-' }}</span>
            </template>
          </el-table-column>
        </el-table>

        <div class="ex-box">同一参数 30 分钟内不重复通知(级别升级除外)；企业微信推送失败记录日志并重发一次；未填原因阻止关闭。</div>
        <div class="ac-box">
          <b>验收条件：</b>
          <ul><li v-for="(it, i) in acItems" :key="i">{{ it }}</li></ul>
        </div>
      </div>
    </div>

    <!-- 分级 / 通知渠道 / 抑制与关闭 -->
    <div class="grid-3">
      <div class="qms-card">
        <div class="qms-card__header"><h3>①分级</h3></div>
        <div class="qms-card__body">
          <div class="list-row"><span class="qms-pill y">预警</span><span class="grow">趋势类(②③) 弹窗</span></div>
          <div class="list-row"><span class="qms-pill r">报警</span><span class="grow">突破类(①⑤) 弹窗+企微</span></div>
        </div>
      </div>

      <div class="qms-card">
        <div class="qms-card__header"><h3>②通知渠道</h3></div>
        <div class="qms-card__body">
          <div class="check-list">
            <label v-for="c in channels" :key="c.name"><el-checkbox v-model="c.on" /> {{ c.name }}</label>
          </div>
        </div>
      </div>

      <div class="qms-card">
        <div class="qms-card__header"><h3>③抑制与关闭</h3></div>
        <div class="qms-card__body">
          <div class="list-row"><span class="qms-pill b">抑制</span><span class="grow">30分钟内不重复</span><el-button size="small" @click="suppress">设置</el-button></div>
          <div class="list-row"><span class="qms-pill p">关闭</span><span class="grow">填原因+处置措施</span></div>
        </div>
      </div>
    </div>

    <!-- 确认关闭弹窗 -->
    <el-dialog v-model="closeShow" title="确认关闭告警" width="440px">
      <div class="kv" v-if="closeTarget">
        <span class="k">参数</span><span>{{ closeTarget.par }}</span>
        <span class="k">告警ID</span><span>{{ closeTarget.id }}</span>
      </div>
      <el-form label-width="92px" style="margin-top: 12px">
        <el-form-item label="关闭原因" required>
          <el-input v-model="closeForm.reason" type="textarea" :rows="2" placeholder="如：调整设备参数后恢复正常..." />
        </el-form-item>
        <el-form-item label="处置措施" required>
          <el-input v-model="closeForm.measure" type="textarea" :rows="2" placeholder="已采取的处置措施..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="closeShow = false">取消</el-button>
        <el-button type="primary" @click="doClose">确认关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.spc-alarm { display: flex; flex-direction: column; gap: 14px; }
.filter-bar { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; .sp { flex: 1; } .meta { font-size: 12px; color: #5a6b7e; } }
.val { color: #c0392b; font-weight: 600; }
.muted { color: #9aa7b5; font-size: 12px; }
.grid-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.list-row { display: flex; align-items: center; gap: 10px; padding: 10px 4px; border-bottom: 1px solid #eef4fb; font-size: 12.5px; .grow { flex: 1; } }
.check-list { display: flex; flex-direction: column; gap: 10px; padding: 6px 2px; label { display: flex; align-items: center; gap: 6px; font-size: 13px; color: #1f2d3d; } }
.kv { display: grid; grid-template-columns: auto 1fr; gap: 0; font-size: 13px; .k { padding: 8px 4px; color: #5a6b7e; border-bottom: 1px solid #eef4fb; } span:not(.k) { padding: 8px 4px; color: #1f2d3d; font-weight: 600; border-bottom: 1px solid #eef4fb; } }
.ex-box { font-size: 11.5px; color: #c0392b; background: #fdecea; border: 1px solid #f5c6c0; border-radius: 6px; padding: 8px 10px; margin: 10px 0; line-height: 1.6; }
.ac-box { font-size: 11.5px; color: #1b6b1e; background: #e8f5e9; border: 1px solid #c3e0c5; border-radius: 6px; padding: 8px 10px; margin: 8px 0; line-height: 1.6;
  b { color: #1b6b1e; } ul { margin: 4px 0 0 16px; } li { margin: 2px 0; } }
</style>
