---
name: "jsonversal-deploy-chain"
description: "固话 jsonversal 品牌矩阵（jsonversal.com + sec/devops/codegen 子栏目）在 Cloudflare Pages + GitHub 的部署链路、项目映射、当前部署方式与已知缺口。当需要部署/更新站点、核实 CF Pages 项目或 jsonversal 源码与 Git 的连接时要调用。不涉及 tri-sites 与 mquickcalc 站点，那些走各自 skill。"
---

# jsonversal 部署链路（jsonversal-deploy-chain）

本技能固化「jsonversal 品牌矩阵」的部署链路与真实配置，供任意对话复用。**不含任何密钥明文**；凭据一律走已授权连接器（Cloudflare 插件 MCP），不要在文档中保存 token。

## 站点结构（2026-09-10 实测）

**单域名 + 四个子栏目架构**，所有页面由 Astro 静态生成，托管于 Cloudflare Pages。

| 路径 | 主题 | 线上状态 |
|---|---|---|
| `https://jsonversal.com/` | LLM / JSON 工程工具 | ✅ 线上 |
| `https://jsonversal.com/tools/` | JSON 工具（JSON→Zod/TS/Go/C#、LLM Token、JSON Schema、UUID v7 等 16 个） | ✅ |
| `https://jsonversal.com/sec/` | 安全工具（Hash、AES、BCrypt、HMAC、TOTP、RSA、X.509、CSP 等 18 个） | ✅ |
| `https://jsonversal.com/devops/` | DevOps 工具（YAML/JSON、Base64、CIDR、crontab、JWT、K8s、Nginx 等 17 个） | ✅ |
| `https://jsonversal.com/codegen/` | 代码/配置生成器（.gitignore、license、README、CI、Docker Compose、SQL 等 18 个） | ✅ |

> **子站已彻底删除（2026-09-10）**：三个旧子域 `sec/devops/codegen.jsonversal.com` 不再作为独立站点——对应的 CF Pages 项目 `*-v2`、DNS CNAME 记录、monorepo 中的 redirect 包 `apps/{sec,devops,codegen}` 已全部删除。内容全部整合进主站子目录 `/sec` `/devops` `/codegen`。

## 源码与 Git

- **Monorepo**：`c:\new\jsonversal-monorepo`（已克隆到本地），远端 `git@github.com:eyetoolkit/jsonversal-monorepo.git`，生产分支 `main`。
- pnpm workspace + turbo：`apps/main`（唯一 Astro 应用，含 `src/pages/{tools,sec,devops,codegen}/`）、`packages/{ui,config}`。无其他 apps。
- 旧单仓库 `eyetoolkit/jsonversal`（本地 `c:\new\jsonversal`）已废弃，被 monorepo 取代。

## Cloudflare Pages 项目（2026-09-10 实测）

**唯一生产项目：**

| 线上域名 | CF 项目 | 源/构建 | 产物目录 |
|---|---|---|---|
| jsonversal.com | `jsonversal-main-v2` | GitHub 集成 | `apps/main/dist` |

- 构建命令：`npx pnpm install && npx pnpm turbo run build --filter=@versal/site-main`，产物 `apps/main/dist`。
- 旧三子站项目 `jsonversal-sec-v2` / `-devops-v2` / `-codegen-v2` 已删除。

## 部署方式 = git push 自动构建

**更新站点 = 修改 monorepo + push 到 main**，Cloudflare Pages 自动构建部署，无需手动上传。

- 任何 UI/工具改动 → 改 `apps/main/src/pages/**` → push 即自动构建 `jsonversal-main-v2`。
- 触发空构建：`git commit --allow-empty` + push（无法直接 retry 失败部署）。

## Cloudflare 认证（有效通道）

- **Cloudflare 插件 MCP**：`mcp_plugin_Cloudflare_cloudflare-api` 的 `execute` 工具无需自备 token——已预置认证与 `accountId`（账号：19820393768@139.com），直接用脚本里的 `accountId` 常量。
- 若遇 MCP 授权失败：先调用 `RequestAuthorization`（service `trae-remote-official:cloudflare::cloudflare-api`）。
- 参考示例已在 MCP 工具描述给出，`accountId` 由工具预置，不要在脚本里硬编码。

## 常用操作入口（execute 内调用 cloudflare.request）

- 列项目：`GET /accounts/${accountId}/pages/projects`
- 查项目（含 domain、source、build_config、canonical_deployment）：`GET /accounts/${accountId}/pages/projects/[项目名]`
- 查已绑定域名：`GET /accounts/${accountId}/pages/projects/[项目名]/domains`
- 查部署历史：`GET /accounts/${accountId}/pages/projects/[项目名]/deployments`
- 查部署日志：`GET /accounts/${accountId}/pages/projects/[项目名]/deployments/[id]/history/logs`
- 改构建配置：`PATCH /accounts/${accountId}/pages/projects/[项目名]` body `{ build_config: { build_command, destination_dir } }`

## DNS 记录（zone: 82591a57fa474a57fc21d26ea6e5c558）

| 名称 | 类型 | 指向 |
|---|---|---|
| jsonversal.com | CNAME | `jsonversal-main-v2.pages.dev` |
| www.jsonversal.com | CNAME | `jsonversal.com` |

（`sec/devops/codegen.jsonversal.com` 三条 CNAME 已删除，不再解析。）

## 关键历史坑（避免重踩）

- ❌ **Cloudflare API 无法把 Direct Upload 项目改绑 GitHub**（8000069）。旧四项目（`jsonversal-main` 等 direct upload）已全部作废删除，改用 `-v2` GitHub 集成项目。
- ❌ **redirect 项目 build 失败**（曾发生）：旧构建命令 `--filter=@versal/site-sec` 指向已删除的 turbo 包（apps/sec 改名 `@versal/redirect-sec`）。该问题随子站删除已不再相关。
- ✅ 当前仅一个生产项目 `jsonversal-main-v2`，四个栏目都整合在内。子站三 CF 项目 + 三 DNS 记录 + monorepo 三个 redirect 包均已删除。

## 注意事项

- 每次都先走 Cloudflare 插件 MCP 核验真实权限/配置，不要假定静态 token 可用（credentials.md 里那两串 CF token 已确认失效）。
- 验证写权限或改动线上资源时，优先「临时资源 + 用完即删」，避免触碰生产站点。
- 本 skill 只覆盖 jsonversal 品牌矩阵；tri-sites（mathduel/boardduel/memoryduel）走 `tinysite-deploy-chain`；mathduel 细节走 `mathduel-site-manager`。