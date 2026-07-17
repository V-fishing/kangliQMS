<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

interface FlowNode {
  id: string
  name: string
  type: 'start' | 'task' | 'decision' | 'end'
  status: 'done' | 'current' | 'pending'
  assignee?: string
  time?: string
}

const props = defineProps<{
  nodes: FlowNode[]
  currentNodeId?: string
  height?: number
}>()

const canvasRef = ref<HTMLCanvasElement>()

function draw() {
  const canvas = canvasRef.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')!
  const dpr = window.devicePixelRatio || 1
  const w = canvas.offsetWidth
  const h = props.height ?? 300
  canvas.width = w * dpr
  canvas.height = h * dpr
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, w, h)

  const nodes = props.nodes
  const nodeW = 140
  const nodeH = 50
  const gap = 40
  const totalW = nodes.length * nodeW + (nodes.length - 1) * gap
  const startX = Math.max(20, (w - totalW) / 2)
  const y = (h - nodeH) / 2

  const positions = nodes.map((n, i) => ({
    x: startX + i * (nodeW + gap),
    y,
    node: n,
  }))

  // 画连线
  ctx.strokeStyle = '#d4e2f3'
  ctx.lineWidth = 2
  for (let i = 0; i < positions.length - 1; i++) {
    const a = positions[i]
    const b = positions[i + 1]
    ctx.beginPath()
    ctx.moveTo(a.x + nodeW, a.y + nodeH / 2)
    ctx.lineTo(b.x, b.y + nodeH / 2)
    ctx.stroke()

    // 箭头
    ctx.fillStyle = a.node.status === 'done' ? '#2f7d32' : '#d4e2f3'
    ctx.beginPath()
    ctx.moveTo(b.x, b.y + nodeH / 2)
    ctx.lineTo(b.x - 8, b.y + nodeH / 2 - 4)
    ctx.lineTo(b.x - 8, b.y + nodeH / 2 + 4)
    ctx.fill()
  }

  // 画节点
  positions.forEach((p) => {
    const n = p.node
    let bg = '#fff'
    let border = '#e1e8f0'
    let textColor = '#5a6b7e'
    if (n.status === 'done') { bg = '#e8f5e9'; border = '#2f7d32'; textColor = '#1b6b1e' }
    if (n.status === 'current') { bg = '#eef4fb'; border = '#1e4d8b'; textColor = '#1e4d8b' }

    ctx.fillStyle = bg
    ctx.strokeStyle = border
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.roundRect(p.x, p.y, nodeW, nodeH, 6)
    ctx.fill()
    ctx.stroke()

    ctx.fillStyle = textColor
    ctx.font = '13px Microsoft YaHei'
    ctx.textAlign = 'center'
    ctx.fillText(n.name, p.x + nodeW / 2, p.y + 22)

    if (n.assignee) {
      ctx.font = '11px Microsoft YaHei'
      ctx.fillStyle = '#8a9bb0'
      ctx.fillText(n.assignee, p.x + nodeW / 2, p.y + 38)
    }
  })
}

onMounted(() => {
  draw()
  window.addEventListener('resize', draw)
})
onBeforeUnmount(() => window.removeEventListener('resize', draw))
watch(() => props.nodes, draw, { deep: true })
</script>

<template>
  <canvas ref="canvasRef" class="bpmn-viewer" :style="{ height: (height ?? 300) + 'px' }"></canvas>
</template>

<style scoped>
.bpmn-viewer { width: 100%; display: block; }
</style>
