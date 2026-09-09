# jsonversal-monorepo

jsonversal 单体站 monorepo —— 一个主域名 + 四个子栏目（`/tools` `/sec` `/devops` `/codegen`），由 Astro 静态生成，Cloudflare Pages 托管。

## 站点结构

| 路径 | 主题 | 状态 |
|---|---|---|
| `https://jsonversal.com/` | LLM / JSON 工程化工具 | ✅ 线上 |
| `https://jsonversal.com/sec/` | 安全 / 加密工具（原 sec.jsonversal.com） | ✅ 线上 |
| `https://jsonversal.com/devops/` | DevOps / 云原生工具（原 devops.jsonversal.com） | ✅ 线上 |
| `https://jsonversal.com/codegen/` | 代码/配置文件生成器（原 codegen.jsonversal.com） | ✅ 线上 |

旧子域名 `sec/devops/codegen.jsonversal.com` 由各自的 Cloudflare Pages 项目通过 `_redirects` 301 跳转到对应子目录。

## 工具

- `/tools/` — JSON/LLM：JSON to Zod / TypeScript / Go / C#、LLM Token 计算、JSON Schema、UUID v7 等 16 个
- `/sec/` — 安全：Hash、AES、BCrypt、HMAC、TOTP、RSA、X.509、CSP 等 18 个
- `/devops/` — DevOps：YAML/JSON、Base64、CIDR、crontab、JWT、K8s、Nginx 等 17 个
- `/codegen/` — 生成器：.gitignore、license、README、CI、Docker Compose、SQL 等 18 个

## 架构

```
apps/
  main/       唯一 Astro 应用（src/pages/{tools,sec,devops,codegen}/）
  sec/        跳转项目：/* 301 → /sec/:splat
  devops/     跳转项目：/* 301 → /devops/:splat
  codegen/    跳转项目：/* 301 → /codegen/:splat
packages/
  ui/         共享组件（Header / Footer / Cookie 条 / 工具卡片 / BaseLayout）
  config/     设计 token + 各栏目 SEO 配置
```

## 本地开发

```bash
pnpm install
pnpm dev        # http://localhost:4320
```

## 部署

- 主站：Cloudflare Pages 项目 `jsonversal-main`（GitHub 集成，监听仓库推送自动构建）
- 跳转：3 个 Pages 项目仅部署 `public/_redirects`，构建命令为空操作
- 构建命令：`pnpm install && pnpm turbo run build --filter=@versal/site-main`，产物 `apps/main/dist`
