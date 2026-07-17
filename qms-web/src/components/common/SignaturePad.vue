<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'

const props = withDefaults(defineProps<{
  /** 签名环节名称，如「检验员签名」「复核签名」「审批签名」 */
  label?: string
  width?: number
}>(), {
  label: '电子签名',
  width: 360,
})

const emit = defineEmits<{
  sign: [data: { signer: string; time: string; ip: string; hash: string }]
}>()

const authStore = useAuthStore()

const username = ref(authStore.currentRole?.name || '')
const password = ref('')
const signed = ref(false)
const signedData = ref<{ signer: string; time: string; ip: string; hash: string } | null>(null)

// 演示用：根据签名内容生成不可篡改摘要（原型为整单内容哈希）
function genHash(s: string) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0
  return 'SIG-' + Math.abs(h).toString(16).toUpperCase().padStart(8, '0')
}

function save() {
  if (signed.value) {
    ElMessage.info('已完成签名')
    return
  }
  if (!username.value.trim()) {
    ElMessage.warning('请输入用户名')
    return
  }
  if (!password.value) {
    ElMessage.warning('请输入密码')
    return
  }
  const time = new Date().toLocaleString('zh-CN', { hour12: false })
  const ip = '192.168.10.' + (Math.floor(Math.random() * 200) + 1)
  const hash = genHash(username.value + time + ip)
  signedData.value = { signer: username.value, time, ip, hash }
  signed.value = true
  emit('sign', signedData.value)
  ElMessage.success(`${props.label}完成`)
}

function clear() {
  username.value = authStore.currentRole?.name || ''
  password.value = ''
  signed.value = false
  signedData.value = null
}

defineExpose({ clear, save })
</script>

<template>
  <div class="esign" :style="{ width: width + 'px' }">
    <div class="esign__head">
      <span class="esign__title">{{ label }}</span>
      <span v-if="signed" class="esign__badge">✓ 已签名</span>
    </div>

    <template v-if="!signed">
      <div class="esign__field">
        <label>用户名</label>
        <input v-model="username" type="text" placeholder="请输入用户名" />
      </div>
      <div class="esign__field">
        <label>密码 <span class="req">*</span></label>
        <input v-model="password" type="password" placeholder="请输入密码" @keyup.enter="save" />
      </div>
      <div class="esign__note">签名记录含签名人、时间戳、IP；连续 3 次密码错误锁定 5 分钟。</div>
      <div class="esign__actions">
        <button class="btn" @click="clear">清除</button>
        <button class="btn pri" @click="save">确认签名</button>
      </div>
    </template>

    <div v-else class="esign__done">
      <div class="row"><span>签名人</span><b>{{ signedData?.signer }}</b></div>
      <div class="row"><span>时间</span><b>{{ signedData?.time }}</b></div>
      <div class="row"><span>IP</span><b>{{ signedData?.ip }}</b></div>
      <div class="row"><span>摘要</span><b class="hash">{{ signedData?.hash }}</b></div>
      <button class="btn sm" @click="clear">重新签名</button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.esign {
  border: 1px solid #e1e8f0;
  border-radius: 8px;
  background: #fafcff;
  padding: 14px;

  .esign__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }
  .esign__title { font-size: 13.5px; font-weight: 600; color: #1f2d3d; }
  .esign__badge {
    font-size: 11px; color: #2f7d32; background: #eaf6ec;
    padding: 2px 8px; border-radius: 10px;
  }

  .esign__field {
    margin-bottom: 10px;
    label { display: block; font-size: 12px; color: #5a6b7e; margin-bottom: 4px;
      .req { color: #c0392b; }
    }
    input {
      width: 100%; padding: 8px 10px; border: 1px solid #e1e8f0;
      border-radius: 5px; font-size: 13px; font-family: inherit;
      &:focus { outline: none; border-color: #2a6bb0; }
    }
  }

  .esign__note {
    font-size: 11px; color: #8a97a6; line-height: 1.6; margin: 6px 0 12px;
  }

  .esign__actions { display: flex; gap: 8px; justify-content: flex-end; }

  .esign__done {
    display: flex; flex-direction: column; gap: 6px;
    .row { display: flex; justify-content: space-between; font-size: 12.5px;
      span { color: #5a6b7e; }
      b { color: #1f2d3d; font-weight: 600; }
      .hash { font-family: ui-monospace, Menlo, Consolas, monospace; color: #1e4d8b; }
    }
    .btn.sm { align-self: flex-end; margin-top: 6px; padding: 5px 12px; font-size: 12px; }
  }

  .btn {
    padding: 7px 16px; border-radius: 5px; border: 1px solid #e1e8f0;
    background: #fff; color: #1f2d3d; font-size: 13px; cursor: pointer;
    &.pri { background: #1e4d8b; color: #fff; border-color: #1e4d8b; }
    &.sm { background: #eef4fb; color: #1e4d8b; border-color: #d4e2f3; }
  }
}
</style>
