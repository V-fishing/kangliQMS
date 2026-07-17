<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/mock/roles'
import { fiaTrace, fiaTraceFwd, fiaTraceBack, fiaArchived } from '@/mock/fia'
import type { FiaArchived } from '@/types/fia'

const authStore = useAuthStore()
const banner = BANNERS.fia?.[authStore.role] || {
  title: '首件检验 · 追溯归档',
  desc: '首件检验全链路追溯与归档报告',
}



// 全链路追溯方向（对应 HTML setTraceDir）
const dir = ref<'fwd' | 'back'>('fwd')
const flow = computed(() => (dir.value === 'fwd' ? fiaTraceFwd : fiaTraceBack))

// 归档报告调阅（对应 HTML actView）
const viewDlg = ref<FiaArchived | null>(null)
const viewShow = ref(false)
function viewReport(r: FiaArchived) {
  viewDlg.value = r
  viewShow.value = true
}
function exportPdf(r: FiaArchived) {
  ElMessage.success(`归档报告 ${r.rpt} 已导出 PDF`)
}
</script>

<template>
  <div class="fia-trace">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">🔍</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <!-- 全链路追溯 -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>全链路追溯</h3>
        <span class="tag">来料→成品→客户 · 正/反向</span>
      </div>
      <div class="qms-card__body">
        <div class="dir-tabs">
          <button :class="{ on: dir === 'fwd' }" @click="dir = 'fwd'">正向追溯(来料→客户)</button>
          <button :class="{ on: dir === 'back' }" @click="dir = 'back'">反向追溯(客户→来料)</button>
        </div>
        <div class="trace-flow">
          <template v-for="(n, i) in flow" :key="n.n">
            <div class="trace-node"><b>{{ n.n }}</b><div class="tn-t">{{ n.v }}</div></div>
            <div v-if="i < flow.length - 1" class="trace-arrow">›</div>
          </template>
        </div>
        <div class="note">
          📌 SN+批次双模式；高值物料SN逐件追溯，普通物料批次追溯；满足《医疗器械监督管理条例》+UDI追溯；数据保留15年。
        </div>
      </div>
    </div>

    <!-- 首件检验全流程时间线 -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>首件检验全流程时间线 · FAI-0714-02</h3>
        <span class="tag">每个节点可查详情</span>
      </div>
      <div class="qms-card__body">
        <div class="timeline">
          <div v-for="(x, i) in fiaTrace" :key="i" class="tl-item" :class="{ done: x.done }">
            <span class="tl-op">{{ x.node }}</span>
            <div class="tl-t">{{ x.t }} · {{ x.o }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 归档报告（保留15年） -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>归档报告（保留15年）</h3>
        <span class="tag">PDF</span>
      </div>
      <div class="qms-card__body" style="padding: 0">
        <div class="tbl-wrap">
        <table class="tbl" style="min-width: 1080px">
          <thead>
            <tr>
              <th>报告号</th><th>工单</th><th>产品</th><th>工序</th>
              <th>检验标准</th><th>AQL</th><th>样本量</th><th>批次</th>
              <th>检验人</th><th>复核人</th><th>判定</th><th>归档日期</th><th>保留到期</th><th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in fiaArchived" :key="r.rpt">
              <td>{{ r.rpt }}</td>
              <td>{{ r.wo }}</td>
              <td>{{ r.prod }}</td>
              <td>{{ r.proc }}</td>
              <td>{{ r.std }}</td>
              <td class="muted">{{ r.aql }}</td>
              <td>{{ r.sample }}</td>
              <td>{{ r.batch }}</td>
              <td>{{ r.inspector }}</td>
              <td>{{ r.reviewer }}</td>
              <td><span class="pill" :class="r.conclusion.includes('不合格') ? 'r' : 'g'">{{ r.conclusion }}</span></td>
              <td class="muted">{{ r.d }}</td>
              <td class="muted">{{ r.retainUntil }}</td>
              <td>
                <el-button link type="primary" size="small" @click="viewReport(r)">调阅</el-button>
                <el-button link type="info" size="small" @click="exportPdf(r)">导出PDF</el-button>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>
    </div>

    <!-- 归档报告调阅 -->
    <el-dialog v-model="viewShow" title="归档报告调阅（只读 · PDF）" width="560px">
      <div v-if="viewDlg" class="form-grid">
        <div class="form-row full"><label>报告号</label><b>{{ viewDlg.rpt }}</b></div>
        <div class="form-row"><label>工单</label><b>{{ viewDlg.wo }}</b></div>
        <div class="form-row"><label>产品 / 工序</label><b>{{ viewDlg.prod }} · {{ viewDlg.proc }}</b></div>
        <div class="form-row"><label>检验标准</label><b>{{ viewDlg.std }}</b></div>
        <div class="form-row"><label>AQL 方案</label><b>{{ viewDlg.aql }}</b></div>
        <div class="form-row"><label>样本量</label><b>{{ viewDlg.sample }}</b></div>
        <div class="form-row"><label>来料批次</label><b>{{ viewDlg.batch }}</b></div>
        <div class="form-row"><label>判定结论</label><span class="pill" :class="viewDlg.conclusion.includes('不合格') ? 'r' : 'g'">{{ viewDlg.conclusion }}</span></div>
        <div class="form-row"><label>检验人签名</label><span>{{ viewDlg.inspector }}</span></div>
        <div class="form-row"><label>复核人签名</label><span>{{ viewDlg.reviewer }}</span></div>
        <div class="form-row"><label>归档日期</label><span>{{ viewDlg.d }}</span></div>
        <div class="form-row"><label>保留到期</label><span>{{ viewDlg.retainUntil }}（15年）</span></div>
        <div class="form-row full"><label>调阅权限</label><span class="muted">{{ viewDlg.perm }}</span></div>
        <div class="form-row full">
          <label>文件状态</label>
          <span class="pill g">{{ viewDlg.st }}</span>
          <span class="muted" style="margin-left:8px">内容哈希已写入审计日志，签名后不可篡改</span>
        </div>
      </div>
      <template #footer>
        <el-button @click="viewDlg = null">关闭</el-button>
        <el-button type="primary" @click="viewDlg && exportPdf(viewDlg)">导出PDF</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.fia-trace { display: flex; flex-direction: column; gap: 14px; }
.tbl-wrap { overflow-x: auto; }
.note { font-size: 12px; color: #909399; line-height: 1.6; background: #f7f9fc; border-left: 3px solid #1e4d8b; padding: 8px 12px; border-radius: 6px; margin-top: 12px; }
</style>
