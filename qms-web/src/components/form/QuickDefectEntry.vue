<script setup lang="ts">
import { ref } from 'vue'
import ScanInput from '@/components/common/ScanInput.vue'
import PhotoWatermark from '@/components/common/PhotoWatermark.vue'
import { useDictStore } from '@/stores/dict'

const dictStore = useDictStore()

const emit = defineEmits<{
  submit: [data: {
    batchNo: string
    type: string
    proc: string
    count: number
    desc: string
    photo?: string
    sev: string
  }]
}>()

const step = ref(1)
const batchNo = ref('')
const type = ref('')
const proc = ref('')
const count = ref(1)
const desc = ref('')
const sev = ref('一般')
const photo = ref('')

function onScan(val: string) {
  batchNo.value = val
  step.value = 2
}

function nextStep() {
  if (step.value < 3) step.value++
}

function prevStep() {
  if (step.value > 1) step.value--
}

function submit() {
  if (!batchNo.value || !type.value || !proc.value) {
    ElMessage.warning('请填写完整信息')
    return
  }
  emit('submit', {
    batchNo: batchNo.value,
    type: type.value,
    proc: proc.value,
    count: count.value,
    desc: desc.value,
    photo: photo.value,
    sev: sev.value,
  })
  // 重置
  step.value = 1
  batchNo.value = ''
  type.value = ''
  proc.value = ''
  count.value = 1
  desc.value = ''
  sev.value = '一般'
  photo.value = ''
  ElMessage.success('不良已提交')
}

function onCapture(data: { photo: string }) {
  photo.value = data.photo
}
</script>

<template>
  <div class="quick-defect">
    <div class="steps">
      <div class="step" :class="{ active: step >= 1, done: step > 1 }">
        <span class="num">1</span> 扫码
      </div>
      <div class="step" :class="{ active: step >= 2, done: step > 2 }">
        <span class="num">2</span> 选类型
      </div>
      <div class="step" :class="{ active: step >= 3 }">
        <span class="num">3</span> 提交
      </div>
    </div>

    <div v-show="step === 1" class="step-content">
      <ScanInput placeholder="扫描批次/工单条码" @scan="onScan" />
    </div>

    <div v-show="step === 2" class="step-content">
      <el-form label-width="80px" size="large">
        <el-form-item label="批次号">
          <el-input v-model="batchNo" readonly />
        </el-form-item>
        <el-form-item label="不良类型">
          <el-select v-model="type" placeholder="选择不良类型" style="width: 100%">
            <el-option v-for="d in dictStore.defectCategories" :key="d.value" :label="d.label" :value="d.label" />
          </el-select>
        </el-form-item>
        <el-form-item label="工序">
          <el-select v-model="proc" placeholder="选择工序" style="width: 100%">
            <el-option v-for="p in dictStore.processes" :key="p.value" :label="p.label" :value="p.label" />
          </el-select>
        </el-form-item>
        <el-form-item label="数量">
          <el-input-number v-model="count" :min="1" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="nextStep">下一步</el-button>
        </el-form-item>
      </el-form>
    </div>

    <div v-show="step === 3" class="step-content">
      <el-form label-width="80px" size="large">
        <el-form-item label="严重程度">
          <el-radio-group v-model="sev">
            <el-radio value="严重">严重</el-radio>
            <el-radio value="一般">一般</el-radio>
            <el-radio value="轻微">轻微</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="desc" type="textarea" :rows="3" placeholder="描述不良现象" />
        </el-form-item>
        <el-form-item label="拍照">
          <PhotoWatermark @capture="onCapture" />
        </el-form-item>
        <el-form-item>
          <el-button @click="prevStep">上一步</el-button>
          <el-button type="primary" @click="submit">提交</el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<style scoped lang="scss">
.quick-defect {
  .steps {
    display: flex;
    gap: 8px;
    margin-bottom: 16px;
  }

  .step {
    flex: 1;
    text-align: center;
    padding: 8px;
    border-radius: 6px;
    background: #f4f7fb;
    font-size: 13px;
    color: #5a6b7e;

    .num {
      display: inline-flex;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: #eef1f5;
      color: #5a6b7e;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      margin-right: 4px;
    }

    &.active {
      background: #eef4fb;
      color: #1e4d8b;
      font-weight: 600;
      .num { background: #1e4d8b; color: #fff; }
    }
    &.done {
      .num { background: #2f7d32; color: #fff; }
    }
  }
}
</style>
