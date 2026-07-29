<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { BANNERS } from '@/config/banners'
import { fiaApi } from '@/api'
import { sqmApi } from '@/api/modules/sqm'
import type { FiaTrigType, FiaStdlib, FiaInspEntry } from '@/types/fia'
import type { SqmIncomingLot, Supplier } from '@/types/sqm'

const router = useRouter()
const authStore = useAuthStore()
const companyStore = useCompanyStore()
const banner = BANNERS.fia?.[authStore.role] || {
  title: '首件检验 · 供应商送检',
  desc: '供应商来料送检信息录入，提交后按产品生成首件检验任务；标准由工厂按物料号自动判定',
}

const submitting = ref(false)
const submitted = ref(false)
const submittedCount = ref(0)
const trigOptions = ref<FiaTrigType[]>([])
const stdOptions = ref<FiaStdlib[]>([])
/** 供应商质量库（sqm_supplier）下拉数据源 */
const supplierOptions = ref<Supplier[]>([])
/** 测试友好的可选下拉项（无需逐字录入） */
const lineOptions = ['SMT-1', 'SMT-2', 'DIP-1', 'ASSY-1', 'TEST-1']
const procOptions = ['来料首件', '焊接', '贴片', 'ICT', '组装', '包装']
/** 来料批次列表(选批次自动带出 物料编码 并自动匹配标准) */
const lotOptions = ref<SqmIncomingLot[]>([])

const form = reactive({
  // —— 供应商信息（整批共用，绑定供应商质量库）——
  supplierId: '',
  supplierName: '',
  supplierCode: '',
  contact: '',
  contactPhone: '',
  deliveryNo: '',
  incomingQty: '',
  incomingDate: '',
  // —— 整批送检说明 ——
  remark: '',
})

/** 选择供应商：从供应商质量库带出名称/编号，实现与供应商质量模块的供应商绑定 */
function onSupplierChange(id: string) {
  const s = supplierOptions.value.find((x) => x.id === id)
  form.supplierId = id
  form.supplierName = s?.name || ''
  form.supplierCode = s?.code || ''
}

/** 单款产品送检信息（每款生成一条检验任务） */
interface ProductRow {
  id: number
  woNo: string
  lineName: string
  productName: string
  procName: string
  triggerType: string
  stdId: string
  batchNo: string
  isUrgent: boolean
  /** 来料批次驱动匹配键 */
  lotNo?: string
  lotId?: string
  partNo?: string
  supplierId?: string
}
let pidSeq = 0
function blankProduct(): ProductRow {
  return {
    id: ++pidSeq,
    woNo: '',
    lineName: '',
    productName: '',
    procName: '来料首件',
    triggerType: '',
    stdId: '',
    batchNo: '',
    isUrgent: false,
    lotNo: '',
    lotId: '',
    partNo: '',
    supplierId: '',
  }
}
const products = ref<ProductRow[]>([])
/** 每款产品所选标准的检验项预览（性能参数），按 product.id 索引 */
const stdItemsMap = reactive<Record<number, FiaInspEntry[]>>({})
/** 每款产品自动匹配状态，按 product.id 索引 */
const matchStatus = reactive<Record<number, { loading: boolean; auto: boolean; reason?: string }>>({})
/** 每款产品当前引用的标准（自动或手动），按 product.id 索引 */
const pickedStd = reactive<Record<number, FiaStdlib | null>>({})

function normalize(s: string) {
  return (s || '').trim().toLowerCase().replace(/\s+/g, '')
}
/** 按 物料(产品)/工序 查询唯一生效标准（支持物料包含/被包含匹配） */
function findStdByMatProc(mat: string, proc: string): FiaStdlib | null {
  const m = normalize(mat)
  const p = normalize(proc)
  if (!m || !p) return null
  const cands = stdOptions.value.filter((s) => {
    if (normalize(s.proc) !== p) return false
    const sm = normalize(s.mat)
    return sm === m || sm.includes(m) || m.includes(sm)
  })
  if (!cands.length) return null
  cands.sort((a, b) => {
    const wa = a.st === '生效' ? 0 : 1
    const wb = b.st === '生效' ? 0 : 1
    if (wa !== wb) return wa - wb
    const ea = normalize(a.mat) === m ? 0 : 1
    const eb = normalize(b.mat) === m ? 0 : 1
    return ea - eb
  })
  return cands[0]
}
function syncPicked(p: ProductRow) {
  pickedStd[p.id] = stdOptions.value.find((s) => s.id === p.stdId) || null
}
/** 系统自动调取对应物料/工序的标准（AQL / 关键尺寸 / 性能参数） */
async function autoMatchStd(p: ProductRow) {
  matchStatus[p.id] = { loading: true, auto: false }
  await new Promise((r) => setTimeout(r, 120)) // 轻微防抖

  let found: FiaStdlib | null = null
  // 来料批次驱动：工厂按 物料编码 走后端标准库自动匹配（标准由工厂维护，与供应商无关）
  if (p.partNo && p.partNo.trim()) {
    try {
      found = await fiaApi.matchStd(
        companyStore.currentCompanyId as string,
        p.partNo.trim(),
        undefined,
        p.procName.trim() || '来料首件',
      )
    } catch {
      found = null
    }
  }
  // 回退：前端按 物料(产品)/工序 模糊匹配（兼容无批次的手工录入）
  if (!found) found = findStdByMatProc(p.productName, p.procName)

  if (found) {
    p.stdId = found.id as string
    syncPicked(p)
    matchStatus[p.id] = { loading: false, auto: !!p.partNo }
    await loadStdItemsFor(p.id, found.id as string)
  } else {
    p.stdId = ''
    syncPicked(p)
    stdItemsMap[p.id] = []
    matchStatus[p.id] = {
      loading: false,
      auto: false,
      reason: p.productName.trim() && p.procName.trim() ? '未匹配,提交时后端自动匹配' : undefined,
    }
  }
}

/** 选择来料批次：自动带出 物料编码 并触发后端标准匹配（供应商以上方绑定的为准） */
async function onLotChange(p: ProductRow, lotNo: string) {
  const lot = lotOptions.value.find((l) => l.lotNo === lotNo)
  if (!lot) {
    // 清空批次：重置匹配键，回到手工匹配
    p.lotId = ''
    p.partNo = ''
    await autoMatchStd(p)
    return
  }
  p.lotId = lot.id
  p.partNo = lot.partNo || ''
  p.productName = lot.partName || lot.partNo || ''
  p.procName = '来料首件'
  await autoMatchStd(p)
}

/** 加载来料批次列表（用于“选批次自动带出标准”） */
async function loadLots() {
  try {
    const lots = await sqmApi.listLots()
    lotOptions.value = lots ?? []
  } catch {
    lotOptions.value = []
  }
}
/** 手动覆盖选择标准 */
function onManualStd(p: ProductRow, v: string) {
  syncPicked(p)
  matchStatus[p.id] = { loading: false, auto: false, reason: '手动指定' }
  loadStdItemsFor(p.id, v)
}

function addProduct() {
  products.value.push(blankProduct())
}
function removeProduct(id: number) {
  products.value = products.value.filter((p) => p.id !== id)
  delete stdItemsMap[id]
  delete matchStatus[id]
  delete pickedStd[id]
}
async function loadStdItemsFor(id: number, stdId: string) {
  stdItemsMap[id] = []
  if (!stdId) return
  try {
    stdItemsMap[id] = await fiaApi.getStdItems(stdId)
  } catch {
    stdItemsMap[id] = []
  }
}

onMounted(async () => {
  try {
    const [trigs, stds, sups] = await Promise.all([
      fiaApi.getTriggerTypes(),
      fiaApi.getStdlib(),
      sqmApi.getSuppliers(),
    ])
    trigOptions.value = trigs
    stdOptions.value = stds
    supplierOptions.value = sups ?? []
  } catch {
    // 下拉加载失败仍可手动输入
  }
  // 加载来料批次，支撑“选批次自动带出标准”
  loadLots()
  // 默认给一条产品行，降低首次使用门槛
  addProduct()
})

// 供应商必须绑定到供应商质量库；其余录入项均为可选，便于测试
const supplierOk = computed(() => !!form.supplierId)
const productOkAll = computed(() => products.value.length > 0)
const canSubmit = computed(() => supplierOk.value && productOkAll.value)

/** 将整批供应商信息 + 单款产品信息拼接进 remark（后端 task 以 remark 存储来料送检信息） */
function buildRemarkFor(p: ProductRow): string {
  const parts = [
    `供应商：${form.supplierName.trim()}${form.supplierCode.trim() ? '（' + form.supplierCode.trim() + '）' : ''}`,
    `联系人：${form.contact.trim() || '—'}${form.contactPhone.trim() ? '（' + form.contactPhone.trim() + '）' : ''}`,
    `送货单：${form.deliveryNo.trim() || '—'}`,
    `来料数量：${form.incomingQty.trim() || '—'}${form.incomingDate ? ' · 来料日期：' + form.incomingDate : ''}`,
    `产品：${p.productName.trim() || '—'}${p.batchNo.trim() ? '（批次 ' + p.batchNo.trim() + '）' : ''} · 工单 ${p.woNo.trim() || '—'} · 产线 ${p.lineName.trim() || '—'} · 工序 ${p.procName.trim() || '—'}${p.isUrgent ? ' · 加急' : ''}`,
  ]
  let r = parts.join(' | ')
  if (form.remark.trim()) r += `\n送检说明：${form.remark.trim()}`
  return r
}

async function submit() {
  if (!companyStore.hasSelected || companyStore.isGroup) {
    ElMessage.warning('请先在顶部选择具体公司后再提交送检')
    return
  }
  if (!supplierOk.value) {
    ElMessage.warning('请选择供应商（绑定供应商质量库）')
    return
  }
  if (!productOkAll.value) {
    ElMessage.warning('请至少录入一款产品')
    return
  }
  submitting.value = true
  let done = 0
  try {
    for (const p of products.value) {
      await fiaApi.createTask({
        orgId: companyStore.currentCompanyId as string,
        woNo: p.woNo.trim() || undefined,
        lineName: p.lineName.trim() || undefined,
        productName: p.productName.trim() || '未命名产品',
        procName: p.procName.trim() || '来料首件',
        triggerType: p.triggerType || undefined,
        stdId: p.stdId || undefined,
        batchNo: p.batchNo.trim() || undefined,
        isUrgent: p.isUrgent,
        remark: buildRemarkFor(p),
        // 来料批次驱动：透传物料号，便于后端按工厂标准库自动匹配（标准与供应商无关）
        partNo: p.partNo?.trim() || undefined,
        supplierId: form.supplierId || undefined,
        lotId: p.lotId || undefined,
      })
      done++
    }
    submittedCount.value = done
    ElMessage.success(`已提交 ${done} 款产品的送检，对应检验任务已生成`)
    submitted.value = true
  } catch (e: any) {
    ElMessage.error((e?.msg || e?.message || '提交失败，请重试') + `（已成功 ${done} 款）`)
  } finally {
    submitting.value = false
  }
}

function resetAll() {
  Object.assign(form, {
    supplierId: '', supplierName: '', supplierCode: '', contact: '', contactPhone: '', deliveryNo: '', incomingQty: '', incomingDate: '', remark: '',
  })
  products.value = []
  for (const k of Object.keys(stdItemsMap)) delete stdItemsMap[Number(k)]
  submitted.value = false
  submittedCount.value = 0
  addProduct()
}

function goTasks() {
  router.push({ name: 'FiaTasks' })
}
</script>

<template>
  <div class="fia-supplier">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">🏭</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <!-- 流程说明 -->
    <div class="flow-hint">
      <span class="flow-step on">① 供应商录入送检信息</span>
      <span class="flow-arrow">→</span>
      <span class="flow-step">② 按产品生成检验任务</span>
      <span class="flow-arrow">→</span>
      <span class="flow-step">③ 检验录入 / 签名</span>
      <span class="flow-arrow">→</span>
      <span class="flow-step">④ 审批 / 归档</span>
    </div>

    <!-- 提交成功 -->
    <div v-if="submitted" class="qms-card success-card">
      <div class="success-icon">✓</div>
      <h3>送检信息已提交</h3>
      <p class="muted">本批共 {{ submittedCount }} 款产品，系统已自动生成 {{ submittedCount }} 条首件检验任务，后续由质检人员在「检验任务」中分别录入与签名。</p>
      <div class="success-actions">
        <el-button type="primary" @click="goTasks">查看检验任务</el-button>
        <el-button @click="resetAll">再填一批</el-button>
      </div>
    </div>

    <!-- 录入表单 -->
    <template v-else>
      <div class="qms-card">
        <div class="qms-card__header">
          <h3>供应商信息（整批共用）</h3>
          <span class="tag">绑定供应商质量库</span>
        </div>
        <div class="qms-card__body">
          <el-form label-width="96px" size="default">
            <el-row :gutter="20">
              <el-col :span="12">
                <el-form-item label="供应商" required>
                  <el-select
                    v-model="form.supplierId"
                    filterable
                    placeholder="从供应商质量库选择"
                    style="width: 100%"
                    @change="onSupplierChange"
                  >
                    <el-option
                      v-for="s in supplierOptions"
                      :key="s.id"
                      :label="`${s.name}${s.code ? '（' + s.code + '）' : ''}`"
                      :value="s.id"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="送货单号">
                  <el-input v-model="form.deliveryNo" placeholder="如 DN-20260720-001（选填）" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="联系人">
                  <el-input v-model="form.contact" placeholder="选填" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="联系电话">
                  <el-input v-model="form.contactPhone" placeholder="选填" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="来料数量">
                  <el-input v-model="form.incomingQty" placeholder="如 1000 PCS（选填）" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="来料日期">
                  <el-date-picker v-model="form.incomingDate" type="date" value-format="YYYY-MM-DD" placeholder="选填" style="width: 100%" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="整批说明">
                  <el-input v-model="form.remark" type="textarea" :rows="1" placeholder="选填，整批来料补充说明" />
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </div>
      </div>

      <!-- 产品清单：每款产品生成一条检验任务 -->
      <div class="qms-card">
        <div class="qms-card__header">
          <h3>送检产品清单</h3>
          <span class="tag">每款产品生成一条检验任务 · 字段可选，便于测试</span>
        </div>
        <div class="qms-card__body">
          <div v-for="(p, idx) in products" :key="p.id" class="product-row">
            <div class="product-row__head">
              <span class="product-row__idx">产品 {{ idx + 1 }}</span>
              <el-button
                v-if="products.length > 1"
                type="danger"
                link
                size="small"
                @click="removeProduct(p.id)"
              >删除</el-button>
            </div>
            <el-form label-width="96px" size="default">
              <el-row :gutter="20">
                <el-col :span="12">
                  <el-form-item label="来料批次" size="small">
                    <el-select
                      v-model="p.lotNo"
                      placeholder="选来料批次→自动带出物料并匹配标准"
                      filterable
                      clearable
                      style="width: 100%"
                      @change="(v: string) => onLotChange(p, v)"
                    >
                      <el-option
                        v-for="lot in lotOptions"
                        :key="lot.id"
                        :label="`${lot.lotNo} · ${lot.partNo} · ${lot.partName}`"
                        :value="lot.lotNo"
                      />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="产品（物料）">
                    <el-input v-model="p.productName" placeholder="选来料批次后自动带出，也可手工录入" @input="() => autoMatchStd(p)" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="工单号">
                    <el-input v-model="p.woNo" placeholder="如 WO-20260720-001（选填）" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="产线">
                    <el-select v-model="p.lineName" filterable allow-create default-first-option placeholder="选填，可新建" style="width: 100%">
                      <el-option v-for="l in lineOptions" :key="l" :label="l" :value="l" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="工序">
                    <el-select v-model="p.procName" filterable allow-create default-first-option placeholder="选填，系统据此自动匹配标准" style="width: 100%" @change="() => autoMatchStd(p)">
                      <el-option v-for="pr in procOptions" :key="pr" :label="pr" :value="pr" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="触发类型">
                    <el-select v-model="p.triggerType" placeholder="选择触发类型（选填）" style="width: 100%">
                      <el-option v-for="t in trigOptions" :key="t.id || t.name" :label="t.name" :value="t.name" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="检验标准">
                    <el-select v-model="p.stdId" placeholder="留空则系统自动匹配；也可手动覆盖" style="width: 100%" @change="(v:string) => onManualStd(p, v)">
                      <el-option v-for="s in stdOptions" :key="s.id || s.code" :label="`${s.code} · ${s.mat} · ${s.proc}`" :value="s.id" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="批次">
                    <el-input v-model="p.batchNo" placeholder="选填" />
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="紧急">
                    <el-switch v-model="p.isUrgent" />
                  </el-form-item>
                </el-col>
              </el-row>

              <!-- 系统自动调取的标准：AQL / 关键尺寸(CTQ) / 性能参数(检验项) -->
              <div class="std-auto">
                <div v-if="matchStatus[p.id]?.loading" class="std-auto__loading">⏳ 正在按 物料 匹配对应标准…</div>

                <template v-else-if="pickedStd[p.id]">
                  <div class="std-auto__head">
                    <span class="std-auto__badge" :class="matchStatus[p.id]?.auto ? 'auto' : 'manual'">
                      {{ matchStatus[p.id]?.auto ? '✓ 自动匹配' : '手动指定' }}
                    </span>
                    <span class="std-auto__code">{{ pickedStd[p.id]!.code }}</span>
                    <span class="muted">物料 {{ pickedStd[p.id]!.mat }} · 工序 {{ pickedStd[p.id]!.proc }}</span>
                    <span v-if="matchStatus[p.id]?.auto" class="std-auto__tip">修改产品/工序将重新自动匹配</span>
                  </div>
                  <div class="std-auto__meta">
                    <div class="meta-item"><span class="meta-k">AQL</span><span class="meta-v">{{ pickedStd[p.id]!.aql || '—' }}</span></div>
                    <div class="meta-item"><span class="meta-k">检验水平</span><span class="meta-v">{{ pickedStd[p.id]!.lvl || '—' }}</span></div>
                    <div class="meta-item meta-item--wide"><span class="meta-k">关键尺寸 / CTQ</span><span class="meta-v">{{ pickedStd[p.id]!.ctq || '—' }}</span></div>
                    <div class="meta-item"><span class="meta-k">版本</span><span class="meta-v">{{ pickedStd[p.id]!.ver }}</span></div>
                  </div>
                  <div v-if="stdItemsMap[p.id] && stdItemsMap[p.id].length" class="std-preview">
                    <div class="std-preview__hint">性能参数（共 {{ stdItemsMap[p.id].length }} 项，提交后自动带入检验录入）：</div>
                    <el-table :data="stdItemsMap[p.id]" border size="small" style="width: 100%">
                      <el-table-column type="index" label="#" width="40" />
                      <el-table-column prop="name" label="检验项" min-width="120" />
                      <el-table-column label="标准值" width="120">
                        <template #default="{ row }">{{ row.std }}{{ row.unit ? ' ' + row.unit : '' }}</template>
                      </el-table-column>
                      <el-table-column prop="tol" label="公差" width="90" />
                      <el-table-column label="CTQ" width="64" align="center">
                        <template #default="{ row }"><span v-if="row.ctq" class="qms-pill r">CTQ</span></template>
                      </el-table-column>
                    </el-table>
                  </div>
                </template>

                <div v-else-if="p.productName.trim() && p.procName.trim()" class="std-auto__warn">
                  ⚠ {{ matchStatus[p.id]?.reason || '未匹配到标准' }}：请先在「检验标准库」维护
                  物料「{{ p.productName }}」工序「{{ p.procName }}」的标准，或在上方手动选择检验标准。
                </div>
              </div>
            </el-form>
          </div>

          <el-button class="add-product" @click="addProduct">+ 添加产品</el-button>
        </div>
      </div>

      <div class="submit-bar">
        <span class="muted">本批共 {{ products.length }} 款产品，提交后各生成一条检验任务并进入质检流程</span>
        <el-button type="primary" size="large" :loading="submitting" @click="submit">提交送检</el-button>
      </div>
    </template>

    <div class="note">
      📌 供应商送检是首件检验任务的标准来源：供应商在此选择已绑定的供应商并录入整批来料信息与多款送检产品并提交，系统按「物料号」自动调用工厂自有标准库判定，生成多条检验任务；质检人员随后在「检验任务」中分别完成检验录入、签名与审批。
    </div>
  </div>
</template>

<style scoped lang="scss">
.fia-supplier { display: flex; flex-direction: column; gap: 12px; }
.flow-hint { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; background: #f3f7fd; border: 1px solid #e1ebf7; border-radius: 10px; padding: 10px 14px; font-size: 13px; color: #5a6b7e; }
.flow-step { padding: 2px 10px; border-radius: 14px; background: #fff; border: 1px solid #e1ebf7; color: #90a0b3; }
.flow-step.on { background: #1e4d8b; color: #fff; border-color: #1e4d8b; }
.flow-arrow { color: #b6c2d4; }
.product-row { border: 1px dashed #d8e2ef; border-radius: 10px; padding: 12px 14px; margin-bottom: 12px; background: #fbfdff; }
.product-row__head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.product-row__idx { font-weight: 600; color: #1e4d8b; font-size: 13px; }
.add-product { width: 100%; border-style: dashed; }
.std-preview { margin-top: 6px; }
.std-preview__hint { font-size: 12px; color: #909399; margin-bottom: 6px; }
.std-auto { margin-top: 4px; }
.std-auto__loading { font-size: 12px; color: #1e4d8b; padding: 8px 0; }
.std-auto__head { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin: 8px 0 6px; }
.std-auto__badge { font-size: 12px; padding: 1px 8px; border-radius: 10px; font-weight: 600; }
.std-auto__badge.auto { background: #e8f5e9; color: #2e7d32; border: 1px solid #b7dfb9; }
.std-auto__badge.manual { background: #fff4e5; color: #b26a00; border: 1px solid #f0d3a0; }
.std-auto__code { font-weight: 700; color: #1e4d8b; }
.std-auto__tip { font-size: 11px; color: #b0bac6; }
.std-auto__meta { display: flex; flex-wrap: wrap; gap: 8px; background: #f3f7fd; border: 1px solid #e1ebf7; border-radius: 8px; padding: 8px 10px; }
.meta-item { display: flex; align-items: center; gap: 6px; font-size: 12px; }
.meta-item--wide { flex: 1 1 100%; }
.meta-k { color: #8a98a8; }
.meta-v { color: #1f2d3d; font-weight: 600; }
.std-auto__warn { font-size: 12px; color: #b26a00; background: #fff7e8; border: 1px solid #f3d9a6; border-radius: 8px; padding: 8px 10px; margin-top: 6px; }
.submit-bar { display: flex; align-items: center; justify-content: flex-end; gap: 16px; padding: 12px 16px; background: #fff; border: 1px solid #e6edf5; border-radius: 10px; }
.note { font-size: 12px; color: #909399; line-height: 1.6; background: #f7f9fc; border-left: 3px solid #1e4d8b; padding: 8px 12px; border-radius: 6px; }
.success-card { text-align: center; padding: 36px 20px; }
.success-icon { width: 56px; height: 56px; line-height: 56px; border-radius: 50%; background: #67c23a; color: #fff; font-size: 30px; margin: 0 auto 12px; }
.success-card h3 { margin: 0 0 8px; color: #1f2d3d; }
.success-actions { margin-top: 16px; display: flex; gap: 12px; justify-content: center; }
</style>
