# jsonversal-monorepo

jsonversal 品牌矩阵 monorepo —— 一个主域名 + 四个子栏目（`/tools` `/sec` `/devops` `/codegen`），由 Astro 静态生成，Cloudflare Pages 托管。

## 站点结构

**单域名 + 四个子栏目架构**，所有内容整合在主站 `jsonversal.com` 下，由 Cloudflare Pages 项目 `jsonversal-main-v2` 托管（GitHub 集成，监听仓库推送自动构建）。

| 路径 | 主题 | 状态 |
|---|---|---|
| `https://jsonversal.com/` | LLM / JSON 工程化工具 | ✅ 线上 |
| `https://jsonversal.com/sec/` | 安全 / 加密工具 | ✅ 线上 |
| `https://jsonversal.com/devops/` | DevOps / 云原生工具 | ✅ 线上 |
| `https://jsonversal.com/codegen/` | 代码/配置文件生成器 | ✅ 线上 |

> **子站已彻底移除（2026-09-10）**：旧子域 `sec/devops/codegen.jsonversal.com` 不再作为独立站点。其 Cloudflare Pages 项目、DNS CNAME 记录、以及本仓库中的 redirect 包 `apps/{sec,devops,codegen}` 已全部删除。旧子域现已不可解析。

## 工具

- `/tools/` — JSON/LLM：JSON to Zod / TypeScript / Go / C#、LLM Token 计算、JSON Schema、UUID v7 等 16 个
- `/sec/` — 安全：Hash、AES、BCrypt、HMAC、TOTP、RSA、X.509、CSP 等 18 个
- `/devops/` — DevOps：YAML/JSON、Base64、CIDR、crontab、JWT、K8s、Nginx 等 17 个
- `/codegen/` — 生成器：.gitignore、license、README、CI、Docker Compose、SQL 等 18 个

## 架构

```
apps/
  main/       唯一 Astro 应用（src/pages/{tools,sec,devops,codegen}/）
packages/
  ui/         共享组件（Header / Footer / Cookie 条 / 工具卡片 / BaseLayout）
  config/     设计 token + 各栏目 SEO 配置
```

## 本地开发

```bash
pnpm install
pnpm dev        # http://localhost:4320
pnpm build:main # 仅构建主站，输出 apps/main/dist
```

## 部署（git push 自动构建）

- 唯一生产项目：Cloudflare Pages `jsonversal-main-v2`（GitHub 集成 `eyetoolkit/jsonversal-monorepo`，生产分支 `main`）
- 构建命令：`npx pnpm install && npx pnpm turbo run build --filter=@versal/site-main`，产物 `apps/main/dist`
- 更新站点 = 修改 `apps/main/**` → `git push origin main` → 自动构建部署，无需手动上传

## CI

- **PR pre-check**：`.github/workflows/pr-check.yml` — 任何 PR 打开 / 同步 / 重开时自动跑 `pnpm install + pnpm build + toolcheck`
- **push main**：由 Cloudflare Pages GitHub App 集成直接构建部署

<!-- trigger rebuild probe: 2026-09-17T13:50Z -->
<!-- test-pr-pre-check: 2026-09-17T21:59Z -->
