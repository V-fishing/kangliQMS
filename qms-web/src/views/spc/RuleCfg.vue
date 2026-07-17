<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/mock/roles'
import { spcRulesCfg } from '@/mock/spc'
import type { SpcRuleCfg } from '@/types/spc'

const authStore = useAuthStore()
const banner = BANNERS.spc?.[authStore.role] || {
  title: 'SPC · 判异规则',
  desc: 'Western Electric 判异规则与预警分级配置',
}

const rules = ref<SpcRuleCfg[]>([...spcRulesCfg])

const enabledCount = computed(() => rules.value.filter((r) => r.on).length)

// 单条规则启用/停用（至少保留一条）
function toggle(r: SpcRuleCfg) {
  if (r.on) {
    if (enabledCount.value <= 1) {
      ElMessage.warning('至少需保留一条判异规则，无法全部停用')
      return
    }
    r.on = false
    ElMessage.info(`${r.id} 已停用`)
  } else {
    r.on = true
    ElMessage.success(`${r.id} 已启用`)
  }
}

// 预警分级与通知
const alarmLevel = ref<'提醒' | '警告' | '停线'>('警告')
const suppressMin = ref(30)
const notify = ref({ popup: true, wecom: true })

function save() {
  ElMessage.success('规则配置已保存，即时生效')
}
</script>

<template>
  <div class="spc-rule">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">📐</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <!-- 面板 1：WECO 判异规则 -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>Western Electric 判异规则配置</h3>
        <span class="tag">默认启用4条(①②③⑤) · 至少保留1条</span>
      </div>
      <div class="qms-card__body">
        <div class="atom-grid">
          <div v-for="r in rules" :key="r.id" class="atom-card">
            <span class="atag"></span>
            <div class="ah">{{ r.id }} {{ r.name }}</div>
            <div class="am">
              级别：<span class="qms-pill" :class="r.lvl === '报警' ? 'r' : 'y'">{{ r.lvl }}</span>
              · 状态：<span class="qms-pill" :class="r.on ? 'g' : 'gray'">{{ r.on ? '启用' : '停用' }}</span>
            </div>
            <el-button
              size="small"
              :type="r.on ? 'default' : 'primary'"
              @click="toggle(r)"
            >{{ r.on ? '停用' : '启用' }}</el-button>
          </div>
        </div>
        <div class="ex-box">
          <b>异常处理：</b>所有规则全部禁用时系统提示至少保留一条；同一数据点同时触发预警和报警时仅展示报警级别。
        </div>
      </div>
    </div>

    <!-- 面板 2：预警分级与通知 -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>预警分级与通知</h3>
        </div>
      <div class="qms-card__body">
        <div class="form-grid">
          <div class="form-row">
            <label>预警级别</label>
            <div class="seg">
              <el-button
                :type="alarmLevel === '提醒' ? 'primary' : 'default'"
                size="small"
                @click="alarmLevel = '提醒'"
              >提醒</el-button>
              <el-button
                :type="alarmLevel === '警告' ? 'primary' : 'default'"
                size="small"
                @click="alarmLevel = '警告'"
              >警告(趋势类)</el-button>
              <el-button
                :type="alarmLevel === '停线' ? 'primary' : 'default'"
                size="small"
                @click="alarmLevel = '停线'"
              >停线(突破类→关联工单暂停)</el-button>
            </div>
          </div>

          <div class="form-row">
            <label>重复报警抑制 </label>
            <el-input v-model.number="suppressMin" style="width: 64px" />
            <span class="meta">分钟内同参数不重复通知</span>
          </div>

          <div class="form-row">
            <label>通知渠道 </label>
            <div class="check-list">
              <label><el-checkbox v-model="notify.popup" /> 系统弹窗</label>
              <label><el-checkbox v-model="notify.wecom" /> 企业微信</label>
            </div>
          </div>

          <el-button type="primary" size="small" @click="save">保存配置</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.spc-rule { display: flex; flex-direction: column; gap: 14px; }

.atom-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 10px;
}
.atom-card {
  position: relative;
  border: 1px solid #dce6f2;
  border-radius: 8px;
  padding: 10px 12px;
  background: #fff;
  font-size: 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;

  .atag {
    position: absolute;
    top: 8px;
    right: 8px;
  }
  .ah {
    font-weight: 600;
    color: #1f2d3d;
    margin-bottom: 2px;
    font-size: 12.5px;
    padding-right: 70px;
  }
  .am {
    color: #5a6b7b;
    font-size: 11.5px;
    line-height: 1.6;
  }
  .el-button {
    align-self: flex-start;
    margin-top: 4px;
  }
}

.check-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 6px 2px;
  label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #1f2d3d;
  }
}
</style>
