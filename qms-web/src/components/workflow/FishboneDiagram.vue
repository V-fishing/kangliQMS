<script setup lang="ts">
import { ref, watch } from 'vue'

interface FishboneData {
  category: string
  causes: string[]
}

const props = defineProps<{
  data: FishboneData[]
  problem?: string
  editable?: boolean
}>()

const emit = defineEmits<{
  update: [data: FishboneData[]]
}>()

const localData = ref<FishboneData[]>(JSON.parse(JSON.stringify(props.data)))
const newCause = ref<Record<string, string>>({})

watch(() => props.data, (v) => (localData.value = JSON.parse(JSON.stringify(v))), { deep: true })

function addCause(cat: string) {
  const val = newCause.value[cat]?.trim()
  if (!val) return
  const item = localData.value.find((d) => d.category === cat)
  if (item) {
    item.causes.push(val)
    newCause.value[cat] = ''
    emit('update', localData.value)
  }
}

function removeCause(cat: string, idx: number) {
  const item = localData.value.find((d) => d.category === cat)
  if (item) {
    item.causes.splice(idx, 1)
    emit('update', localData.value)
  }
}

const catColors: Record<string, string> = {
  '人': '#5b8def', '机': '#1e4d8b', '料': '#16a085',
  '法': '#d4a017', '环': '#8e44ad', '测': '#c0392b',
}
</script>

<template>
  <div class="fishbone">
    <!-- 问题（鱼头） -->
    <div class="problem-box">
      <span class="label">问题</span>
      <div class="problem">{{ problem ?? '待分析问题' }}</div>
    </div>

    <!-- 6M 分类 -->
    <div class="categories">
      <div v-for="cat in localData" :key="cat.category" class="category" :style="{ borderColor: catColors[cat.category] ?? '#1e4d8b' }">
        <div class="cat-header" :style="{ background: catColors[cat.category] ?? '#1e4d8b' }">
          {{ cat.category }}
        </div>
        <div class="causes">
          <div v-for="(c, i) in cat.causes" :key="i" class="cause">
            <span>{{ c }}</span>
            <button v-if="editable" class="remove" @click="removeCause(cat.category, i)">×</button>
          </div>
          <div v-if="editable" class="add-cause">
            <input
              v-model="newCause[cat.category]"
              type="text"
              placeholder="添加原因..."
              @keydown.enter="addCause(cat.category)"
            />
            <button @click="addCause(cat.category)">+</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.fishbone {
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.problem-box {
  flex-shrink: 0;
  text-align: center;
  width: 140px;

  .label { font-size: 11px; color: #5a6b7e; }
  .problem {
    margin-top: 4px;
    padding: 12px 16px;
    background: #fdecea;
    border: 2px solid #c0392b;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    color: #c0392b;
    min-height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.categories {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  flex: 1;
}

.category {
  border: 2px solid;
  border-radius: 8px;
  overflow: hidden;

  .cat-header {
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    padding: 6px 10px;
    text-align: center;
  }

  .causes { padding: 8px; min-height: 60px; }

  .cause {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 4px 8px;
    margin-bottom: 4px;
    background: #f4f7fb;
    border-radius: 4px;
    font-size: 12px;

    .remove {
      margin-left: auto;
      border: none;
      background: none;
      color: #c0392b;
      cursor: pointer;
      font-size: 14px;
    }
  }

  .add-cause {
    display: flex;
    gap: 4px;
    input {
      flex: 1;
      border: 1px solid #e1e8f0;
      border-radius: 4px;
      padding: 4px 6px;
      font-size: 11px;
    }
    button {
      border: 1px solid #1e4d8b;
      background: #1e4d8b;
      color: #fff;
      border-radius: 4px;
      padding: 0 8px;
      cursor: pointer;
      font-size: 14px;
    }
  }
}
</style>
