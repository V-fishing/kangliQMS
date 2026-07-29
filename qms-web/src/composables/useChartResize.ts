import { onActivated } from 'vue'

/**
 * 配合 <keep-alive> 使用：被缓存的页面/组件重新激活（onActivated）时，
 * 容器尺寸可能已变化（或曾为 0），需要手动 resize 避免 ECharts 画布空白。
 *
 * 用法（在 <script setup> 顶层调用，不要在 onMounted 内部调用）：
 *   useChartResize(() => [pieInst, barInst])
 * 或传入一个返回实例数组的 getter：
 *   useChartResize(() => Object.values(inst))
 */
export function useChartResize(
  getCharts: () => Array<{ resize: () => void } | null | undefined>,
) {
  onActivated(() => {
    for (const c of getCharts()) {
      c?.resize()
    }
  })
}
