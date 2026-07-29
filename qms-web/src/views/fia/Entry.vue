<script setup lang="ts">
import { useRoute } from 'vue-router'
import FiaEntryPanel from '@/components/fia/FiaEntryPanel.vue'

const route = useRoute()
</script>

<template>
  <!-- 检验录入能力已合并到「检验任务」模块（任务列表内抽屉录入）。
       此独立入口保留为按任务ID直达的高级入口，内容与任务模块内抽屉完全一致。 -->
  <FiaEntryPanel :taskId="(route.query.task as string) || ''" />
</template>
