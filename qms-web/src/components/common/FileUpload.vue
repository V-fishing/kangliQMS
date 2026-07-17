<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(defineProps<{
  accept?: string
  maxSize?: number
  multiple?: boolean
}>(), {
  accept: 'image/*',
  maxSize: 10,
  multiple: false,
})

const emit = defineEmits<{
  upload: [files: File[]]
}>()

const fileList = ref<{ name: string; url: string }[]>([])
const dragOver = ref(false)

function handleFiles(files: FileList | null) {
  if (!files) return
  const arr = Array.from(files).filter((f) => f.size <= props.maxSize * 1024 * 1024)
  arr.forEach((f) => {
    const url = URL.createObjectURL(f)
    fileList.value.push({ name: f.name, url })
  })
  emit('upload', arr)
}

function onDrop(e: DragEvent) {
  dragOver.value = false
  handleFiles(e.dataTransfer?.files ?? null)
}

function onInput(e: Event) {
  const target = e.target as HTMLInputElement
  handleFiles(target.files)
}

function remove(idx: number) {
  URL.revokeObjectURL(fileList.value[idx].url)
  fileList.value.splice(idx, 1)
}
</script>

<template>
  <div class="file-upload">
    <div
      class="drop-zone"
      :class="{ active: dragOver }"
      @dragover.prevent="dragOver = true"
      @dragleave="dragOver = false"
      @drop.prevent="onDrop"
    >
      <input
        type="file"
        :accept="accept"
        :multiple="multiple"
        class="file-input"
        @change="onInput"
      />
      <p>点击或拖拽文件到此区域上传</p>
      <small>最大 {{ maxSize }}MB</small>
    </div>
    <div v-if="fileList.length" class="file-list">
      <div v-for="(f, i) in fileList" :key="i" class="file-item">
        <img v-if="accept.includes('image')" :src="f.url" class="thumb" />
        <span class="name">{{ f.name }}</span>
        <button class="remove" @click="remove(i)">×</button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.file-upload {
  .drop-zone {
    border: 2px dashed #d4e2f3;
    border-radius: 8px;
    padding: 20px;
    text-align: center;
    cursor: pointer;
    transition: 0.2s;
    position: relative;

    &.active {
      border-color: #1e4d8b;
      background: #eef4fb;
    }

    .file-input {
      position: absolute;
      inset: 0;
      opacity: 0;
      cursor: pointer;
    }

    p {
      font-size: 14px;
      color: #1f2d3d;
    }

    small {
      font-size: 12px;
      color: #8a9bb0;
    }
  }

  .file-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 8px;
  }

  .file-item {
    position: relative;
    border: 1px solid #e1e8f0;
    border-radius: 6px;
    padding: 4px;
    background: #fff;

    .thumb {
      width: 60px;
      height: 60px;
      object-fit: cover;
      border-radius: 4px;
    }

    .name {
      display: block;
      font-size: 11px;
      color: #5a6b7e;
      max-width: 80px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .remove {
      position: absolute;
      top: -4px;
      right: -4px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #c0392b;
      color: #fff;
      border: none;
      cursor: pointer;
      font-size: 12px;
      line-height: 1;
    }
  }
}
</style>
