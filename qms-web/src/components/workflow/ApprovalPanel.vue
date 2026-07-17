<script setup lang="ts">
import { ref } from 'vue'
import SignaturePad from '@/components/common/SignaturePad.vue'

interface Approver {
  name: string
  role: string
  status: 'pending' | 'approved' | 'rejected'
  comment?: string
  time?: string
}

const props = withDefaults(defineProps<{
  title?: string
  approvers?: Approver[]
  slaDeadline?: string
  showSignature?: boolean
}>(), {
  title: '审批',
  approvers: () => [],
  showSignature: true,
})

const emit = defineEmits<{
  approve: [data: { decision: 'approve' | 'reject'; comment: string; sign?: string }]
}>()

const decision = ref<'approve' | 'reject' | ''>('')
const comment = ref('')
const signRef = ref<InstanceType<typeof SignaturePad>>()
const signatureData = ref('')

function submit() {
  if (!decision.value) {
    ElMessage.warning('请选择通过或驳回')
    return
  }
  if (!comment.value.trim()) {
    ElMessage.warning('请填写审批意见')
    return
  }
  emit('approve', {
    decision: decision.value,
    comment: comment.value,
    sign: signatureData.value,
  })
  decision.value = ''
  comment.value = ''
  signatureData.value = ''
}

function onSign(data: { signer: string; time: string; ip: string; hash: string }) {
  signatureData.value = `${data.signer} · ${data.time}`
}
</script>

<template>
  <div class="approval-panel qms-card">
    <div class="card-h">
      <h3>{{ title }}</h3>
      <span v-if="slaDeadline" class="tag" :class="{ y: slaDeadline.includes('临期'), r: slaDeadline.includes('超期') }">
        SLA: {{ slaDeadline }}
      </span>
    </div>
    <div class="card-b">
      <!-- 会签状态 -->
      <div v-if="approvers.length" class="approvers">
        <div v-for="(a, i) in approvers" :key="i" class="approver" :class="a.status">
          <span class="status-dot"></span>
          <span class="name">{{ a.name }}</span>
          <span class="role">{{ a.role }}</span>
          <span class="st">{{ a.status === 'approved' ? '已通过' : a.status === 'rejected' ? '已驳回' : '待审批' }}</span>
        </div>
      </div>

      <!-- 审批操作 -->
      <div class="form">
        <div class="form-row">
          <label>审批决定 <span class="req">*</span></label>
          <div class="seg">
            <button :class="{ on: decision === 'approve' }" @click="decision = 'approve'">通过</button>
            <button :class="{ on: decision === 'reject' }" @click="decision = 'reject'">驳回</button>
          </div>
        </div>
        <div class="form-row">
          <label>审批意见 <span class="req">*</span></label>
          <textarea v-model="comment" placeholder="请填写审批意见" rows="3"></textarea>
        </div>
        <div v-if="showSignature && decision" class="form-row">
          <label>电子签名</label>
          <SignaturePad ref="signRef" label="审批签名" @sign="onSign" />
        </div>
        <div class="actions">
          <button class="btn pri" @click="submit">提交</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.card-h {
  padding: 10px 14px;
  border-bottom: 1px solid #e1e8f0;
  display: flex;
  align-items: center;
  gap: 8px;
  background: #fafcff;
  h3 { font-size: 13.5px; color: #1f2d3d; }
  .tag {
    font-size: 10.5px;
    background: #eef4fb; color: #1e4d8b; padding: 2px 8px; border-radius: 10px;
    &.y { background: #fff7e0; color: #d4a017; }
    &.r { background: #fdecea; color: #c0392b; }
  }
}
.card-b { padding: 14px; }

.approvers {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
  padding-bottom: 14px;
  border-bottom: 1px solid #eef4fb;
}
.approver {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  padding: 6px 10px;
  border-radius: 6px;
  background: #f4f7fb;
  .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #d4a017; }
  .name { font-weight: 600; color: #1f2d3d; }
  .role { color: #5a6b7e; }
  .st { color: #5a6b7e; }
  &.approved { .status-dot { background: #2f7d32; } }
  &.rejected { .status-dot { background: #c0392b; } }
}

.form {
  .form-row {
    margin-bottom: 12px;
    label { display: block; font-size: 12.5px; color: #5a6b7e; margin-bottom: 4px; .req { color: #c0392b; } }
    textarea {
      width: 100%; min-height: 60px; resize: vertical;
      padding: 6px 10px; border: 1px solid #e1e8f0; border-radius: 5px;
      font-size: 13px; font-family: inherit;
    }
  }
  .seg {
    display: inline-flex;
    border: 1px solid #e1e8f0;
    border-radius: 6px;
    overflow: hidden;
    button {
      border: none; background: #fff; padding: 8px 20px; font-size: 13px;
      cursor: pointer; color: #5a6b7e;
      &.on { background: #1e4d8b; color: #fff; }
    }
  }
  .actions { display: flex; justify-content: flex-end; gap: 8px; }
}

.btn {
  padding: 8px 18px; border-radius: 5px; border: 1px solid #e1e8f0;
  background: #fff; color: #1f2d3d; font-size: 13px; cursor: pointer;
  &.pri { background: #1e4d8b; color: #fff; border-color: #1e4d8b; }
}
</style>
