<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  showGps?: boolean
}>(), {
  showGps: true,
})

const emit = defineEmits<{
  capture: [data: { photo: string; timestamp: string; gps?: string }]
}>()

const canvasRef = ref<HTMLCanvasElement>()
const videoRef = ref<HTMLVideoElement>()
const streaming = ref(false)
const captured = ref<string>('')

let stream: MediaStream | null = null

async function startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true })
    if (videoRef.value) {
      videoRef.value.srcObject = stream
      streaming.value = true
    }
  } catch {
    ElMessage.error('无法访问摄像头')
  }
}

function capture() {
  if (!videoRef.value || !canvasRef.value) return
  const video = videoRef.value
  const canvas = canvasRef.value
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(video, 0, 0)

  // 叠加水印
  const now = new Date().toLocaleString('zh-CN')
  ctx.font = '16px Microsoft YaHei'
  ctx.fillStyle = 'rgba(255,255,255,0.8)'
  ctx.fillRect(0, canvas.height - 30, canvas.width, 30)
  ctx.fillStyle = '#1f2d3d'
  ctx.fillText(now, 10, canvas.height - 10)

  if (props.showGps) {
    navigator.geolocation?.getCurrentPosition(
      (pos) => {
        const gps = `${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`
        ctx.fillStyle = 'rgba(255,255,255,0.8)'
        ctx.fillRect(canvas.width - 160, canvas.height - 30, 160, 30)
        ctx.fillStyle = '#1f2d3d'
        ctx.fillText(`GPS: ${gps}`, canvas.width - 150, canvas.height - 10)
        captured.value = canvas.toDataURL('image/png')
        emit('capture', { photo: captured.value, timestamp: now, gps })
      },
      () => {
        captured.value = canvas.toDataURL('image/png')
        emit('capture', { photo: captured.value, timestamp: now })
      },
    )
  } else {
    captured.value = canvas.toDataURL('image/png')
    emit('capture', { photo: captured.value, timestamp: now })
  }
}

function stopCamera() {
  stream?.getTracks().forEach((t) => t.stop())
  streaming.value = false
}
</script>

<template>
  <div class="photo-watermark">
    <div class="camera-area">
      <video ref="videoRef" autoplay playsinline class="video" :class="{ show: streaming }"></video>
      <canvas v-show="captured" ref="canvasRef" class="canvas"></canvas>
      <div v-if="!streaming && !captured" class="placeholder">
        <button class="btn pri" @click="startCamera">开启摄像头</button>
      </div>
    </div>
    <div class="actions">
      <button v-if="streaming" class="btn pri" @click="capture">拍照</button>
      <button v-if="streaming" class="btn" @click="stopCamera">关闭</button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.photo-watermark {
  .camera-area {
    position: relative;
    border: 1px solid #e1e8f0;
    border-radius: 8px;
    overflow: hidden;
    background: #000;
    min-height: 200px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .video, .canvas {
    max-width: 100%;
    max-height: 300px;
  }

  .video { display: none; &.show { display: block; } }

  .placeholder {
    padding: 40px;
    text-align: center;
  }

  .actions {
    display: flex;
    gap: 8px;
    margin-top: 8px;
  }

  .btn {
    padding: 6px 14px;
    border-radius: 5px;
    border: 1px solid #e1e8f0;
    background: #fff;
    color: #1f2d3d;
    font-size: 13px;
    cursor: pointer;

    &.pri { background: #1e4d8b; color: #fff; border-color: #1e4d8b; }
  }
}
</style>
