import * as echarts from 'echarts/core'
import { LineChart, BarChart, GaugeChart, PieChart, RadarChart, HeatmapChart, ScatterChart } from 'echarts/charts'
import {
  GridComponent,
  MarkLineComponent,
  MarkPointComponent,
  MarkAreaComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  ToolboxComponent,
  TitleComponent,
  VisualMapComponent,
} from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  LineChart,
  BarChart,
  GaugeChart,
  PieChart,
  RadarChart,
  HeatmapChart,
  ScatterChart,
  GridComponent,
  MarkLineComponent,
  MarkPointComponent,
  MarkAreaComponent,
  TooltipComponent,
  LegendComponent,
  DataZoomComponent,
  ToolboxComponent,
  TitleComponent,
  VisualMapComponent,
  CanvasRenderer,
])

export default echarts
