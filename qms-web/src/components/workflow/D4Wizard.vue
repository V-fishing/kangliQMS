<script setup lang="ts">
/**
 * D4 根因分析向导（流程式）
 *  - 第 1 步：鱼骨图（5M1E 6 类，逐步聚焦每类录入可能原因）
 *  - 第 2 步：5Why 根因追问（逐层深挖）
 *  - 上一步/下一步导航 + 步骤指示
 */
import { ref, computed } from 'vue'

interface FishboneData { category: string; causes: string[] }
interface WhyItem { why: string; answer: string }

const props = defineProps<{
  problem?: string
  fishbone: FishboneData[]
  fiveWhy: WhyItem[]
}>()
const emit = defineEmits<{
  'update:fishbone': [data: FishboneData[]]
  'update:fiveWhy': [items: WhyItem[]]
}>()

const CATS = ['人', '机', '料', '法', '环', '测'] as const
const COLORS: Record<string, string> = {
  '人': '#5b8def', '机': '#1e4d8b', '料': '#16a085',
  '法': '#d4a017', '环': '#8e44ad', '测': '#c0392b',
}
const DEFAULT_5M1E = CATS.map((c) => ({ category: c, causes: [] as string[] }))

/* 保证 6 类齐全（顺序/缺漏补全） */
function ensureFishbone(data: FishboneData[]): FishboneData[] {
  if (!data || data.length === 0) return JSON.parse(JSON.stringify(DEFAULT_5M1E))
  const map = new Map(data.map((d) => [d.category, d]))
  return DEFAULT_5M1E.map((d) => map.get(d.category) || { category: d.category, causes: [] })
}
const fish = ref<FishboneData[]>(ensureFishbone(props.fishbone))
const why = ref<WhyItem[]>(
  (props.fiveWhy || []).map((x) => ({ why: x.why || '', answer: x.answer || '' })),
)
function emitFish() { emit('update:fishbone', fish.value) }
function emitWhy() { emit('update:fiveWhy', why.value) }

/* 步骤状态 */
const step = ref(1)  // 1: 鱼骨图  2: 5Why
const fishActiveCat = ref<string>('人')
const fishNew = ref('')

/* === 鱼骨图：当前类别原因操作 === */
const fishStats = computed(() => {
  const total = fish.value.length
  const filled = fish.value.filter((c) => c.causes.some((s) => s.trim())).length
  return { total, filled }
})
function addFishCause() {
  const v = fishNew.value.trim()
  if (!v) return
  const item = fish.value.find((d) => d.category === fishActiveCat.value)
  if (item) {
    item.causes.push(v)
    fishNew.value = ''
    emitFish()
  }
}
function removeFishCause(cat: string, idx: number) {
  const item = fish.value.find((d) => d.category === cat)
  if (item) { item.causes.splice(idx, 1); emitFish() }
}

/* === 5Why：层级操作 === */
function addWhy() { why.value.push({ why: '', answer: '' }); emitWhy() }
function removeWhy(idx: number) { why.value.splice(idx, 1); emitWhy() }
const rootCause = computed(() => why.value[why.value.length - 1]?.answer?.trim() || '')

/* === 步骤导航 === */
function goNext() {
  if (step.value === 1) {
    if (fishStats.value.filled === 0) {
      // 没有填任何原因也允许进入下一步（不强校验，避免阻塞）
    }
    step.value = 2
  }
}
function goPrev() { if (step.value === 2) step.value = 1 }
</script>

<template>
  <div class="d4-wizard">
    <!-- 顶部：步骤指示 + 原始问题 -->
    <div class="wizard-head">
      <div class="stepper">
        <div :class="['step', { active: step === 1, done: step > 1 }]">
          <span class="dot">1</span>
          <span class="label">鱼骨图（5M1E）</span>
        </div>
        <div class="step-line" :class="{ done: step > 1 }"></div>
        <div :class="['step', { active: step === 2 }]">
          <span class="dot">2</span>
          <span class="label">5Why 根因追问</span>
        </div>
      </div>
      <div class="problem" v-if="problem">
        <span class="problem__label">原始问题</span>
        <span class="problem__text">{{ problem }}</span>
      </div>
    </div>

    <!-- ============== Step 1：鱼骨图 ============== -->
    <div v-if="step === 1" class="step-body">
      <div class="step-title">
        <span>第 1 步 · 选择维度并填写可能原因</span>
        <span class="stats">{{ fishStats.filled }} / {{ fishStats.total }} 类已填写</span>
      </div>

      <div class="cat-grid">
        <button
          v-for="c in fish"
          :key="c.category"
          type="button"
          :class="['cat-chip', { active: fishActiveCat === c.category, filled: c.causes.some((s) => s.trim()) }]"
          :style="{ '--c': COLORS[c.category] }"
          @click="fishActiveCat = c.category"
        >
          <span class="cat-dot" :style="{ background: COLORS[c.category] }"></span>
          <span class="cat-name">{{ c.category }}</span>
          <span class="cat-cnt">{{ c.causes.filter((s) => s.trim()).length }}</span>
        </button>
      </div>

      <div class="cause-editor">
        <div class="ce-head" :style="{ background: COLORS[fishActiveCat] }">
          为「{{ fishActiveCat }}」补充可能原因
        </div>
        <div class="ce-list">
          <div
            v-for="(cause, idx) in (fish.find((d) => d.category === fishActiveCat)?.causes || [])"
            :key="idx"
            class="ce-row"
          >
            <span class="ce-num">{{ idx + 1 }}.</span>
            <span class="ce-text">{{ cause || '（空）' }}</span>
            <button class="ce-del" @click="removeFishCause(fishActiveCat, idx)" title="删除">×</button>
          </div>
          <div v-if="!fish.find((d) => d.category === fishActiveCat)?.causes.length" class="ce-empty">
            暂无原因，输入下方的可能原因（按回车添加）
          </div>
        </div>
        <div class="ce-input">
          <input
            v-model="fishNew"
            type="text"
            :placeholder="`例如：${fishActiveCat === '人' ? '操作员培训不足' : fishActiveCat === '机' ? '设备老化' : fishActiveCat === '料' ? '原料批次差异' : fishActiveCat === '法' ? 'SOP 未更新' : fishActiveCat === '环' ? '温湿度超标' : '抽样频率过低'}`"
            @keydown.enter="addFishCause"
          />
          <button class="ce-add" @click="addFishCause">+ 添加</button>
        </div>
      </div>

      <div class="step-actions">
        <span class="hint">提示：完成 6 类后进入下一步根因追问</span>
        <button class="btn primary" @click="goNext">下一步：5Why 根因追问 →</button>
      </div>
    </div>

    <!-- ============== Step 2：5Why ============== -->
    <div v-else class="step-body">
      <div class="step-title">
        <span>第 2 步 · 5Why 根因追问</span>
        <span class="stats">{{ why.length }} 层</span>
      </div>

      <div class="why-form">
        <div v-for="(item, i) in why" :key="i" class="why-row">
          <span class="why-num">第 {{ i + 1 }} 层</span>
          <div class="why-fields">
            <label>为什么？</label>
            <input v-model="item.why" type="text" placeholder="追问为什么..." @input="emitWhy" />
            <label>因为：</label>
            <input v-model="item.answer" type="text" placeholder="回答..." @input="emitWhy" />
          </div>
          <button class="why-del" @click="removeWhy(i)" title="删除本层">×</button>
          <div v-if="i < why.length - 1" class="why-arrow">↓</div>
        </div>

        <button class="why-add" @click="addWhy">+ 添加追问层</button>

        <div v-if="rootCause" class="root-cause">
          <span class="rc-label">根本原因：</span>
          <span class="rc-text">{{ rootCause }}</span>
        </div>
      </div>

      <div class="step-actions">
        <button class="btn ghost" @click="goPrev">← 返回鱼骨图</button>
        <span class="hint">填写完成后点击底部「保存并推进到 D5」</span>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.d4-wizard {
  background: #fff;
  border: 1px solid #dbe7f7;
  border-radius: 8px;
  padding: 14px 16px;
}
.wizard-head {
  border-bottom: 1px dashed #dbe7f7;
  padding-bottom: 10px;
  margin-bottom: 12px;
}
.stepper {
  display: flex;
  align-items: center;
  gap: 10px;
  .step {
    display: flex;
    align-items: center;
    gap: 6px;
    .dot {
      width: 22px; height: 22px;
      border-radius: 50%;
      background: #dbe7f7; color: #5a6b7e;
      font-size: 12px; font-weight: 600;
      display: flex; align-items: center; justify-content: center;
    }
    .label { font-size: 12.5px; color: #5a6b7e; }
    &.active {
      .dot { background: #1e4d8b; color: #fff; }
      .label { color: #1e4d8b; font-weight: 600; }
    }
    &.done {
      .dot { background: #2e7d32; color: #fff; }
      .label { color: #2e7d32; }
    }
  }
  .step-line {
    flex: 0 0 32px;
    height: 2px;
    background: #dbe7f7;
    &.done { background: #2e7d32; }
  }
}
.problem {
  margin-top: 8px;
  background: #fff8e1;
  border: 1px solid #f0c14b;
  border-radius: 4px;
  padding: 5px 10px;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 6px;
  &__label { color: #b58a00; font-weight: 600; }
  &__text { color: #5a4400; }
}
.step-body { display: flex; flex-direction: column; gap: 10px; }
.step-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 600;
  color: #1e4d8b;
  .stats { font-size: 11px; color: #5a6b7e; font-weight: 400; }
}

/* === Step 1: 鱼骨图 === */
.cat-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  @media (max-width: 700px) { grid-template-columns: repeat(3, 1fr); }
  .cat-chip {
    border: 2px solid #dbe7f7;
    background: #fff;
    border-radius: 6px;
    padding: 6px 8px;
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    transition: all 0.15s;
    font-size: 12px;
    color: #3a4a5c;
    &:hover { border-color: var(--c); }
    &.active {
      border-color: var(--c);
      background: color-mix(in srgb, var(--c) 10%, #fff);
      .cat-name { color: var(--c); font-weight: 600; }
    }
    &.filled {
      .cat-cnt {
        background: var(--c); color: #fff;
      }
    }
    .cat-dot { width: 10px; height: 10px; border-radius: 50%; }
    .cat-name { flex: 1; }
    .cat-cnt {
      font-size: 10px; padding: 1px 6px; border-radius: 8px;
      background: #eef3fa; color: #5a6b7e; min-width: 18px; text-align: center;
    }
  }
}
.cause-editor {
  border: 1px solid #dbe7f7;
  border-radius: 6px;
  overflow: hidden;
  .ce-head {
    color: #fff;
    font-size: 12px;
    font-weight: 600;
    padding: 5px 10px;
  }
  .ce-list {
    background: #fff;
    padding: 8px 10px;
    min-height: 50px;
    .ce-row {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 3px 0;
      font-size: 12px;
      .ce-num { color: #5a6b7e; min-width: 22px; }
      .ce-text { flex: 1; color: #3a4a5c; }
      .ce-del {
        border: none; background: none; color: #c0392b; cursor: pointer;
        font-size: 14px; line-height: 1;
      }
    }
    .ce-empty {
      color: #9ca3af; font-size: 11px; text-align: center; padding: 10px;
    }
  }
  .ce-input {
    display: flex;
    gap: 6px;
    padding: 6px 10px;
    background: #f4f8ff;
    border-top: 1px solid #dbe7f7;
    input {
      flex: 1;
      border: 1px solid #c8d4e3;
      border-radius: 3px;
      padding: 4px 8px;
      font-size: 12px;
    }
    .ce-add {
      background: #1e4d8b; color: #fff;
      border: 1px solid #1e4d8b; border-radius: 3px;
      padding: 4px 12px; font-size: 12px; cursor: pointer;
    }
  }
}
.step-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 4px;
  .hint { font-size: 11px; color: #7a8aa0; }
  .btn {
    border: 1px solid #1e4d8b; border-radius: 4px;
    padding: 5px 12px; font-size: 12px; cursor: pointer;
    &.primary { background: #1e4d8b; color: #fff; }
    &.ghost { background: #fff; color: #1e4d8b; }
  }
}

/* === Step 2: 5Why === */
.why-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.why-row {
  position: relative;
  background: #f4f8ff;
  border: 1px solid #dbe7f7;
  border-radius: 6px;
  padding: 8px 30px 8px 10px;
  .why-num {
    position: absolute; top: 6px; left: 10px;
    color: #1e4d8b; font-size: 10px; font-weight: 600;
  }
  .why-fields {
    display: flex; align-items: center; gap: 6px; flex-wrap: wrap;
    margin-top: 12px;
    label { font-size: 11px; font-weight: 600; }
    label:nth-of-type(1) { color: #1e4d8b; }
    label:nth-of-type(2) { color: #16a085; }
    input {
      flex: 1; min-width: 120px;
      border: 1px solid #c8d4e3; border-radius: 3px;
      padding: 4px 8px; font-size: 12px;
    }
  }
  .why-del {
    position: absolute; top: 4px; right: 6px;
    border: none; background: none; color: #c0392b; cursor: pointer;
    font-size: 14px; line-height: 1;
  }
  .why-arrow {
    position: absolute; bottom: -16px; left: 50%; transform: translateX(-50%);
    color: #1e4d8b; font-size: 14px; font-weight: 600;
  }
}
.why-add {
  background: #f4f8ff; color: #1e4d8b;
  border: 1px dashed #1e4d8b; border-radius: 4px;
  padding: 4px 10px; font-size: 12px; cursor: pointer;
  margin-top: 12px;
  &:hover { background: #1e4d8b; color: #fff; }
}
.root-cause {
  background: linear-gradient(135deg, #c0392b, #e74c3c);
  color: #fff; border-radius: 6px; padding: 8px 10px;
  margin-top: 12px;
  .rc-label { font-size: 10px; opacity: 0.9; font-weight: 600; }
  .rc-text { font-size: 13px; font-weight: 600; margin-top: 2px; word-break: break-all; }
}
</style>
