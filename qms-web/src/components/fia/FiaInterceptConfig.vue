<script setup lang="ts">
// FIA 首件拦截与时效配置（共享组件）：
// 统一收口到「系统管理 / 配置中心」，原首件「触发规则配置」页已删除。
// 触发事件类型、电子签名配置由配置中心内其它组件维护，本组件仅负责 FIA 专属的拦截与时效。
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { fiaApi } from '@/api/modules/fia'
import type { FiaTrigConfig } from '@/types/fia'

// 空默认配置（避免渲染期访问 undefined）
function emptyConfig(): FiaTrigConfig {
  return {
    triggers: [],
    intercept: { blockMode: 'hard', multiTrigger: 'merge', slaHours: 2, escalateTimes: 3 },
  }
}

// 配置状态：从后端 /fia/intercept-config 加载（无配置行时返回空兜底）
const cfg = reactive<FiaTrigConfig>(emptyConfig())
const loading = ref(false)

async function loadConfig() {
  loading.value = true
  try {
    const res = await fiaApi.getTrigConfig()
    if (res) cfg.intercept = { ...cfg.intercept, ...res.intercept }
  } catch {
    // 保留默认拦截配置
  } finally {
    loading.value = false
  }
}
onMounted(loadConfig)

const saving = ref(false)
async function saveAll() {
  saving.value = true
  try {
    await fiaApi.saveTrigConfig(cfg)
    ElMessage.success('拦截与时效配置已保存并即时生效')
  } catch (e: any) {
    ElMessage.error(e?.msg || e?.message || '保存失败，请重试')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="fia-intercept-config">
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>首件检验 · 拦截与时效</h3>
        <span class="tag">后端已落库 · /v1/fia/intercept-config</span>
      </div>
      <div class="qms-card__body">
        <div class="form-row full">
          <label>拦截方式</label>
          <el-radio-group v-model="cfg.intercept.blockMode">
            <el-radio-button value="hard">硬阻断(无通过记录不可开工)</el-radio-button>
            <el-radio-button value="soft">软阻断(告警可豁免)</el-radio-button>
          </el-radio-group>
        </div>
        <div class="form-row full">
          <label>多触发条件同时发生</label>
          <el-radio-group v-model="cfg.intercept.multiTrigger">
            <el-radio-button value="merge">合并一张校验单</el-radio-button>
            <el-radio-button value="separate">各自生成</el-radio-button>
          </el-radio-group>
        </div>
        <div class="form-row">
          <label>校验时效 SLA</label>
          <el-input-number v-model="cfg.intercept.slaHours" :min="0" :max="48" size="small" controls-position="right" style="width:110px" />
          <span class="meta">小时（超时通知班组长）</span>
        </div>
        <div class="form-row">
          <label>连续不合格升级</label>
          <el-input-number v-model="cfg.intercept.escalateTimes" :min="1" :max="10" size="small" controls-position="right" style="width:110px" />
          <span class="meta">次 → 升级质量主管</span>
        </div>
        <el-button type="primary" size="small" style="margin-top:8px" :loading="saving" @click="saveAll">保存配置</el-button>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.fia-intercept-config { display: flex; flex-direction: column; gap: 14px; }
</style>
