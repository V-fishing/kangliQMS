# 康立质量过程管理系统（QMS）前端

康立质量过程管理系统（QMS）前端仓库，基于 Vue 3 + Vite + TypeScript 构建。覆盖从首件检验、过程控制、不良管理到供应商质量、售后、工装、计量、体系管理的全链路质量过程，并内置多分公司组织与权限（UOP）能力。

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
| 流程 / 签名 | bpmn-js、signature_pad |
| 二维码 / 条码 | qrcode、jsbarcode、@zxing/library |
| 离线存储 | Dexie |
| 测试 | Vitest + Playwright |
| 代码规范 | ESLint 9 + Prettier 3 + Stylelint 16 + Commitlint |

---

## 目录结构

```
kangliQMS/                        # git clone 后的仓库根目录
├── README.md
├── CLAUDE.md                     # Claude Code 操作指引
├── 康立QMS-完整版.html           # 早期静态原型（仅供参考）
└── qms-web/                      # Vue 3 前端主工程
    ├── public/                   # 静态资源
    ├── src/
    │   ├── api/                 # HTTP 接口封装（当前为 Mock 占位）
    │   ├── components/          # 通用业务组件（图表 / 表单 / 工作流 / 追溯等）
    │   ├── directives/          # 自定义指令（v-permission 等）
    │   ├── layouts/             # 页面布局
    │   ├── locales/             # 国际化（一期仅中文）
    │   ├── mock/                # 本地 Mock 数据
    │   ├── router/              # 静态路由 + 动态路由 + 守卫
    │   ├── stores/              # Pinia Store（auth / company / dict / permission 等）
    │   ├── styles/              # 全局样式与车间主题
    │   ├── types/               # TypeScript 类型定义
    │   ├── utils/               # 工具函数（request / sse / crypto / format / echarts）
    │   ├── views/               # 页面视图（按模块组织）
    │   ├── App.vue
    │   └── main.ts
    ├── tests/                   # 单元测试 / E2E 测试
    ├── index.html
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    └── vitest.config.ts
```

> 所有源码与开发命令均位于 `qms-web/` 子目录下，请在该目录中执行下方命令。

---

## 环境要求

- Node.js >= 20
- 包管理器：pnpm 9（CI 使用，推荐）或 npm >= 10
- 浏览器：Chrome / Edge / Firefox 最新版

---

## 快速开始

```bash
# 进入前端工程目录（所有命令均在此目录下执行）
cd kangliQMS/qms-web

# 安装依赖（二选一）
pnpm install        # 推荐，与 CI 一致
npm install

# 启动开发服务器（默认 http://localhost:5173）
pnpm dev            # 或 npm run dev

# 生产构建
pnpm build          # 或 npm run build

# 预览构建产物
pnpm preview
```

开发服务器启动后：

- 前端地址：`http://localhost:5173`
- 接口代理：`/api` -> `http://localhost:8080`（后端服务地址，可在 `vite.config.ts` 中修改）
- 环境变量：`.env.development` / `.env.production`（`VITE_API_BASE`、`VITE_OSS_BASE`、`VITE_SSE_BASE`）

> 接口层已对接真实后端（`src/api/modules/*.ts` 通过 `src/utils/request.ts` 调用后端 `/api/v1/...` 接口）。完整运行需先启动后端服务（见后端仓库 README）;后端未就绪时，相关页面会因接口无响应而显示空数据，但前端工程本身可独立构建。

---

## 常用脚本

| 脚本 | 说明 |
|------|------|
| `pnpm dev` | 启动 Vite 开发服务器 |
| `pnpm build` | 类型检查 + 生产构建 |
| `pnpm build:only` | 仅生产构建（跳过类型检查） |
| `pnpm type-check` | TypeScript 类型检查 |
| `pnpm lint` | ESLint 自动修复 |
| `pnpm lint:check` | ESLint 检查（不修复） |
| `pnpm lint:style` | Stylelint 自动修复 |
| `pnpm format` | Prettier 格式化 |
| `pnpm test` | Vitest 测试（watch 模式） |
| `pnpm test:run` | 单次运行单元测试 |
| `pnpm test:cov` | 单元测试 + 覆盖率（阈值 80%） |
| `pnpm test:e2e` | Playwright E2E 测试（自动拉起开发服务器） |

运行单个测试：

```bash
pnpm test:run tests/unit/format.test.ts                   # 指定文件
pnpm test:run -t "用例名"                                  # 按名称过滤
pnpm exec playwright test tests/e2e/fia-entry.spec.ts     # 单个 E2E
```

---

## 架构概览

### 启动流程（`src/main.ts`）

启动顺序存在依赖、不可随意调整：安装 Pinia → `buildDynamicRoutes(router)` → `app.use(router)` → Element Plus → 指令 / i18n → 字典预取 → 挂载。动态路由必须在路由安装前注册，否则刷新页面会因初始导航先于路由注册而落到 404。

### 动态路由

路由由 `src/mock/system.ts` 的菜单树 `MENU_TREE`（模拟后端 `sys_menu`）驱动，`src/router/dynamic.ts` 通过 `router.addRoute` 构建。视图通过 `import.meta.glob('@/views/**/*.vue')` 按菜单 `component` 字段懒加载映射（如 `fia/Dash` → `src/views/fia/Dash.vue`）。新增页面只需：在 `src/views/<模块>/` 下新建 `.vue`，并在 `MENU_TREE` 增加对应菜单项。

### 鉴权与多分公司

`src/router/guard.ts` 实现三态流转：未登录 → `/login`；已登录未选公司 → `/company-select`；已登录已选公司 → 正常放行。`companyStore` 维护公司上下文（具体公司或 `GROUP` 集团总览），支持顶栏免重登切换公司 / 集团。

### 接口层（已对接真实后端）

`src/api/modules/*.ts` 各方法通过 `src/utils/request.ts` 封装的 `request.get/post/...` 调用后端 `/api/v1/...` 接口，函数签名稳定、视图不直接依赖后端 DTO 形状。`request.ts` 统一处理 JWT 注入、`X-Trace-Id`、业务码（`R<T>={code,msg,data}`，`code=0` 成功）、401 跳登录。后端暂无对应接口的项返回空结构兜底，绝不返回 Mock 业务数据。

### 其他要点

- **按需自动导入**：`unplugin-auto-import` 自动导入 Vue / Vue-Router / Pinia / VueUse API；`unplugin-vue-components` 自动注册 Element Plus 与 `src/components` 下组件，无需手动 import。
- **按钮级权限**：`v-permission="'fia:approve'"` 指令按权限码控制元素显隐。
- **UI 术语规范**：自定义 ESLint 规则 `qms-term/no-forbidden-term` 禁止 UI 文案出现技术黑话（CRUD / DTO / VO 等），需使用行业通用中文。

---

## 模块说明

| 模块 | 路径 | 说明 |
|------|------|------|
| FIA | `views/fia` | 首件检验 |
| SPC | `views/spc` | 统计过程控制 / 过程能力 |
| NCM | `views/ncm` | 不合格品 / 不良管理 |
| SQM | `views/sqm` | 供应商质量管理 |
| Archive | `views/archive` | 检验记录归档与查询 |
| ASM | `views/asm` | 售后管理 |
| TLM | `views/tlm` | 工装管理 |
| MSM | `views/msm` | 计量管理 |
| QSM | `views/qsm` | 体系管理 |
| Overview | `views/overview` | 概览总览 / 集团 KPI 对比 |
| System (UOP) | `views/system` | 用户组织 / 角色权限 / 配置中心 |

---

## 代码规范

- TypeScript 严格模式，禁止 `any`（`@typescript-eslint/no-explicit-any: error`）。
- 提交信息遵循 Commitlint 约定式提交：`feat | fix | docs | style | refactor | perf | test | build | ci | chore | revert`。
- Husky 钩子：`pre-commit` 执行 lint-staged（ESLint + Prettier + Stylelint），`commit-msg` 执行 commitlint。

```bash
git commit -m "feat: 新增 FIA 任务列表页"
```

---

## 相关文档

| 文档 | 位置 |
|------|------|
| 软件需求规格说明书 | `后端构建文档/康立QMS-SRS-V1.0.md` |
| 数据库设计 | `后端构建文档/QMS-数据库设计-V1.0.md` |
| 多分公司设计方案 | `后端构建文档/QMS-多分公司设计方案.md` |
| 后端接口设计 | `后端构建文档/QMS-后端接口设计-V1.0.md` |
| 技术选型与部署方案 | `后端构建文档/QMS-技术选型与部署方案-V1.5.md` |
| 代码规范 | `后端构建文档/QMS-代码规范文档-V1.0.md` |

> 上述文档位于后端构建文档目录，不在本前端仓库内。

---

## CI

`.github/workflows/ci.yml` 在 push / PR 到 `main` / `develop` 时触发，使用 pnpm 9 + Node 20，依次执行：依赖安装 → `lint:check` → `lint:style` → `type-check` → `test:cov` → `build:only` → 术语规则复扫 `src/locales/`。

---

## 源码托管

- 仓库：`https://github.com/V-fishing/kangliQMS.git`
- 克隆：
  ```bash
  git clone https://github.com/V-fishing/kangliQMS.git
  cd kangliQMS/qms-web
  ```
- 提交信息遵循 Commitlint 约定式提交（见上节）。本仓库已配置 `.gitignore`，自动忽略 `node_modules/`、`dist/`、`*.log`、`.env.local`、`.eslintcache` 等依赖、构建产物与本地文件，**不会**提交 `node_modules` 与本地环境覆盖配置。

---

## 许可证

内部项目，版权归深圳康立生物医疗电子股份有限公司所有。
