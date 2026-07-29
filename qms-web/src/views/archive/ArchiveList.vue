<template>
  <div class="qms-page">
    <!-- 统一归档查询 -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>归档查询</h3>
        <span class="tag">已接入：首件检验 · 供应商审核</span>
      </div>
      <div class="qms-card__body">
        <div class="filter-bar">
          <el-select v-model="type" placeholder="全部类型" clearable style="width: 160px">
            <el-option label="首件检验归档" value="fia" />
            <el-option label="供应商审核归档" value="audit" />
          </el-select>
          <el-input
            v-model="keyword"
            placeholder="编号 / 工单 / 归档号 模糊匹配"
            clearable
            style="width: 260px"
            @keyup.enter="onSearch"
          />
          <el-button type="primary" @click="onSearch">查询</el-button>
          <span class="spacer" />
          <span class="muted">
            <el-tag size="small" type="success">有效</el-tag>
            <el-tag size="small" type="warning" style="margin-left:4px">即将到期</el-tag>
            <el-tag size="small" type="danger" style="margin-left:4px">已过期</el-tag>
            &nbsp;留存状态
          </span>
        </div>
        <el-table
          :data="list"
          v-loading="loading"
          border
          stripe
          highlight-current-row
          @row-click="openDetail"
          style="cursor:pointer"
        >
          <el-table-column label="类型" width="140">
            <template #default="{ row }">
              <el-tag size="small" :type="row.archiveType === 'fia' ? 'success' : 'primary'">
                {{ typeMap[row.archiveType] || row.archiveType || '-' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="归档编号" min-width="170" show-overflow-tooltip>
            <template #default="{ row }">{{ row.archiveNo || '-' }}</template>
          </el-table-column>
          <el-table-column label="关联业务单号" min-width="160">
            <template #header>
              关联业务单号
              <el-tooltip content="归档来源业务单据：首件检验→工单号，供应商审核→审核记录号" placement="top">
                <span style="color:#909399;cursor:help;margin-left:4px">ⓘ</span>
              </el-tooltip>
            </template>
            <template #default="{ row }">{{ row.refNo || '-' }}</template>
          </el-table-column>
          <el-table-column label="归档日期" width="120">
            <template #default="{ row }">{{ row.archiveDate || '-' }}</template>
          </el-table-column>
          <el-table-column label="留存截止" width="130">
            <template #header>
              留存截止
              <el-tooltip content="法规要求保留到期日（首件检验/审核报告保留≥15年），到期前需确认处置方式" placement="top">
                <span style="color:#909399;cursor:help;margin-left:4px">ⓘ</span>
              </el-tooltip>
            </template>
            <template #default="{ row }">{{ row.retentionUntil || '-' }}</template>
          </el-table-column>
          <el-table-column label="留存状态" width="110">
            <template #default="{ row }">
              <el-tag size="small" :type="retentionStatus(row).type">
                {{ retentionStatus(row).label }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="内容指纹" min-width="180">
            <template #header>
              内容指纹
              <el-tooltip content="归档文件的 SHA-256 哈希值，用于防篡改校验。点击行可查看完整值并复制。" placement="top">
                <span style="color:#909399;cursor:help;margin-left:4px">ⓘ</span>
              </el-tooltip>
            </template>
            <template #default="{ row }">
              <span style="font-family:monospace;font-size:12px;color:#6b7785">
                {{ (row.reportHash || '').slice(0, 16) }}…
              </span>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!list.length && !loading" description="暂无归档记录" :image-size="60" />
      </div>
    </div>

    <!-- 留存到期提醒 -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>留存到期提醒</h3>
        <span class="tag">retentionUntil ≤ 今天 + N 天</span>
        <span class="spacer" />
        <span class="muted">提前</span>
        <el-input-number v-model="expiringDays" :min="1" :max="365" size="small" />
        <span class="muted">天</span>
        <el-button size="small" type="primary" @click="queryExpiring">查询</el-button>
      </div>
      <div class="qms-card__body">
        <el-table :data="expiring" v-loading="expiringLoading" border stripe highlight-current-row @row-click="openExpiringDetail" style="cursor:pointer">
          <el-table-column label="类型" width="140">
            <template #default="{ row }">
              <el-tag size="small" :type="row.archiveType === 'fia' ? 'success' : 'primary'">
                {{ typeMap[row.archiveType] || row.archiveType || '-' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="archiveNo" label="归档编号" min-width="170" show-overflow-tooltip />
          <el-table-column prop="refId" label="关联ID" min-width="200" show-overflow-tooltip />
          <el-table-column prop="retentionUntil" label="留存截止" width="130" />
          <el-table-column label="剩余天数" width="110">
            <template #default="{ row }">
              <el-tag :type="row.daysRemaining != null && row.daysRemaining <= 0 ? 'danger' : row.daysRemaining != null && row.daysRemaining <= 30 ? 'warning' : 'success'">
                {{ row.daysRemaining != null ? row.daysRemaining + ' 天' : '-' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!expiring.length && !expiringLoading" description="未来 N 天内无到期归档" :image-size="60" />
      </div>
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="归档详情" width="640px">
      <template v-if="detailRow">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="归档编号">{{ detailRow.archiveNo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="归档类型">
            <el-tag size="small" :type="detailRow.archiveType === 'fia' ? 'success' : 'primary'">
              {{ typeMap[detailRow.archiveType] || detailRow.archiveType }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="关联业务单号">{{ detailRow.refNo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="关联记录ID" :span="2">{{ detailRow.refId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="归档日期">{{ detailRow.archiveDate || '-' }}</el-descriptions-item>
          <el-descriptions-item label="留存截止">{{ detailRow.retentionUntil || '-' }}</el-descriptions-item>
          <el-descriptions-item label="留存状态">
            <el-tag size="small" :type="retentionStatus(detailRow).type">{{ retentionStatus(detailRow).label }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="剩余天数">
            {{ retentionDays(detailRow) != null ? retentionDays(detailRow) + ' 天' : '—' }}
          </el-descriptions-item>
          <el-descriptions-item label="内容指纹 (SHA-256)" :span="2">
            <div style="display:flex;align-items:center;gap:8px">
              <code style="font-size:12px;word-break:break-all;background:#f5f7fa;padding:4px 8px;border-radius:4px;flex:1">
                {{ detailRow.reportHash || '—' }}
              </code>
              <el-button size="small" type="primary" plain @click="copyHash(detailRow.reportHash)">复制</el-button>
            </div>
          </el-descriptions-item>
        </el-descriptions>

        <!-- 字段释义 -->
        <el-divider content-position="left" style="margin:16px 0 8px">
          <span style="font-size:12px;color:#909399">字段说明</span>
        </el-divider>
        <el-table :data="fieldHelp" size="small" border :show-header="false" style="font-size:12px">
          <el-table-column prop="field" width="130" label="字段">
            <template #default="{ row }"><strong>{{ row.field }}</strong></template>
          </el-table-column>
          <el-table-column prop="desc" label="说明" />
        </el-table>
      </template>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { sqmApi } from '@/api'
import type { ArchiveItem, ArchiveExpiringItem } from '@/types/sqm'

const type = ref('')
const keyword = ref('')
const list = ref<ArchiveItem[]>([])
const loading = ref(false)

const expiringDays = ref(30)
const expiring = ref<ArchiveExpiringItem[]>([])
const expiringLoading = ref(false)

const typeMap: Record<string, string> = {
  fia: '首件检验',
  audit: '供应商审核',
}

const fieldHelp = computed(() => [
  { field: '归档编号', desc: '系统为该归档记录分配的唯一标识编号' },
  { field: '归档类型', desc: '数据来源模块：首件检验归档 / 供应商审核报告归档' },
  { field: '关联业务单号', desc: '归档来源的业务单据编号。首件检验→工单号(wo_no)，供应商审核→审核记录号(record_no)' },
  { field: '关联记录ID', desc: '源业务记录的主键 UUID，可追溯到具体单据' },
  { field: '归档日期', desc: 'PDF 报告生成并写入归档表的日期' },
  { field: '留存截止', desc: '法规要求的最短保留到期日。首件检验报告与审核报告均需保留 ≥15 年，到期前 180 天/90 天/30 天提前提醒' },
  { field: '留存状态', desc: '有效（距到期 >90 天）/ 即将到期（≤90 天）/ 已过期（超过截止日）' },
  { field: '内容指纹', desc: '归档文件的 SHA-256 哈希值，用于防篡改校验。同一文件哈希不变，内容被修改后哈希必定变化' },
])

/** 留存状态：按到期日与今天的差值 */
function retentionStatus(row: ArchiveItem) {
  if (!row.retentionUntil) return { label: '未知', type: '' as any }
  const diff = retentionDays(row)
  if (diff == null) return { label: '未知', type: '' as any }
  if (diff < 0) return { label: '已过期', type: 'danger' as const }
  if (diff <= 90) return { label: diff <= 30 ? `${diff} 天后到期` : '即将到期', type: 'warning' as const }
  return { label: '有效', type: 'success' as const }
}

function retentionDays(row: ArchiveItem): number | null {
  if (!row.retentionUntil) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const until = new Date(row.retentionUntil)
  return Math.ceil((until.getTime() - today.getTime()) / 86_400_000)
}

async function copyHash(hash?: string) {
  if (!hash) { ElMessage.warning('无可复制内容'); return }
  try {
    await navigator.clipboard.writeText(hash)
    ElMessage.success('SHA-256 已复制到剪贴板')
  } catch {
    ElMessage.info('请手动复制：' + hash)
  }
}

// ---- 详情弹窗 ----
const detailVisible = ref(false)
const detailRow = ref<ArchiveItem | ArchiveExpiringItem | null>(null)

function openDetail(row: ArchiveItem) {
  detailRow.value = row
  detailVisible.value = true
}
function openExpiringDetail(row: ArchiveExpiringItem) {
  detailRow.value = row
  detailVisible.value = true
}

// ---- 查询 ----
async function query() {
  loading.value = true
  try {
    list.value = await sqmApi.getArchives({
      type: type.value || undefined,
      keyword: keyword.value || undefined,
      page: 1,
      size: 50,
    })
  } catch {
    list.value = []
  } finally {
    loading.value = false
  }
}
async function queryExpiring() {
  expiringLoading.value = true
  try {
    expiring.value = await sqmApi.getArchivesExpiring(expiringDays.value)
  } catch {
    expiring.value = []
  } finally {
    expiringLoading.value = false
  }
}
function onSearch() {
  query()
}

onMounted(() => {
  query()
  queryExpiring()
})
</script>

<style scoped>
.qms-page { padding: 16px; }
.qms-card { margin-bottom: 16px; }
.qms-card__header { display: flex; align-items: center; gap: 10px; }
.qms-card__header .spacer { flex: 1; }
.filter-bar { display: flex; gap: 10px; margin-bottom: 14px; align-items: center; }
.filter-bar .spacer { flex: 1; }
.muted { color: #8a94a6; font-size: 13px; }
.tag { font-size: 11px; background: #eef4fb; color: #1e4d8b; padding: 2px 8px; border-radius: 10px; }
</style>
