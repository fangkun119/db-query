## Phase 3

### Bug 3.001 页面空白 — React 未渲染 (前端)

| 项目 | 内容 | 调试过程 |
|------|------|----------|
| 现象 | 浏览器访问 localhost:5173 页面空白，`#root` 内无内容 | 用 Playwright 打开页面，`browser_snapshot` 返回空；`evaluate` 检查 `document.getElementById('root').innerHTML` 为空字符串，`window.React` 为 undefined，确认 JS 未执行 |
| 原因 | 修改 `main.tsx` 移除 Refine 遥测时，误删 `createRoot().render()` 调用，React 应用未挂载 | 回顾修改记录：此前为禁用遥测重写了整个 `main.tsx`，只定义并 export 了 `App` 组件，但遗漏了 `createRoot` 挂载调用；对比 git diff 确认删除了 render 相关行 |
| 修复 | 恢复 `createRoot(document.getElementById('root')!).render(...)` | 重新写入包含 `createRoot` + `StrictMode` 包裹的完整渲染入口；Playwright 验证 `root` 内出现 DOM 节点、页面标题正确渲染 |

### Bug 3.002 路由未配置 — 页面始终显示占位符 (前端)

| 项目 | 内容 | 调试过程 |
|------|------|----------|
| 现象 | 页面仅显示 "Database List (placeholder)" 和 "Schema Tree (placeholder)" | Playwright `browser_snapshot` 返回 "Database List (placeholder)" 文本；检查 URL 仍为 `/`，未跳转到 `/databases`，说明路由未生效 |
| 原因 | `AppLayout` 组件硬编码占位符文本；`main.tsx` 无 `Routes`/`Route` 定义 | 1. `Read app-layout.tsx` 发现 `<div>Database List (placeholder)</div>` 硬编码；2. `Read main.tsx` 确认只有 `<Refine>` 包裹 `<AppLayout>` 的 children，没有 `<Routes>` 或 `<Route>` 配置；3. 对比 tasks.md T015 要求 "route definitions for / and /dbs/:name"，发现路由配置缺失 |
| 修复 | AppLayout 改为纯布局容器 `{children}`；main.tsx 添加 `<Routes>` 配置 `/` → `/databases`、`/databases` → DatabasesPage、`/dbs/:name` → DatabaseDetailPage | 修改 AppLayout 移除所有占位符，只保留 `{children}` 槽位；在 main.tsx 的 Refine 内部插入 `<BrowserRouter><Routes><Route>` 三层嵌套路由；Playwright 验证访问 `/` 自动重定向到 `/databases`，页面显示 "添加数据库" 按钮 |

### Bug 3.003 API 404 — GET /api/v1/dbs 返回 "连接 'dbs' 不存在" (后端)

| 项目 | 内容 | 调试过程 |
|------|------|----------|
| 现象 | 前端调用 `GET /api/v1/dbs` 返回 404，后端日志显示将其匹配到 `/{name}` 路由 | 1. Playwright 控制台报 `GET /api/v1/dbs 404`；2. `curl http://localhost:8000/api/v1/dbs` 返回 `{"detail":"连接 'dbs' 不存在"}` — 说明请求确实到达后端，但被错误路由处理 |
| 原因 | `APIRouter()` 无 prefix，`@router.get("/{name}")` 将 `dbs` 当作 name 参数捕获，`@router.get("")` 永远无法命中 | 1. 检查 `main.py`：`include_router(databases.router, prefix="/api/v1")` — 主前缀正确；2. 检查 `databases.py`：`router = APIRouter()` 无 prefix，路由定义为 `@router.get("/{name}")` 和 `@router.get("")`；3. FastAPI 按注册顺序匹配，`/{name}` 先注册，`dbs` 被当作 name 参数匹配，列表路由 `""` 永远不会命中；4. 确认根因：路由器缺少 `/dbs` 前缀 |
| 修复 | `router = APIRouter(prefix="/dbs")`，路由变为 `GET /dbs`、`GET /dbs/{name}` 等 | 修改后 `curl http://localhost:8000/api/v1/dbs` 返回 `[]` 空数组（正确）；Playwright 验证前端无 404 错误 |

### Bug 3.004 Pydantic 嵌套模型验证失败 — refresh 返回 500 (后端)

| 项目 | 内容 | 调试过程 |
|------|------|----------|
| 现象 | `POST /dbs/{name}/refresh` 返回 500 Internal Server Error | 1. Playwright 点击刷新按钮后页面无变化；2. `curl -X POST /dbs/local-postgres/refresh` 返回 "Internal Server Error"；3. 查看后端 uvicorn 日志，定位到 `pydantic_core._pydantic_core.ValidationError: Input should be a valid dictionary or instance of TableMetadataResponse` |
| 原因 | `DatabaseDetailResponse(tables=[TableMetadataResponse(...)])` 直接传入 Pydantic 模型实例，Pydantic v2 要求 dict 或已注册类型 | 阅读错误堆栈：`metadata.py:212` 行 `DatabaseDetailResponse(tables=tables)` 报错，`tables` 列表元素是 `TableMetadataResponse` 实例；Pydantic v2 严格模式下，嵌套模型需要传入 dict 或通过 model_validate 注册的类型，直接传实例不被识别 |
| 修复 | 将 tables 列表中的 `TableMetadataResponse(...)` 改为 `{"schema_name": ..., "table_name": ...}` 字典构造 | 重写 `metadata.py` 的 response 构建部分，用字典替代模型实例；`curl` 验证 refresh API 返回完整 JSON（含 tables、columns），Playwright 验证 Schema 树正确展开显示 |

### Bug 3.005 Ant Design v5 与 React 19 不兼容 (依赖)

| 项目 | 内容 | 调试过程 |
|------|------|----------|
| 现象 | 控制台警告 `antd v5 support React is 16 ~ 18` | Playwright `browser_console_messages` 显示 `[antd: compatible] antd v5 support React is 16 ~ 18` 警告 |
| 原因 | antd@5.x 官方仅支持 React 16-18，项目使用 React 19 | 1. 检查 `package.json`：`react: ^19.2.5`、`antd: ^5.29.3`；2. 运行 `npm view antd version` 查到最新版为 6.3.7；3. 查阅 antd 官方文档确认 v6 支持 React 19 |
| 修复 | `npm install antd@latest` 升级至 antd@6.3.7；添加 `overrides: { "antd": "^6.3.7" }` 强制所有依赖统一版本 | 1. `npm list antd` 发现 `@refinedev/antd` 仍依赖 antd@5.29.3，存在两个版本；2. 在 package.json `overrides` 中添加 `"antd": "^6.3.7"`；3. `npm install` 后验证所有 antd 引用统一为 6.3.7；4. 清除 Vite 缓存 `rm -rf node_modules/.vite`，重启开发服务器 |

### Bug 3.006 Space 组件 `direction` 属性弃用 (前端)

| 项目 | 内容 | 调试过程 |
|------|------|----------|
| 现象 | 控制台警告 `[antd: Space] direction is deprecated. Please use orientation instead.` | Playwright 控制台日志显示 `Warning: [antd: Space] direction is deprecated`，堆栈指向 `databases.tsx:54` |
| 原因 | antd v6 将 Space 的 `direction` 重命名为 `orientation` | 警告信息已明确提示替换方案；`grep -r "direction=" src/` 扫出 4 个文件共 5 处使用 |
| 修复 | 全局替换 4 个文件中 `direction="vertical"` → `orientation="vertical"` | 涉及文件：`databases.tsx`、`database-list.tsx`、`database-form.tsx`、`database-detail.tsx`（2处）；替换后 `grep` 验证无遗漏 |

### Bug 3.007 Vite CSP 阻止 eval 和外部图片 (配置)

| 项目 | 内容 | 调试过程 |
|------|------|----------|
| 现象 | 浏览器报 CSP 错误阻止 `eval` 和 `telemetry.refine.dev` 图片加载 | 用户反馈两条 CSP 报错：1. `blocks the use of 'eval' in JavaScript`；2. `Loading the image 'telemetry.refine.dev' violates CSP directive` |
| 原因 | Vite HMR 使用 `eval`；Refine 遥测加载外部图片；默认 CSP 不允许 | 1. CSP eval 错误：Vite 开发模式下 HMR 通过 `eval` 实现热更新，这在严格 CSP 下被阻止；2. 图片加载错误：Refine 默认启用遥测，向 `telemetry.refine.dev` 发送数据（通过 1px 图片），URL 不在 CSP `img-src` 白名单中；3. 检查 `vite.config.ts` 无 CSP 配置，`index.html` 也无 CSP meta 标签 |
| 修复 | vite.config.ts 添加 `headers.Content-Security-Policy` 含 `unsafe-eval` 和 `img-src`；同时设置 `telemetry: false` 禁用遥测 | 双管齐下：1. vite.config.ts `server.headers` 添加 CSP 头，`script-src` 含 `unsafe-eval`，`img-src` 含 `telemetry.refine.dev`；2. main.tsx Refine options 添加 `telemetry: false` 从源头禁用遥测请求；重启开发服务器后 CSP 错误消失 |

## Pre-Phase 4

### Bug Pre-4.001 返回按钮导航到错误路由 (前端)

| 项目 | 内容 | 调试过程 |
|------|------|----------|
| 现象 | 数据库详情页点击返回按钮后，URL 变为 `/dbs`，页面显示 "数据库不存在" 而非列表页 | Playwright E2E 测试第 7 步：点击详情页返回按钮后，`browser_snapshot` 显示空白页面而非数据库列表；检查 URL 为 `/dbs` 而非 `/databases` |
| 原因 | `database-detail.tsx` 第 52 行 `handleBack` 函数中 `navigate('/dbs')` 硬编码了错误路径 | 1. Playwright 点击返回按钮后检查 URL 为 `/dbs`；2. `Read database-detail.tsx` 定位到 `handleBack` → `navigate('/dbs')`；3. 对比 `main.tsx` 路由配置：列表页路由为 `/databases` 而非 `/dbs`；4. `/dbs/:name` 是详情页路由，`/dbs` 不匹配任何已注册路由，React Router 渲染空状态 |
| 修复 | `navigate('/dbs')` → `navigate('/databases')` | 修改后 Playwright 验证：点击返回按钮 → URL 变为 `/databases` → 页面正确显示数据库列表 |

## Phase 4

### Bug Ph4-001 重复导出导致模块加载失败 (前端)

| 项目 | 内容 | 调试过程 |
|------|------|----------|
| 现象 | 浏览器控制台错误 `Duplicate export of 'SqlEditor'`，Monaco 编辑器无法加载 | 1. Playwright 打开数据库详情页，`browser_console_messages` 返回 `Error: Duplicate export of 'SqlEditor'`；2. 同时出现 `Duplicate export of 'ResultTable'`；3. 页面空白，Schema 树渲染但编辑器区域无内容 |
| 原因 | `components/editor/index.ts` 和 `components/results/index.ts` 中存在重复导出语句 | 1. `grep -rn "export.*SqlEditor" src/` 发现 `index.ts` 同时包含 `export { SqlEditor }` 和 `export { default as SqlEditor }`；2. 两条语句导出同名标识符，ES Module 规范视为重复定义错误；3. 检查 `sql-editor.tsx` 确认同时存在 `export const SqlEditor` 和 `export default SqlEditor`，导致 index.ts 的两种导出方式冲突 |
| 修复 | 移除 `export { default as X }` 形式的重复导出，只保留命名导出 | 1. `components/editor/index.ts` 只保留 `export { SqlEditor } from './sql-editor'`；2. `components/results/index.ts` 只保留 `export { ResultTable } from './result-table'`；3. 修改后 Vite 热更新，控制台错误消失，Monaco 编辑器正常渲染 |

### Bug Ph4-002 CSP 配置阻止 Monaco CDN 加载 (前端)

| 项目 | 内容 | 调试过程 |
|------|------|----------|
| 现象 | Monaco 编辑器区域显示占位符，控制台错误 `Loading the script 'https://cdn.jsdelivr.net/npm/monaco-editor@0.55.1/min/vs/loader.js' violates CSP` | 1. 测试 E2E 流程，数据库详情页加载后 Schema 树正常，但编辑器区域无内容；2. `browser_console_messages` 显示 CSP 违规错误，指出 `script-src` 指令不允许 `cdn.jsdelivr.net`；3. `curl -I http://localhost:5173/` 检查响应头，确认 CSP 为 `script-src 'self' 'unsafe-eval' 'unsafe-inline'`（不含 CDN） |
| 原因 | vite.config.ts 的 CSP 配置未包含 Monaco CDN，`script-src-elem` 未显式设置 | 1. `@monaco-editor/react` 默认从 `cdn.jsdelivr.net` 加载 Monaco 运行时；2. 检查 `vite.config.ts`，`Content-Security-Policy` 中 `script-src` 不含 CDN URL；3. 浏览器解析 CSP 时，`script-src-elem` 未显式设置则回退到 `script-src`，导致外部脚本被阻止；4. 错误消息明确提示 `script-src-elem was not explicitly set` |
| 修复 | 更新 vite.config.ts，添加 `script-src-elem` 指令并包含 `https://cdn.jsdelivr.net` | 1. 修改 CSP 为单行字符串，包含 `script-src-elem 'self' 'unsafe-inline' https://cdn.jsdelivr.net`；2. 同时添加 `worker-src 'self' blob:` 和 `child-src 'self' blob:` 支持 Monaco Web Worker；3. 添加 `connect-src` 和 `font-src` 包含 CDN 以防其他资源加载失败；4. 重启 Vite 服务器，`curl` 验证 CSP 头正确更新，Playwright 验证 Monaco 编辑器正常加载 |

### Phase 4 回归测试验证 ✅ (2026-05-01)

| 测试项 | 结果 | 说明 |
|--------|------|------|
| 数据库删除重建 | ✅ | interview_db 重建成功（14表，2视图） |
| 后端健康检查 | ✅ | API 响应正常 |
| 添加数据库连接 | ✅ | 连接已存在（正确处理） |
| 列出数据库 | ✅ | 返回 2 个连接 |
| 基本 SELECT 查询 | ✅ | 返回 3 行，执行时间 14.96ms |
| LIMIT 自动注入 | ✅ | isTruncated=true 正确标记 |
| DELETE 拒绝 | ✅ | 返回 400 错误 |
| JOIN 查询 | ✅ | 聚合结果正确 |
| 前端列表页 | ✅ | 显示 2 个数据库连接 |
| 前端详情页 | ✅ | Schema 树显示 16+3 表/视图 |
| Monaco 编辑器 | ✅ | SQL 语法高亮正常 |
| 查询执行 | ✅ | `SELECT * FROM departments LIMIT 2` 成功 |
| 结果表格 | ✅ | 显示 2 行，列名正确 |
| 控制台 | ✅ | 0 errors, 0 warnings |

**无新 Bug 发现 - Phase 4 功能稳定运行**

