<script setup lang="ts">
import { computed } from 'vue'
import type { Ncm8D } from '@/types/ncm'

const props = defineProps<{
  data: Ncm8D
}>()

const emit = defineEmits<{
  selectStage: [stageIndex: number]
}>()

const currentStage = computed(() => props.data.currentStage)

const stageStatus = (index: number): 'done' | 'current' | 'pending' => {
  if (index < currentStage.value) return 'done'
  if (index === currentStage.value) return 'current'
  return 'pending'
}
</script>

<template>
  <div class="eight-d-board">
    <!-- 标题 -->
    <div class="header">
      <h3>{{ data.title }}</h3>
      <span class="pill" :class="data.sev === '严重' ? 'r' : data.sev === '一般' ? 'y' : 'gray'">
        {{ data.sev }}
      </span>
      <span class="pill b">{{ data.id }}</span>
    </div>

    <!-- D1-D8 步骤看板 -->
    <div class="stepper">
      <div
        v-for="(stage, i) in data.stages"
        :key="i"
        class="step"
        :class="stageStatus(i)"
        @click="emit('selectStage', i)"
      >
        <div class="scirc">{{ stage.name.split('-')[0] }}</div>
        <span class="sname">{{ stage.name.split('-')[1] }}</span>
      </div>
    </div>

    <!-- 当前阶段详情 -->
    <div class="stage-detail">
      <div class="detail-header">
        <h4>{{ data.stages[currentStage]?.name }}</h4>
        <span v-if="data.stages[currentStage]?.owner" class="owner">
          负责人: {{ data.stages[currentStage].owner }}
        </span>
        <span v-if="data.stages[currentStage]?.due" class="due">
          截止: {{ data.stages[currentStage].due }}
        </span>
      </div>
      <div v-if="data.stages[currentStage]?.content" class="content">
        {{ data.stages[currentStage].content }}
      </div>
      <div v-if="data.rootCause && currentStage >= 3" class="root-cause">
        <strong>根因分析:</strong> {{ data.rootCause }}
      </div>
      <div v-if="data.actions?.length && currentStage >= 4" class="actions-list">
        <strong>纠正措施:</strong>
        <ul>
          <li v-for="(a, i) in data.actions" :key="i" :class="{ done: a.done }">
            {{ a.desc }} - {{ a.owner }} ({{ a.due }})
            <span class="pill" :class="a.done ? 'g' : 'y'">{{ a.done ? '已完成' : '待执行' }}</span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.eight-d-board {
  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    h3 { font-size: 15px; color: #1e4d8b; }
  }
  .pill {
    display: inline-block;
    padding: 2px 9px;
    border-radius: 10px;
    font-size: 11px;
    font-weight: 600;
    &.r { background: #fdecea; color: #c0392b; }
    &.y { background: #fff7e0; color: #d4a017; }
    &.g { background: #e8f5e9; color: #2f7d32; }
    &.b { background: #eef4fb; color: #1e4d8b; }
    &.gray { background: #eef1f5; color: #5a6b7e; }
  }
}

.stepper {
  display: flex;
  gap: 0;
  margin: 14px 0 18px;
  flex-wrap: wrap;
}
.step {
  flex: 1;
  min-width: 96px;
  text-align: center;
  position: relative;
  font-size: 11.5px;
  color: #5a6b7e;
  padding: 6px 4px;
  z-index: 1;
  cursor: pointer;

  .scirc {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    background: #eef1f5;
    color: #5a6b7e;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    margin-bottom: 4px;
    font-size: 12px;
  }

  &.done .scirc { background: #2f7d32; color: #fff; }
  &.current .scirc { background: #1e4d8b; color: #fff; box-shadow: 0 0 0 4px #eef4fb; }

  &::after {
    content: '';
    position: absolute;
    top: 21px;
    left: 50%;
    width: 100%;
    height: 2px;
    background: #eef1f5;
    z-index: -1;
  }
  &:last-child::after { display: none; }
  &.done::after { background: #2f7d32; }

  .sname { display: block; }
}

.stage-detail {
  background: #fafcff;
  border: 1px solid #e1e8f0;
  border-radius: 8px;
  padding: 14px;

  .detail-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 8px;
    h4 { font-size: 14px; color: #1e4d8b; }
    .owner, .due { font-size: 12px; color: #5a6b7e; }
  }

  .content {
    font-size: 13px;
    color: #1f2d3d;
    line-height: 1.6;
    padding: 8px 0;
  }

  .root-cause {
    margin-top: 10px;
    padding: 8px 12px;
    background: #fff7e0;
    border: 1px solid #fde9b8;
    border-radius: 6px;
    font-size: 12.5px;
    color: #1f2d3d;
  }

  .actions-list {
    margin-top: 10px;
    font-size: 12.5px;

    ul { margin: 4px 0 0 16px; }
    li { padding: 4px 0; }
    li.done { color: #5a6b7e; text-decoration: line-through; }
  }
}
</style>
