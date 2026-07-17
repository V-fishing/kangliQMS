<script setup lang="ts">
import { ref, watch } from 'vue'

interface FiveWhyItem {
  why: string
  answer: string
}

const props = withDefaults(defineProps<{
  items: FiveWhyItem[]
  editable?: boolean
}>(), {
  editable: true,
})

const emit = defineEmits<{
  update: [items: FiveWhyItem[]]
}>()

const localItems = ref<FiveWhyItem[]>(JSON.parse(JSON.stringify(props.items)))

watch(() => props.items, (v) => (localItems.value = JSON.parse(JSON.stringify(v))), { deep: true })

function onUpdate() {
  emit('update', localItems.value)
}
</script>

<template>
  <div class="five-why-editor">
    <div v-for="(item, i) in localItems" :key="i" class="why-item">
      <div class="why-level">第{{ i + 1 }}层</div>
      <div class="why-content">
        <div class="why-question">
          <span class="q-label">为什么？</span>
          <span v-if="!editable" class="q-text">{{ item.why }}</span>
          <input v-else v-model="item.why" type="text" class="q-input" @input="onUpdate" />
        </div>
        <div class="why-arrow">↓</div>
        <div class="why-answer">
          <span class="a-label">因为：</span>
          <span v-if="!editable" class="a-text">{{ item.answer }}</span>
          <textarea v-else v-model="item.answer" class="a-input" rows="2" @input="onUpdate"></textarea>
        </div>
      </div>
    </div>
    <div v-if="localItems.length" class="conclusion">
      <span class="c-label">根本原因：</span>
      <span class="c-text">{{ localItems[localItems.length - 1]?.answer }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.five-why-editor {
  .why-item {
    display: flex;
    gap: 12px;
    margin-bottom: 8px;
  }

  .why-level {
    flex-shrink: 0;
    width: 50px;
    text-align: center;
    font-size: 12px;
    color: #1e4d8b;
    font-weight: 600;
    padding: 4px 0;
    background: #eef4fb;
    border-radius: 4px;
    height: fit-content;
  }

  .why-content {
    flex: 1;
  }

  .why-question {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 2px;

    .q-label { font-size: 12px; color: #5a6b7e; font-weight: 600; }
    .q-text { font-size: 13px; color: #1f2d3d; }
    .q-input {
      flex: 1;
      border: 1px solid #e1e8f0;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 13px;
    }
  }

  .why-arrow { text-align: center; color: #d4a017; font-size: 14px; }

  .why-answer {
    display: flex;
    gap: 6px;
    align-items: flex-start;

    .a-label { font-size: 12px; color: #2f7d32; font-weight: 600; padding-top: 4px; }
    .a-text { font-size: 13px; color: #1f2d3d; }
    .a-input {
      flex: 1;
      border: 1px solid #e1e8f0;
      border-radius: 4px;
      padding: 4px 8px;
      font-size: 13px;
      resize: vertical;
      font-family: inherit;
    }
  }

  .conclusion {
    margin-top: 12px;
    padding: 10px 14px;
    background: #fdecea;
    border: 1px solid #f5c6c0;
    border-radius: 6px;
    font-size: 13px;

    .c-label { font-weight: 700; color: #c0392b; }
    .c-text { color: #1f2d3d; }
  }
}
</style>
