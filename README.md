# 康立质量过程管理系统（QMS）前端

康立质量过程管理系统（QMS）前端仓库，一期覆盖 **FIA（首件检验）、SPC（统计过程控制）、NCM（不合格品管理）、SQM（供应商质量管理）** 及 **UOP（统一组织与权限）** 模块。

---

## 技术栈

| 类别 | 选型 |
|------|------|
| 框架 | Vue 3 + Vite 6 + TypeScript 5 |
| 状态管理 | Pinia 2 |
| 路由 | Vue Router 4 |
| UI 组件库 | Element Plus 2 |
| 表格组件 | VXE Table 4 |
| 图表 | ECharts 5 |
| 网络请求 | Axios |
| 日期处理 | Day.js |
| 流程/签名 | bpmn-js、signature_pad |
| 二维码/条码 | qrcode、jsbarcode、@zxing/library |
| 测试 | Vitest + Playwright |
| 代码规范 | ESLint 9 + Prettier 3 + Stylelint 16 + Commitlint |

---

## 目录结构

```
QMS-fronted/
├── .gitignore
├── README.md
├── 康立QMS-完整版.html          # 早期原型文件（静态 HTML）
└── qms-web/                     # Vue 3 前端主工程
    ├── public/                  # 静态资源
    ├── src/
    │   ├── api/                 # HTTP 接口封装
    │   ├── components/          # 通用业务组件
    │   ├── directives/          # 自定义指令
    │   ├── layouts/             # 页面布局
    │   ├── locales/             # 国际化
    │   ├── mock/                # 本地 Mock 数据
    │   ├── router/              # 路由配置
    │   ├── stores/              # Pinia Store
    │   ├── styles/              # 全局样式
    │   ├── types/               # TypeScript 类型定义
    │   ├── utils/               # 工具函数
    │   ├── views/               # 页面视图
    │   ├── App.vue
    │   └── main.ts
    ├── tests/                   # 单元测试 / E2E 测试
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    └── vitest.config.ts
```

---

## 环境要求

- Node.js >= 20
- npm >= 10 或兼容包管理器
- 浏览器：Chrome / Edge / Firefox 最新版

---

## 快速开始

```bash
# 进入前端工程目录
cd QMS-fronted/qms-web

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 生产构建
npm run build

# 构建产物预览
npm run preview
```

---

## 常用脚本

| 脚本 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run build:only` | 仅生产构建（不跑类型检查） |
| `npm run preview` | 预览生产构建产物 |
| `npm run type-check` | 运行 TypeScript 类型检查 |
| `npm run lint` | ESLint 自动修复 |
| `npm run lint:check` | ESLint 检查 |
| `npm run lint:style` | Stylelint 自动修复 |
| `npm run format` | Prettier 格式化 |
| `npm run format:check` | Prettier 格式检查 |
| `npm run test` | 运行 Vitest 测试（watch 模式） |
| `npm run test:run` | 单次运行单元测试 |
| `npm run test:cov` | 运行测试并生成覆盖率报告 |
| `npm run test:e2e` | 运行 Playwright E2E 测试 |

---

## 代码规范

本项目遵循康立 QMS 代码规范，详见仓库根目录下的规范文档：

- `规范/QMS-代码规范文档-V1.0.md`

提交信息建议使用 Commitlint 规范：

```bash
git commit -m "feat: 新增 FIA 任务列表页"
```

---

## 后端接口

后端接口契约文档位于项目后端构建文档目录：

- `后端构建文档/QMS-后端接口设计-V1.0.md`

开发阶段可结合 `src/mock/` 下的本地 Mock 数据联调。

---

## 相关文档

| 文档 | 位置 |
|------|------|
| 软件需求规格说明书 | `后端构建文档/康立QMS-SRS-V1.0.md` |
| 数据库设计 | `后端构建文档/QMS-数据库设计-V1.0.md` |
| 多分公司数据库设计 | `后端构建文档/QMS-多分公司数据库设计-V1.0.md` |
| 多分公司设计方案 | `后端构建文档/QMS-多分公司设计方案.md` |
| 后端接口设计 | `后端构建文档/QMS-后端接口设计-V1.0.md` |
| 技术选型与部署方案 | `后端构建文档/QMS-技术选型与部署方案-V1.5.md` |
| DDL 增量清单与枚举对齐 | `后端构建文档/QMS-后端开工前DDL增量清单与枚举对齐决策表-V1.1.md` |
| 代码规范 | `后端构建文档/QMS-代码规范文档-V1.0.md` |

---

## 一期范围

- FIA 首件检验
- SPC 统计过程控制
- NCM 不合格品管理
- SQM 供应商质量管理
- UOP 统一组织与权限
- 公共能力（字典、公司、审计、电子签名等）

---

## 许可证

内部项目，版权归深圳康立生物医疗电子股份有限公司所有。
