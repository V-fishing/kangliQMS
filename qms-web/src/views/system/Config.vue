<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import SchemaForm from '@/components/form/SchemaForm.vue'
import type { SchemaField } from '@/components/form/SchemaForm.vue'
import TriggerTypeConfig from '@/components/fia/TriggerTypeConfig.vue'
import SpcRuleConfig from '@/components/spc/SpcRuleConfig.vue'
import SpcParamConfig from '@/components/spc/SpcParamConfig.vue'
import FiaInterceptConfig from '@/components/fia/FiaInterceptConfig.vue'
import { fiaApi } from '@/api'

// ---------- 通用系统配置 ----------
const formData = ref<Record<string, unknown>>({})

const schema: SchemaField[] = [
  { prop: 'appName', label: '系统名称', type: 'input', value: '康立质量过程管理系统', span: 24 },
  { prop: 'pageSize', label: '默认分页大小', type: 'inputNumber', value: 20, min: 10, max: 100, span: 12 },
  { prop: 'sessionTimeout', label: '会话超时(分)', type: 'inputNumber', value: 30, min: 5, max: 120, span: 12 },
  { prop: 'enablePwa', label: '启用离线模式', type: 'switch', value: false, span: 12 },
  { prop: 'enableSse', label: '启用实时推送', type: 'switch', value: true, span: 12 },
  { prop: 'enableHighContrast', label: '高亮屏模式', type: 'switch', value: false, span: 12 },
  { prop: 'spcAlarmThreshold', label: 'SPC告警阈值', type: 'select', value: '3sigma', options: [
    { label: '2σ(预警)', value: '2sigma' }, { label: '3σ(标准)', value: '3sigma' }, { label: '6σ(严格)', value: '6sigma' }
  ], span: 12 },
  { prop: 'fiaTimeout', label: '首件超时(小时)', type: 'inputNumber', value: 4, min: 1, max: 24, span: 12 },
]

function onSubmit(data: Record<string, unknown>) {
  console.info('config saved', data)
  ElMessage.success('配置已保存')
}

// ---------- 电子签名配置(管理员手动配置会签验证方式与权限) ----------
const methodOptions = [
  { key: 'password', label: '用户名 + 密码' },
  { key: 'handwriting', label: '手写笔迹' },
  { key: 'ca', label: 'CA 证书' },
]
const nodeOptions = ['两级', '三级']
const granOptions = ['整单签名', '逐项签名']

const signCfg = reactive({
  signMethods: ['password'] as string[],
  signNodes: '两级',
  signGranularity: '整单签名',
  lockAfterFail: 3,
  lockMinutes: 5,
})
const signLoading = ref(false)

async function loadSignConfig() {
  try {
    const cfg = await fiaApi.getSignConfig()
    if (cfg) {
      signCfg.signMethods = cfg.signMethods?.length ? [...cfg.signMethods] : ['password']
      signCfg.signNodes = cfg.signNodes || '两级'
      signCfg.signGranularity = cfg.signGranularity || '整单签名'
      signCfg.lockAfterFail = cfg.lockAfterFail ?? 3
      signCfg.lockMinutes = cfg.lockMinutes ?? 5
    }
  } catch {
    // 读取失败时保留默认(密码默认)
  }
}

function toggleMethod(key: string) {
  const i = signCfg.signMethods.indexOf(key)
  if (i >= 0) signCfg.signMethods.splice(i, 1)
  else signCfg.signMethods.push(key)
}

async function saveSignConfig() {
  if (!signCfg.signMethods.length) {
    ElMessage.warning('至少选择一种签名方式')
    return
  }
  signLoading.value = true
  try {
    await fiaApi.saveSignConfig({
      signMethods: [...signCfg.signMethods],
      signNodes: signCfg.signNodes,
      signGranularity: signCfg.signGranularity,
      lockAfterFail: signCfg.lockAfterFail,
      lockMinutes: signCfg.lockMinutes,
    })
    ElMessage.success('电子签名配置已保存,变更并行会签将按此生效')
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.msg || e?.message || '保存失败')
  } finally {
    signLoading.value = false
  }
}

onMounted(loadSignConfig)
</script>

<template>
  <div class="system-config">
    <div class="qms-card">
      <div class="card-h"><h3>系统配置中心</h3></div>
      <div class="card-b">
        <SchemaForm :schema="schema" v-model="formData" @submit="onSubmit" />
      </div>
    </div>

    <!-- 电子签名配置: 由管理员手动配置会签验证方式与权限 -->
    <div class="qms-card sign-config">
      <div class="card-h"><h3>电子签名配置（会签验证方式与权限）</h3></div>
      <div class="card-b">
        <div class="cfg-row">
          <label class="cfg-label">签名方式</label>
          <div class="chip-group">
            <button v-for="m in methodOptions" :key="m.key" type="button"
              class="chip" :class="{ active: signCfg.signMethods.includes(m.key) }"
              @click="toggleMethod(m.key)">{{ m.label }}</button>
          </div>
          <span class="cfg-tip">至少选择一种；默认勾选「用户名 + 密码」，可叠加手写 / CA</span>
        </div>

        <div class="cfg-row">
          <label class="cfg-label">签名节点</label>
          <div class="chip-group">
            <button v-for="n in nodeOptions" :key="n" type="button"
              class="chip" :class="{ active: signCfg.signNodes === n }" @click="signCfg.signNodes = n">{{ n }}</button>
          </div>
        </div>

        <div class="cfg-row">
          <label class="cfg-label">签名粒度</label>
          <div class="chip-group">
            <button v-for="g in granOptions" :key="g" type="button"
              class="chip" :class="{ active: signCfg.signGranularity === g }" @click="signCfg.signGranularity = g">{{ g }}</button>
          </div>
        </div>

        <div class="cfg-row inline">
          <label class="cfg-label">失败锁定</label>
          <span class="cfg-inline">
            连续失败
            <input v-model.number="signCfg.lockAfterFail" type="number" min="1" max="10" class="qms-input num" />
            次后锁定
            <input v-model.number="signCfg.lockMinutes" type="number" min="1" max="120" class="qms-input num" />
            分钟
          </span>
        </div>

        <div class="cfg-actions">
          <button class="btn primary" :disabled="signLoading" @click="saveSignConfig">保存电子签名配置</button>
        </div>
        <p class="cfg-note">
          说明：该配置被「首件检验录入」与「变更并行会签（质量 / 采购 / 研发）」共用。
          会签人在审批弹窗中可在此配置的允许方式内选择（默认用户名 + 密码），三方全部签名后方可批准，进入试产验证等完整生命周期。
        </p>
      </div>
    </div>

    <!-- 触发事件类型配置：跨模块共享字典(首件 / 来料异常 / 8D / CAPA 共用), 统一收口到配置中心 -->
    <div class="sign-config">
      <TriggerTypeConfig />
    </div>

    <!-- 首件检验 · 拦截与时效（原「首件 / 触发规则配置」页已删除，统一收口到配置中心） -->
    <div class="sign-config">
      <FiaInterceptConfig />
    </div>

    <!-- SPC 判异规则与预警通知（原「SPC / 判异规则」页已删除，统一收口到配置中心） -->
    <div class="sign-config">
      <SpcRuleConfig />
    </div>

    <!-- SPC 参数配置（原「SPC / 参数配置」页已删除，统一收口到配置中心） -->
    <div class="sign-config">
      <SpcParamConfig />
    </div>
  </div>
</template>

<style scoped lang="scss">
.card-h { padding: 10px 14px; border-bottom: 1px solid #e1e8f0; background: #fafcff; h3 { font-size: 13.5px; } }
.card-b { padding: 14px; }
.sign-config { margin-top: 16px; }

.cfg-row { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px dashed #eef2f7; }
.cfg-row.inline { align-items: center; }
.cfg-label { width: 88px; flex: none; font-size: 13px; color: #3a4a5a; padding-top: 6px; font-weight: 600; }
.cfg-tip { color: #9aa7b5; font-size: 12px; margin-left: 4px; align-self: center; }

.chip-group { display: flex; flex-wrap: wrap; gap: 8px; }
.chip {
  border: 1px solid #cfd9e4; background: #fff; color: #4a5a6a;
  padding: 6px 14px; border-radius: 16px; cursor: pointer; font-size: 13px;
  transition: all .15s;
  &:hover { border-color: #5b8def; color: #2f6bdc; }
  &.active { background: #2f6bdc; border-color: #2f6bdc; color: #fff; }
}

.cfg-inline { font-size: 13px; color: #4a5a6a; display: flex; align-items: center; gap: 6px; }
.qms-input.num { width: 64px; height: 30px; text-align: center; padding: 2px 6px; border: 1px solid #cfd9e4; border-radius: 4px; }

.cfg-actions { margin-top: 14px; }
.btn.primary { background: #2f6bdc; border-color: #2f6bdc; color: #fff; padding: 8px 18px; border-radius: 6px; cursor: pointer;
  &:disabled { opacity: .6; cursor: not-allowed; } }
.cfg-note { margin-top: 12px; color: #8a97a6; font-size: 12px; line-height: 1.7; }
</style>
