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
