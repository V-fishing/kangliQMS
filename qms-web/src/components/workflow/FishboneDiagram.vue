<script setup lang="ts">
/**
 * 鱼骨图组件
 *  - mode="edit" : 简单问答式表单(5M1E 每类一个原因列表,纯文本输入)
 *  - mode="view" : 真正的 SVG 石川馨鱼骨图(主脊+6M主肋+原因子刺+鱼头)
 */
import { ref, computed, watch } from 'vue'

interface FishboneData { category: string; causes: string[] }
const props = defineProps<{
  data: FishboneData[]
  problem?: string
  mode?: 'edit' | 'view'
}>()
const emit = defineEmits<{ update: [data: FishboneData[]] }>()

const CATS = ['人', '机', '料', '法', '环', '测'] as const
const COLORS: Record<string, string> = {
  '人': '#5b8def', '机': '#1e4d8b', '料': '#16a085',
  '法': '#d4a017', '环': '#8e44ad', '测': '#c0392b',
}
const DEFAULT_5M1E = CATS.map((c) => ({ category: c, causes: [] as string[] }))

function ensureDefaults(data: FishboneData[]): FishboneData[] {
  if (!data || data.length === 0) return JSON.parse(JSON.stringify(DEFAULT_5M1E))
  const map = new Map(data.map((d) => [d.category, d]))
  return DEFAULT_5M1E.map((d) => map.get(d.category) || { category: d.category, causes: [] })
}

const localData = ref<FishboneData[]>(ensureDefaults(props.data))
watch(() => props.data, (v) => (localData.value = ensureDefaults(v)), { deep: true })

const isEdit = computed(() => props.mode === 'edit')

/* === edit 模式：简单问答 === */
function setCause(cat: string, idx: number, val: string) {
  const item = localData.value.find((d) => d.category === cat)
  if (item) { item.causes[idx] = val; emit('update', localData.value) }
}
function addCause(cat: string) {
  const item = localData.value.find((d) => d.category === cat)
  if (item) { item.causes.push(''); emit('update', localData.value) }
}
function removeCause(cat: string, idx: number) {
  const item = localData.value.find((d) => d.category === cat)
  if (item) { item.causes.splice(idx, 1); emit('update', localData.value) }
}

/* === view 模式：SVG 几何 === */
const VB_W = 1000, VB_H = 460
const SPINE_X1 = 90, SPINE_X2 = 820, SPINE_Y = 230
const RIB_XS = [180, 360, 540]
const RIB_LEN = 150
const RIB_ANGLE = -30 * Math.PI / 180
interface Rib { cat: string; color: string; x1: number; y1: number; x2: number; y2: number; top: boolean }
const ribs = computed<Rib[]>(() => {
  const list: Rib[] = []
  RIB_XS.forEach((x, i) => list.push({ cat: CATS[i], color: COLORS[CATS[i]], x1: x, y1: SPINE_Y, x2: x + RIB_LEN * Math.cos(RIB_ANGLE), y2: SPINE_Y + RIB_LEN * Math.sin(RIB_ANGLE), top: true }))
  RIB_XS.forEach((x, i) => list.push({ cat: CATS[i + 3], color: COLORS[CATS[i + 3]], x1: x, y1: SPINE_Y, x2: x + RIB_LEN * Math.cos(-RIB_ANGLE), y2: SPINE_Y + RIB_LEN * Math.sin(-RIB_ANGLE), top: false }))
  return list
})
function causeTPoint(rib: Rib, i: number, total: number) {
  const t = total <= 1 ? 0.55 : 0.15 + (i / (total - 1)) * 0.8
  return { x: rib.x1 + (rib.x2 - rib.x1) * t, y: rib.y1 + (rib.y2 - rib.y1) * t }
}
</script>

<template>
  <!-- 简单问答式编辑（5M1E 6 类，每类一个原因列表） -->
  <div v-if="isEdit" class="fishbone-form">
    <div v-for="cat in localData" :key="cat.category" class="cat-block">
      <div class="cat-head" :style="{ background: COLORS[cat.category] }">{{ cat.category }}</div>
      <div class="causes">
        <div v-for="(c, i) in cat.causes" :key="i" class="cause-row">
          <input
            :value="c"
            type="text"
            :placeholder="`第 ${i + 1} 个原因（${cat}）`"
            @input="(e: any) => setCause(cat.category, i, e.target.value)"
          />
          <button class="rm" @click="removeCause(cat.category, i)" title="删除">×</button>
        </div>
        <button class="add" @click="addCause(cat.category)">+ 添加原因（{{ cat }}）</button>
      </div>
    </div>
  </div>

  <!-- 真正的 SVG 石川馨鱼骨图（仅在 8D 报告/末尾渲染） -->
  <svg v-else :viewBox="`0 0 ${VB_W} ${VB_H}`" preserveAspectRatio="xMidYMid meet" class="svg">
    <line :x1="SPINE_X1" :y1="SPINE_Y" :x2="SPINE_X2" :y2="SPINE_Y" stroke="#1e4d8b" stroke-width="3" />
    <polygon :points="`${SPINE_X2},${SPINE_Y} ${SPINE_X2 - 18},${SPINE_Y - 9} ${SPINE_X2 - 18},${SPINE_Y + 9}`" fill="#1e4d8b" />
    <rect x="840" y="200" width="130" height="60" rx="6" fill="#fdecea" stroke="#c0392b" stroke-width="2" />
    <text x="905" y="226" text-anchor="middle" fill="#5a6b7e" font-size="12">问题</text>
    <text x="905" y="248" text-anchor="middle" fill="#c0392b" font-size="13" font-weight="600">
      {{ problem || '待分析问题' }}
    </text>
    <g v-for="rib in ribs" :key="rib.cat">
      <line :x1="rib.x1" :y1="rib.y1" :x2="rib.x2" :y2="rib.y2" :stroke="rib.color" stroke-width="2.5" />
      <rect :x="rib.x2 - 18" :y="rib.top ? rib.y2 - 22 : rib.y2 + 2" width="36" height="22" rx="4" :fill="rib.color" />
      <text :x="rib.x2" :y="rib.top ? rib.y2 - 5 : rib.y2 + 18" text-anchor="middle" fill="#fff" font-size="13" font-weight="600">{{ rib.cat }}</text>
      <g v-for="(c, i) in (localData.find((d) => d.category === rib.cat)?.causes || [])" :key="`${rib.cat}-${i}`">
        <line
          :x1="causeTPoint(rib, i, (localData.find((d) => d.category === rib.cat)?.causes.length || 1)).x"
          :y1="causeTPoint(rib, i, (localData.find((d) => d.category === rib.cat)?.causes.length || 1)).y"
          :x2="causeTPoint(rib, i, (localData.find((d) => d.category === rib.cat)?.causes.length || 1)).x + 60"
          :y2="causeTPoint(rib, i, (localData.find((d) => d.category === rib.cat)?.causes.length || 1)).y"
          :stroke="rib.color" stroke-width="1.5" stroke-dasharray="3,2"
        />
        <text
          :x="causeTPoint(rib, i, (localData.find((d) => d.category === rib.cat)?.causes.length || 1)).x + 64"
          :y="causeTPoint(rib, i, (localData.find((d) => d.category === rib.cat)?.causes.length || 1)).y + 4"
          fill="#3a4a5c" font-size="11"
        >{{ c.length > 14 ? c.slice(0, 13) + '…' : c }}</text>
      </g>
    </g>
  </svg>
</template>

<style scoped lang="scss">
.fishbone-form {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  @media (max-width: 700px) { grid-template-columns: 1fr 1fr; }
}
.cat-block {
  border: 1px solid #e1e8f0;
  border-radius: 6px;
  overflow: hidden;
  background: #fff;
}
.cat-head {
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  text-align: center;
  letter-spacing: 1px;
}
.causes {
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-height: 60px;
}
.cause-row {
  display: flex;
  align-items: center;
  gap: 4px;
  input {
    flex: 1;
    border: 1px solid #dbe7f7;
    border-radius: 3px;
    padding: 3px 6px;
    font-size: 12px;
  }
  .rm {
    border: none;
    background: none;
    color: #c0392b;
    cursor: pointer;
    font-size: 14px;
    line-height: 1;
  }
}
.add {
  background: #f4f8ff;
  color: #1e4d8b;
  border: 1px dashed #1e4d8b;
  border-radius: 3px;
  padding: 3px 6px;
  font-size: 11px;
  cursor: pointer;
  &:hover { background: #1e4d8b; color: #fff; }
}
.svg {
  width: 100%;
  height: auto;
  background: #f4f8ff;
  border-radius: 6px;
  border: 1px solid #dbe7f7;
}
</style>
