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
  CalendarComponent,
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
  CalendarComponent,
  CanvasRenderer,
])

export default echarts

// ── 共享图表 option 工厂（Dash 页面通用） ──────────────

const C = { bar: ['#2a6bb0', '#1e4d8b'], red: '#c0392b', gold: '#d4a017', green: '#2f7d32', blue: '#1e4d8b' }

export function vbarOption(o: { xData: string[]; data: number[]; name?: string; color?: [string,string] }) {
  const [c1, c2] = o.color || C.bar
  return { tooltip: { trigger: 'axis' }, grid: { left: 42, right: 18, top: 24, bottom: 30 },
    xAxis: { type: 'category', data: o.xData }, yAxis: { type: 'value', name: o.name || '' },
    series: [{ type: 'bar', data: o.data, barWidth: 24,
      itemStyle: { color: new echarts.graphic.LinearGradient(0,0,0,1, [{ offset:0, color:c1 }, { offset:1, color:c2 }]), borderRadius: [4,4,0,0] },
      label: { show: true, position: 'top', formatter: '{c}%' } }] }
}

export function barLineOption(o: { xData: string[]; barData: number[]; barName: string; lineData: number[]; lineName: string; barColor?: string; markLine80?: boolean }) {
  return { tooltip: { trigger: 'axis' }, legend: { data: [o.barName, o.lineName], bottom: 0 },
    grid: { left: 46, right: 46, top: 30, bottom: 40 },
    xAxis: { type: 'category', data: o.xData },
    yAxis: [{ type: 'value', name: o.barName }, { type: 'value', name: o.lineName, max: 100, axisLabel: { formatter: '{value}%' } }],
    series: [
      { name: o.barName, type: 'bar', data: o.barData, barWidth: '48%', itemStyle: { color: o.barColor || C.blue, borderRadius: [4,4,0,0] }, label: { show: true, position: 'top', fontSize: 10 } },
      { name: o.lineName, type: 'line', yAxisIndex: 1, data: o.lineData, symbol: 'circle', symbolSize: 6, lineStyle: { color: C.red, width: 2 }, itemStyle: { color: C.red },
        markLine: o.markLine80 ? { silent: true, symbol: 'none', lineStyle: { type: 'dashed', color: C.gold }, data: [{ yAxis: 80, label: { formatter: '80%关键线', fontSize: 9, color: C.gold, position: 'insideEndTop' } }] } : void 0 },
    ] }
}

export function trendOption(o: { days: number[]; vals: number[]; target: number; last5up?: boolean }) {
  const pts = o.vals.map((v: number) => ({ value: v, itemStyle: v >= o.target * 1.3 ? { color: C.red } : { color: C.blue } }))
  return { tooltip: { trigger: 'axis' }, grid: { left: 42, right: 18, top: 24, bottom: 28 },
    xAxis: { type: 'category', data: o.days.map(String) }, yAxis: { type: 'value', name: '不良率%' },
    series: [
      { type: 'line', data: pts, symbol: 'circle', symbolSize: 5, lineStyle: { color: C.blue, width: 2 },
        areaStyle: { color: 'rgba(30,77,139,.1)' },
        markLine: { silent: true, symbol: 'none', lineStyle: { type: 'dashed' }, data: [{ yAxis: o.target, lineStyle: { color: C.green }, label: { formatter: '目标' + o.target + '%', fontSize: 9, color: C.green } }] } },
      { type: 'line', data: [],
        markArea: o.last5up ? { silent: true, itemStyle: { color: 'rgba(192,57,43,.10)' }, data: [[{ xAxis: String(Math.max(1, o.vals.length - 4)) }, { xAxis: String(o.vals.length) }]] } : void 0 },
    ] }
}

export function comboOption(o: { xData: string[]; barData: number[]; barName: string; lineData: number[]; lineName: string }) {
  return { tooltip: { trigger: 'axis' }, legend: { data: [o.barName, o.lineName], bottom: 0 },
    grid: { left: 46, right: 46, top: 24, bottom: 40 },
    xAxis: { type: 'category', data: o.xData }, yAxis: [{ type: 'value', name: o.barName }, { type: 'value', name: o.lineName }],
    series: [
      { name: o.barName, type: 'bar', data: o.barData, barWidth: 30, itemStyle: { color: C.blue, borderRadius: [4,4,0,0] }, label: { show: true, position: 'top', formatter: '{c}%' } },
      { name: o.lineName, type: 'line', yAxisIndex: 1, data: o.lineData, symbol: 'circle', symbolSize: 8, lineStyle: { color: C.gold, width: 2 }, itemStyle: { color: C.gold } },
    ] }
}
