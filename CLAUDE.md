# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

康立质量过程管理系统 (Kangli QMS) frontend — Vue 3 + Vite 6 + TypeScript 5, Element Plus, VXE Table, ECharts. Covers FIA (首件检验 / first-article inspection), SPC (过程能力 / statistical process control), NCM (不良管理 / nonconformance), SQM (供应商质量 / supplier quality), plus asm / msm / tlm / qsm modules, overview, and system/UOP.

## ⚠️ Repository state — read before editing

- **The Vue project lives in `qms-web/`.** Run every command from there (`cd qms-web`). All paths below are relative to `qms-web/` unless noted. `package.json`, `vite.config.ts`, `src/` for the *real* project are inside `qms-web/`, not at the repo root.

## Package manager

CI (`.github/workflows/ci.yml`) and Husky hooks use **pnpm 9** (`pnpm install --frozen-lockfile`, `pnpm lint-staged`, `pnpm commitlint`), and CI expects `qms-web/pnpm-lock.yaml`. However the committed lockfile is currently `package-lock.json` (npm), so `pnpm install --frozen-lockfile` will fail in CI until a `pnpm-lock.yaml` is generated. Locally either works for `dev`; prefer **pnpm** to match CI. The scripts below work with `npm run …` or `pnpm …` interchangeably.

## Commands (run from `qms-web/`)

| Task | Command |
|------|---------|
| Dev server (port 5173, proxies `/api` → `http://localhost:8080`) | `pnpm dev` |
| Type-check + production build | `pnpm build` |
| Production build only (skips type-check) | `pnpm build:only` |
| TypeScript type-check | `pnpm type-check` |
| Lint + autofix (ESLint) | `pnpm lint` |
| Lint check only (no fix) | `pnpm lint:check` |
| Stylelint + autofix | `pnpm lint:style` |
| Prettier format / check | `pnpm format` / `pnpm format:check` |
| Unit tests (watch) | `pnpm test` |
| Unit tests (once) | `pnpm test:run` |
| Unit tests + coverage (80% thresholds enforced) | `pnpm test:cov` |
| E2E (Playwright, auto-starts dev server) | `pnpm test:e2e` |

Run a **single unit test**: `pnpm test:run tests/unit/format.test.ts` (filter by name: `pnpm test:run -t "pattern"`).
Run a **single E2E spec**: `pnpm exec playwright test tests/e2e/fia-entry.spec.ts` (UI mode: `pnpm exec playwright test --ui`).

## Architecture (big picture)

### App bootstrap order is load-bearing (`src/main.ts`)

The sequence in `main.ts` is intentional and must be preserved:
1. `app.use(createPinia())` — Pinia must be active before routing.
2. `app.use(router)` → `app.use(ElementPlus, { locale: zhCn, size: 'large' })` → `setupDirectives` → `setupI18n` → `authStore.restore()` → `useDictStore().preload()` → `app.mount`.
3. `buildDynamicRoutes(router)` is called from `router/guard.ts` `beforeEach` and `auth.login()` (not `main.ts`), registering dynamic routes before the first guarded navigation completes.

### Dynamic routing driven by a mock menu tree

Routes are built from `src/mock/system.ts` `MENU_TREE` (simulates the backend `sys_menu` table), not hardcoded. `src/router/dynamic.ts` `buildDynamicRoutes()` walks the tree and calls `router.addRoute`. Views are resolved by `import.meta.glob('@/views/**/*.vue')` mapping each menu item's `component` field (e.g. `'fia/Dash'`) to `/src/views/fia/Dash.vue`. Only `/login`, `/overview`, and the 404 catch-all are static (`src/router/index.ts`).

**To add a page:** create `src/views/<module>/Foo.vue`, then add a menu entry to `MENU_TREE` in `src/mock/system.ts` with `component: '<module>/Foo'`. When the backend is ready, swap the `getMockMenuTree(authStore.role)` data source for an API call.

### Auth + multi-company guard flow (`src/router/guard.ts`)

`beforeEach` enforces a 3-state funnel:
- not logged in → `/login`
- logged in but `!companyStore.hasSelected` → `/company-select` (forced company-context selection)
- logged in + company selected → proceed (visiting `/company-select` now redirects home)

Stores involved: `auth` (token/role/account/delegation/dataScope), `company` (multi-tenant context, see below), `permission` (RBAC codes; `'*'` is a wildcard granting all — mock grants `['*']`).

### Multi-company context (`src/stores/company.ts`)

After login, `auth.loginWithAccount(acc)` calls `companyStore.initFromAccount(acc)`, which seeds the account's linkable companies + per-company permission matrix but leaves `currentCompanyId` empty (forcing the `/company-select` step). Context is either a concrete `CompanyId` or `'GROUP'` (集团总览, group-wide read-only aggregate). Switching company/group via the top bar is **免重登** (no re-login): `switchCompany(id)` / `switchToGroup()`. Modules should read data scoped by the current company context.

### API layer — connected to real backend

`src/api/modules/*.ts` export service objects (e.g. `fiaApi`) whose methods call the real backend via `request.get/post/put/delete` — the function signatures are stable so views don't depend on backend DTO shapes. Each module uses adapter functions (e.g. `mapTask`, `mapKpi`) to transform backend DTOs into the app's own view-model types. Where the backend has no matching endpoint, methods return empty structures (never mock business data). `src/api/index.ts` barrel-exports all module APIs.

`src/utils/request.ts` is the axios wrapper: `baseURL = import.meta.env.VITE_API_BASE` (`/api`), request interceptor injects `Bearer` JWT from `localStorage['qms_token']` + an `X-Trace-Id`, response interceptor unwraps `res.data`, treats non-zero/non-200 `res.code` as a business error (toast + reject), and redirects to `/login` on 401. **ESLint ignores `src/api/**`** so the adapter scaffolding doesn't trip the strict TS rules.

Env vars (`.env.development` / `.env.production`): `VITE_API_BASE` (`/api`), `VITE_OSS_BASE`, `VITE_SSE_BASE`, `VITE_APP_TITLE`.

### Auto-imports — don't manually import Vue/Vue-Router/Pinia/VueUse APIs or components

`unplugin-auto-import` auto-imports `vue`, `vue-router`, `pinia`, `@vueuse/core` APIs (so `ref`/`computed`/`useRouter`/`defineStore`/`useStorage` etc. need no import). `unplugin-vue-components` auto-registers Element Plus components **and** anything under `src/components/`. The generated `src/types/auto-imports.d.ts`, `src/types/components.d.ts`, and `.eslintrc-auto-import.json` are gitignored — they regenerate on dev/build.

### Button-level permissions

`v-permission="'fia:approve'"` (or `v-permission="['fia:approve','fia:reject']"`) removes the element if the code isn't held by `usePermissionStore()` (registered globally in `src/directives/index.ts`). Check programmatically with `permissionStore.has(code)` / `hasAny(list)`.

### Dictionary preload

`useDictStore().preload()` runs at boot. It currently holds inline mock data (defect categories, processes, status enums, shift types); swap to an API fetch when backend is ready.

### UI terminology ESLint rule (project-specific)

`eslint-plugin-qms-terminology` defines `qms-term/no-forbidden-term: error` — UI-facing string literals, template literals, and attribute values must not contain tech jargon: `CRUD, DTO, VO, POJO, ORM, JPA, RPC, SKU, SPU, UUID, DAO, BO, PO, BFF`. Use plain Chinese industry terms in user-visible text. CI re-scans `src/locales/` with this rule explicitly. The plugin source is in `eslint-plugin-qms-terminology/` (ESLint-ignored).

### Styling

SCSS with `@use "@/styles/variables.scss" as *;` auto-injected into every SCSS block via Vite `css.preprocessorOptions` — use the variables directly, no import needed. Global theme in `src/styles/` (`reset.scss`, `workshop-theme.scss`). Element Plus is configured with `size: 'large'` and `zh-cn` locale. i18n (`vue-i18n`, composition mode) is wired up but zh-CN only for now.

### Path alias

`@` → `src/` (configured in `vite.config.ts`, `tsconfig.app.json`, and `vitest.config.ts`).

## Conventions

- **No `any`** — `@typescript-eslint/no-explicit-any: error`. Unused args must be prefixed `_`.
- `vue/multi-word-component-names` is off; single-word view filenames are allowed.
- Build (`pnpm build`) runs `vue-tsc --noEmit` first — type errors fail the build. Use `pnpm build:only` to skip.
- Commits follow Commitlint conventional types: `feat | fix | docs | style | refactor | perf | test | build | ci | chore | revert`. Husky `pre-commit` runs lint-staged (ESLint+Prettier on `*.{ts,tsx,vue,js}`, Stylelint on `*.{css,scss,vue}`, Prettier on `*.{json,md}`); `commit-msg` runs commitlint.
- Vitest coverage gates at 80% (statements/branches/functions/lines) on `src/**/*.{ts,vue}`, excluding `src/api/**`, `src/mock/**`, `src/types/**`, `*.d.ts`.

## CI (`.github/workflows/ci.yml`)

Runs on push/PR to `main`/`develop`, all steps `working-directory: qms-web`, pnpm 9 + Node 20: install `--frozen-lockfile` → `lint:check` → `lint:style` → `type-check` → `test:cov` → `build:only` → terminology re-scan on `src/locales/`.
