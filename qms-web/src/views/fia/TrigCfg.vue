<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useAuthStore } from '@/stores/auth'
import { BANNERS } from '@/mock/roles'
import { fiaTrigConfig } from '@/mock/fia'
import { fiaApi } from '@/api/modules/fia'
import type { FiaTrigType } from '@/types/fia'

const authStore = useAuthStore()
const banner = BANNERS.fia?.[authStore.role] || {
  title: '首件检验 · 触发与签名配置',
  desc: '配置首件检验触发条件与电子签名环节',
}

// 深拷贝 mock 以便本地编辑（避免直接改动共享 mock）
const cfg = reactive(JSON.parse(JSON.stringify(fiaTrigConfig)))



// 触发类型新增 / 编辑弹窗
const dlg = reactive({ show: false, name: '', desc: '', editing: '' as string | null })
function openAdd() {
  dlg.editing = null
  dlg.name = ''
  dlg.desc = ''
  dlg.show = true
}
function openEdit(t: FiaTrigType) {
  dlg.editing = t.name
  dlg.name = t.name
  dlg.desc = t.desc
  dlg.show = true
}
function saveType() {
  const name = dlg.name.trim()
  if (!name) { ElMessage.warning('请输入触发类型名称'); return }
  if (dlg.editing) {
    const t = cfg.triggers.find((x) => x.name === dlg.editing)
    if (t) { t.name = name; t.desc = dlg.desc.trim() }
  } else {
    if (cfg.triggers.some((x) => x.name === name)) { ElMessage.warning('触发类型已存在'); return }
    cfg.triggers.push({ name, enabled: true, desc: dlg.desc.trim() })
  }
  dlg.show = false
  ElMessage.success('触发类型已保存')
}

function toggle(t: FiaTrigType) {
  t.enabled = !t.enabled
}

// 签名方式多选（可多选）映射到 methods.enabled
const selectedMethods = computed<string[]>({
  get: () => cfg.signature.methods.filter((m) => m.enabled).map((m) => m.key),
  set: (vals) => {
    cfg.signature.methods.forEach((m) => { m.enabled = vals.includes(m.key) })
  },
})

async function saveAll() {
  await fiaApi.saveTrigConfig(cfg)
  ElMessage.success('配置已保存并即时生效')
}
</script>

<template>
  <div class="fia-trig">
    <div class="qms-banner">
      <div class="qms-banner__icon" :style="{ background: authStore.currentRole?.color }">⚙️</div>
      <div>
        <div class="qms-banner__title">{{ banner.title }}</div>
        <div class="qms-banner__desc">{{ banner.desc }}</div>
      </div>
    </div>

    <!-- 触发事件类型配置 -->
    <div class="qms-card">
      <div class="qms-card__header">
        <h3>触发事件类型配置</h3>
        <span class="tag">可增删改 · 即时生效</span>
      </div>
      <div class="qms-card__body">
        <table class="insp-table">
          <thead>
            <tr><th>触发类型</th><th>状态</th><th>操作</th></tr>
          </thead>
          <tbody>
            <tr v-for="t in cfg.triggers" :key="t.name">
              <td>
                <div class="t-name">{{ t.name }}</div>
                <div class="t-desc">{{ t.desc }}</div>
              </td>
              <td>
                <span class="pill" :class="t.enabled ? 'g' : 'gray'">{{ t.enabled ? '启用' : '停用' }}</span>
              </td>
              <td>
                <el-button size="small" @click="toggle(t)">{{ t.enabled ? '停用' : '启用' }}</el-button>
                <el-button size="small" text type="primary" @click="openEdit(t)">编辑</el-button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="toolbar" style="border:none">
          <el-button type="primary" size="small" @click="openAdd">+ 新增类型</el-button>
        </div>
      </div>
    </div>

    <!-- 拦截与时效 + 电子签名配置 -->
    <div class="chart-grid chart-grid--2">
      <div class="qms-card">
        <div class="qms-card__header"><h3>拦截与时效</h3></div>
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
        </div>
      </div>

      <div class="qms-card">
        <div class="qms-card__header">
          <h3>电子签名配置</h3>
          </div>
        <div class="qms-card__body">
          <div class="form-row full">
            <label>签名方式（可多选）</label>
            <el-checkbox-group v-model="selectedMethods">
              <el-checkbox v-for="m in cfg.signature.methods" :key="m.key" :value="m.key">{{ m.name }}</el-checkbox>
            </el-checkbox-group>
          </div>
          <div class="form-row full">
            <label>签名节点</label>
            <el-radio-group v-model="cfg.signature.node">
              <el-radio-button value="two">检验人+复核人(两级)</el-radio-button>
              <el-radio-button value="three">加批准人(三级)</el-radio-button>
            </el-radio-group>
          </div>
          <div class="form-row full">
            <label>签名粒度</label>
            <el-radio-group v-model="cfg.signature.granularity">
              <el-radio-button value="order">整单签名</el-radio-button>
              <el-radio-button value="item">逐项签名</el-radio-button>
            </el-radio-group>
          </div>
          <el-button type="primary" size="small" style="margin-top:8px" @click="saveAll">保存配置</el-button>
        </div>
      </div>
    </div>

    <!-- 触发类型新增 / 编辑弹窗 -->
    <el-dialog v-model="dlg.show" :title="dlg.editing ? '编辑触发类型' : '新增触发类型'" width="420px">
      <div class="form-grid">
        <div class="form-row full">
          <label>类型名称<span class="req">*</span></label>
          <el-input v-model="dlg.name" placeholder="如：换模具" style="max-width:240px" />
        </div>
        <div class="form-row full">
          <label>说明</label>
          <el-input v-model="dlg.desc" type="textarea" :rows="2" placeholder="触发条件说明" style="max-width:320px" />
        </div>
      </div>
      <template #footer>
        <el-button @click="dlg.show = false">取消</el-button>
        <el-button type="primary" @click="saveType">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped lang="scss">
.fia-trig { display: flex; flex-direction: column; gap: 14px; }
.t-name { font-size: 13px; font-weight: 600; color: #1f2d3d; }
.t-desc { font-size: 11.5px; color: #909399; margin-top: 2px; }
</style>
