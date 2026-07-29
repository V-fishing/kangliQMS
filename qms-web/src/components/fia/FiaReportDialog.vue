<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { fiaApi } from '@/api'

const props = defineProps<{ taskId: string; modelValue: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [v: boolean] }>()

const visible = computed({
  get: () => props.modelValue,
  set: (v) => emit('update:modelValue', v),
})

interface ReportInfo {
  reportNo: string
  archivedAt: string
  retainUntil: string
  status: string
  reportHash: string
  permission: string
  taskCode: string
  product: string
  proc: string
  line: string
  wo: string
  batch: string
  judge: string
}

const loading = ref(false)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const report = ref<{ info: ReportInfo; items: any[]; signs: any[]; log: any[] } | null>(null)

async function load(id: string) {
  loading.value = true
  report.value = null
  try {
    const [arc, vo, log] = await Promise.all([
      fiaApi.getArchive(id),
      fiaApi.getTaskDetail(id),
      fiaApi.getTaskLog(id),
    ])
    const detail: Record<string, unknown> = (vo as any)?.task || {}
    const items: Record<string, unknown>[] = (vo as any)?.items || []
    const lg: Record<string, unknown>[] = (log as any) || []
    const archived = !!arc
    const info: ReportInfo = {
      reportNo: str(arc?.reportNo) || `${str(detail.code)}-R`,
      archivedAt: str(arc?.archiveDate ?? arc?.archivedAt),
      retainUntil: archived ? str(arc?.retentionUntil) : '（未归档）',
      status: archived ? str(arc?.status) : str(detail.st),
      reportHash: archived ? str(arc?.reportHash ?? arc?.hash) : '（未归档）',
      permission: archived ? str(arc?.permission) : '受限',
      taskCode: str(detail.code),
      product: str(detail.productName),
      proc: str(detail.procName),
      line: str(detail.line),
      wo: str(detail.wo),
      batch: str(detail.batchNo),
      judge: str(detail.result),
    }
    report.value = {
      info,
      items,
      signs: lg.filter((n) => String(n.node ?? '').includes('签名')),
      log: lg,
    }
  } catch (e: any) {
    ElMessage.error(e?.msg || e?.message || '调阅报告失败')
  } finally {
    loading.value = false
  }
}

function str(v: unknown): string {
  return v == null ? '' : String(v)
}

watch(
  () => [visible.value, props.taskId] as const,
  ([v, id]) => {
    if (v && id) load(id)
  },
  { immediate: true },
)

function printReport() {
  window.print()
}
</script>

<template>
  <el-dialog v-model="visible" title="首件检验归档完整流程报告" width="900px" class="report-dlg">
    <div v-loading="loading">
      <div v-if="report" class="report">
        <div class="report__bar">
          <span class="report__no">{{ report.info.reportNo }}</span>
          <el-button size="small" @click="printReport">打印 / 导出 PDF</el-button>
        </div>

        <div class="report__h">一、归档信息（留存 15 年）</div>
        <div class="report__kv report__kv--3">
          <div class="kv"><span class="kv-k">报告编号</span><span class="kv-v">{{ report.info.reportNo }}</span></div>
          <div class="kv"><span class="kv-k">归档日期</span><span class="kv-v">{{ report.info.archivedAt || '—' }}</span></div>
          <div class="kv"><span class="kv-k">留存至</span><span class="kv-v">{{ report.info.retainUntil }}</span></div>
          <div class="kv"><span class="kv-k">状态</span><span class="kv-v">{{ report.info.status }}</span></div>
          <div class="kv"><span class="kv-k">报告哈希</span><span class="kv-v kv-monob">{{ report.info.reportHash }}</span></div>
          <div class="kv"><span class="kv-k">调阅权限</span><span class="kv-v">{{ report.info.permission }}</span></div>
        </div>

        <div class="report__h">二、任务与来料信息</div>
        <div class="report__kv report__kv--3">
          <div class="kv"><span class="kv-k">校验单号</span><span class="kv-v">{{ report.info.taskCode }}</span></div>
          <div class="kv"><span class="kv-k">产品</span><span class="kv-v">{{ report.info.product }}</span></div>
          <div class="kv"><span class="kv-k">工序</span><span class="kv-v">{{ report.info.proc }}</span></div>
          <div class="kv"><span class="kv-k">产线</span><span class="kv-v">{{ report.info.line }}</span></div>
          <div class="kv"><span class="kv-k">工单</span><span class="kv-v">{{ report.info.wo }}</span></div>
          <div class="kv"><span class="kv-k">批次</span><span class="kv-v">{{ report.info.batch }}</span></div>
          <div class="kv"><span class="kv-k">综合判定</span><span class="kv-v">{{ report.info.judge }}</span></div>
        </div>

        <div class="report__h">三、检验项（性能参数 / CTQ）</div>
        <el-table :data="report.items" border size="small" style="width: 100%">
          <el-table-column type="index" label="#" width="44" />
          <el-table-column prop="name" label="检验项" min-width="130" />
          <el-table-column label="CTQ" width="64" align="center">
            <template #default="{ row }"><span v-if="row.ctq" class="qms-pill r">CTQ</span></template>
          </el-table-column>
          <el-table-column label="标准值" width="120">
            <template #default="{ row }">{{ row.std }}{{ row.unit ? ' ' + row.unit : '' }}</template>
          </el-table-column>
          <el-table-column prop="tol" label="公差" width="90" />
          <el-table-column label="实测值" width="120">
            <template #default="{ row }">{{ row.val }}{{ row.unit ? ' ' + row.unit : '' }}</template>
          </el-table-column>
          <el-table-column prop="result" label="判定" width="80" />
        </el-table>

        <div class="report__h">四、全流程时间线</div>
        <el-timeline class="report__timeline">
          <el-timeline-item
            v-for="(n, i) in report.log"
            :key="i"
            :type="n.done ? 'primary' : 'info'"
            :hollow="!n.done"
          >
            <div class="report__tl-node">
              <span class="report__tl-title">{{ n.node }}</span>
              <span class="report__tl-time">{{ n.time || '—' }}</span>
            </div>
            <div v-if="n.user" class="report__tl-user">操作人：{{ n.user }}</div>
            <div class="report__tl-desc">{{ n.note || n.desc || '' }}</div>
          </el-timeline-item>
        </el-timeline>

        <div class="report__h">五、签名记录</div>
        <div v-if="report.signs.length" class="report__signs">
          <div v-for="(s, i) in report.signs" :key="i" class="report__sign">
            <span class="report__sign-node">{{ s.node }}</span>
            <span class="report__sign-user">{{ s.user || '—' }}</span>
            <span class="report__sign-time">{{ s.time || '—' }}</span>
          </div>
        </div>
        <div v-else class="muted">暂无签名记录</div>
      </div>
      <div v-else class="muted">未找到该任务的归档报告。</div>
    </div>
  </el-dialog>
</template>

<style scoped>
.report { font-size: 13px; }
.report__bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.report__no { font-weight: 700; color: #1e4d8b; font-size: 15px; }
.report__h { font-weight: 600; color: #1e4d8b; margin: 14px 0 8px; padding-left: 8px; border-left: 3px solid #1e4d8b; }
.report__kv { display: flex; flex-wrap: wrap; gap: 6px 0; background: #f7fafd; border: 1px solid #e6edf5; border-radius: 8px; padding: 8px 10px; }
.report__kv--3 .kv { width: 33.33%; }
.report__kv--2 .kv { width: 50%; }
.kv { display: flex; gap: 6px; font-size: 12px; padding: 2px 0; }
.kv-k { color: #8a98a8; min-width: 64px; }
.kv-v { color: #1f2d3d; font-weight: 600; word-break: break-all; }
.kv-monob { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 500; }
.report__timeline { padding: 4px 0 0 4px; }
.report__tl-node { display: flex; justify-content: space-between; gap: 12px; }
.report__tl-title { font-weight: 600; color: #1f2d3d; }
.report__tl-time { color: #909399; font-size: 12px; }
.report__tl-user { color: #5a6b7e; font-size: 12px; }
.report__tl-desc { color: #5a6b7e; font-size: 12px; }
.report__signs { display: flex; flex-direction: column; gap: 4px; }
.report__sign { display: flex; gap: 12px; font-size: 12px; background: #f7fafd; border: 1px solid #e6edf5; border-radius: 6px; padding: 4px 10px; }
.report__sign-node { color: #1e4d8b; font-weight: 600; min-width: 120px; }
.report__sign-user { color: #1f2d3d; }
.report__sign-time { color: #909399; }
</style>
