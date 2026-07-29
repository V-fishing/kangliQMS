<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { sqmApi } from '@/api/modules/sqm'
import { upstreamTypesOf, nodeTypeLabel } from '../composables/useTrace'
import type { TraceNodeTreeVO } from '@/types/sqm'

const props = defineProps<{
  modelValue: boolean
  node: TraceNodeTreeVO | null
  orgId?: string
}>()
const emit = defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'confirm', ids: string[]): void
}>()

interface Opt {
  value: string
  label: string
  desc?: string
}

const selectedIds = ref<string[]>([])
// 累积去重的选项（远程搜索按需追加，避免一次性加载全部上游数据）
const options = ref<Opt[]>([])
const loading = ref(false)

const allowedTypes = computed(() => upstreamTypesOf(props.node?.nodeType))

function typeText(t: string): string {
  return nodeTypeLabel(t)
}

async function fetchOptions(kw: string) {
  if (!props.orgId || !allowedTypes.value.length) {
    options.value = []
    return
  }
  loading.value = true
  try {
    const lists = await Promise.all(
      allowedTypes.value.map((nt) =>
        sqmApi
          .searchTraceNodes({
            nodeType: nt,
            orgId: props.orgId,
            keyword: kw || undefined,
            page: 1,
            size: 50,
          })
          .then((r) =>
            (r?.records || []).map((n: any) => ({
              value: n.id,
              label: n.nodeName || '(未命名)',
              desc: `${typeText(n.nodeType)} · 批次 ${n.batchNo || '-'}${n.unit ? ' · ' + n.unit : ''}`,
            })),
          )
          .catch(() => [] as Opt[]),
      ),
    )
    // 累积去重，保留此前已选中的项，确保标签正常显示
    const merged = [...options.value]
    for (const o of lists.flat()) {
      if (!merged.find((m) => m.value === o.value)) merged.push(o)
    }
    options.value = merged
  } finally {
    loading.value = false
  }
}

// 远程搜索：输入关键字时按需从服务端拉取，不加载全量
function onRemote(kw: string) {
  fetchOptions(kw)
}

watch(
  () => props.modelValue,
  (v) => {
    if (v) {
      selectedIds.value = []
      options.value = []
      fetchOptions('')
    }
  },
)

function close() {
  emit('update:modelValue', false)
}

function confirm() {
  if (!selectedIds.value.length) {
    ElMessage.warning('请至少选择一个上游节点')
    return
  }
  emit('confirm', [...selectedIds.value])
  close()
}
</script>

<template>
  <el-dialog
    :model-value="modelValue"
    :title="'为「' + (node?.nodeName || node?.batchNo || '当前节点') + '」绑定上游节点'"
    width="540px"
    :close-on-click-modal="false"
    @update:model-value="close"
  >
    <div class="bu-body">
      <el-alert
        v-if="allowedTypes.length === 0"
        type="info"
        :closable="false"
        title="该节点已是源头（来料批次），无需绑定上游。"
      />
      <template v-else>
        <el-form label-width="86px">
          <el-form-item label="上游节点" required>
            <el-select
              v-model="selectedIds"
              multiple
              filterable
              remote
              reserve-keyword
              :remote-method="onRemote"
              :loading="loading"
              :disabled="allowedTypes.length === 0"
              placeholder="输入关键字搜索（物料/半成品/成品等），支持多选"
              class="bu-select"
              @visible-change="(open: boolean) => { if (open) fetchOptions('') }"
            >
              <el-option
                v-for="o in options"
                :key="o.value"
                :value="o.value"
                :label="o.label"
              >
                <div class="nf-opt">
                  <span class="nf-opt-label">{{ o.label }}</span>
                  <span v-if="o.desc" class="nf-opt-desc">{{ o.desc }}</span>
                </div>
              </el-option>
            </el-select>
          </el-form-item>
        </el-form>
        <div class="bu-tip">
          已选 <b>{{ selectedIds.length }}</b> 个上游节点。确认后，当前节点将分别作为这些上游的下游组成，
          自动建立 parent→child 关系并调整层级与根节点。
          <br />（大数据量时请用关键字搜索，按需选取，无需加载全部上游。）
        </div>
      </template>
    </div>
    <template #footer>
      <el-button @click="close">取消</el-button>
      <el-button type="primary" :disabled="allowedTypes.length === 0" @click="confirm">确认绑定</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.bu-body { padding: 4px 0; }
.bu-select { width: 100%; }
.bu-tip {
  margin-top: 8px;
  font-size: 12px;
  line-height: 1.5;
  color: #b45309;
}
.nf-opt { display: flex; flex-direction: column; line-height: 1.3; }
.nf-opt-label { font-size: 13px; }
.nf-opt-desc { font-size: 12px; color: #94a3b8; }
</style>
