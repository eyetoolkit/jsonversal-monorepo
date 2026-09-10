---
name: "jsonversal-deploy-chain"
description: "固话 jsonversal 品牌矩阵（jsonversal.com + tools/sec/devops/codegen 子栏目）在 Cloudflare Pages + GitHub 的部署链路、项目映射、当前部署方式与已知缺口。当需要部署/更新站点、核实 CF Pages 项目或 jsonversal 源码与 Git 的连接时要调用。不涉及 tri-sites 与 mquickcalc 站点，那些走各自 skill。"
---

# jsonversal 部署链路（jsonversal-deploy-chain）

本技能固化「jsonversal 品牌矩阵」的部署链路与真实配置，供任意对话复用。**不含任何密钥明文**；凭据一律走已授权连接器（Cloudflare 插件 MCP / GitHub 插件 + gh CLI），不要在文档中保存 token。

## 当前状态（2026-09-10 实测 / 最新部署）

- **生产 `main` = `506af9a`** "fix(codegen): escape GitHub Actions expr in ci-workflow tool; add tool test harness + jsdom devDep"（上层 `c9fcea8` 文档更新）
- **线上**：`ci-workflow` 工具的 GH Actions 表达式转义修复已部署（curl 核验：转义 `$\{\{` 命中，未转义 `${{` 为 0）；全工具 `69` 个中 `65` 正常 + `4` 需上传外部文件（file-checksum/csr/x509-decoder/base64-image）
- 全站视觉已重设计：现代深色 + 渐变强调；共享组件 `Hero` / `ToolGrid`（可搜索）+ `tools-icons` 图标映射（70 项）已随 `packages/{ui,config}` 发布

## 站点结构（单域名 + 四子栏目）

所有页面由 Astro 静态生成，托管于 Cloudflare Pages `jsonversal-main-v2`。

| 路径 | 主题 | 线上 |
|---|---|---|
| `https://jsonversal.com/` | LLM / JSON 工程工具 | ✅ |
| `https://jsonversal.com/tools/` | JSON / LLM 工具（16 个） | ✅ |
| `https://jsonversal.com/sec/` | 安全工具（18 个） | ✅ |
| `https://jsonversal.com/devops/` | DevOps 工具（17 个） | ✅ |
| `https://jsonversal.com/codegen/` | 代码生成器（18 个） | ✅ |

> **子站已彻底删除**：`sec/devops/codegen.jsonversal.com` 三个旧子域及其 CF 项目 `*-v2`、DNS CNAME、monorepo 的 `apps/{sec,devops,codegen}` redirect 包均已删除，内容整合进主站子目录。

## 源码与 Git

- **Monorepo**：`eyetoolkit/jsonversal-monorepo`，生产分支 `main`。
  - 用户权威克隆：`c:\new\jsonversal-monorepo`
  - 助手沙箱克隆：`/workspace`（同一仓库，操作时以沙箱为准，推送前注意与用户本地 diff）
- **远端为 https**：`https://github.com/eyetoolkit/jsonversal-monorepo`（SSH `git@...` 已不作推送通道）。
- 结构：pnpm workspace + turbo；`apps/main` 为唯一 Astro 应用，含 `src/pages/{tools,sec,devops,codegen}/` 栏目落地页与工具目录页各 1 个，以及各工具详情页；`packages/{ui,config}`。
- 共享 UI 组件（`@versal/ui`）：`BaseLayout`、`Header`、`Footer`、`ToolCard`、`Hero`、`ToolGrid`；`@versal/config`：`tokens`、`sites`、`tools-icons`。
- 旧单仓库 `eyetoolkit/jsonversal` 已废弃。

## Cloudflare Pages 项目

**唯一生产项目：**

| 线上域名 | CF 项目 | 源/构建 | 产物目录 |
|---|---|---|---|
| jsonversal.com | `jsonversal-main-v2` | GitHub 集成 | `apps/main/dist` |

- 构建命令：`npx pnpm install && npx pnpm turbo run build --filter=@versal/site-main`，产物 `apps/main/dist`，框架 `astro`。
- 旧三子站项目 `jsonversal-sec-v2` / `-devops-v2` / `-codegen-v2` 及更早 direct-upload 四项目均已删除。

## 部署方式 = git push 自动构建

**更新站点 = 修改 monorepo + push `main`** → Cloudflare Pages 自动构建部署，无需手动上传。

### 流程（实测可用）

1. **改代码**：UI/工具改动 → `apps/main/src/pages/**`；共享样式/组件 → `packages/{ui,config}`。
2. **本地构建自检**：
   `npx pnpm install && npx pnpm turbo run build --filter=@versal/site-main`
3. **提交**：`git add <具体文件> && git commit`（只针对本次改动文件，勿 `git add -A`）。
4. **推送**：沙箱终端无 git https 凭据，需先用已认证的 `gh` 注入：
   `gh auth setup-git && git push origin main`
5. **核验线上**：调用 Cloudflare MCP 拉部署列表，确认最顶一条为 `github:push` + 目标 commit，状态由 `active` 轮询至 `success`。

### 注意事项
- 触发空构建：`git commit --allow-empty` + push（无法直接对失败部署 retry）。
- 改 commit 消息：`git commit --amend` + `git push --force-with-lease origin main`，会改变 hash 并重部署；**用户本地需 `git fetch && git reset --hard origin/main` 对齐**（避免与远端分叉）。
- commit 消息要语义准确，避免「查看部署状态」这类无关命名（曾因此返工改写）。

## Cloudflare 认证（有效通道）

- **Cloudflare 插件 MCP**：`mcp_trae-remote-official_plugin_cloudflare_cloudflare-api` 的 `execute` 无需自备 token——已预置认证与 `accountId`（账号：19820393768@139.com），脚本直接用 `accountId` 常量，勿硬编码。
- 授权失败：先 `RequestAuthorization`（service `trae-remote-official:cloudflare::cloudflare-api`）。

## GitHub 认证（有效通道）

- **`gh` CLI 已认证**（account `eyetoolkit`，`GH_TOKEN`，协议 https）→ `gh auth setup-git` 后可用 `git push`。
- 或走 GitHub 插件 MCP（`mcp_trae-remote-official_plugin_github_github`）。
- 授权失败：`RequestAuthorization`（service `trae-remote-official:github::github`）。

## 常用操作入口（Cloudflare execute 内调 cloudflare.request）

- 列项目：`GET /accounts/${accountId}/pages/projects`
- 查项目（domain/source/build_config/canonical_deployment）：`GET /accounts/${accountId}/pages/projects/jsonversal-main-v2`
- 查绑定域名：`GET .../pages/projects/jsonversal-main-v2/domains`
- 查部署历史：`GET .../pages/projects/jsonversal-main-v2/deployments`
- 查部署日志：`GET .../deployments/[id]/history/logs`
- 改构建配置：`PATCH .../pages/projects/jsonversal-main-v2` body `{ build_config: { build_command, destination_dir } }`

## DNS 记录（zone: 82591a57fa474a57fc21d26ea6e5c558）

| 名称 | 类型 | 指向 |
|---|---|---|
| jsonversal.com | CNAME | `jsonversal-main-v2.pages.dev` |
| www.jsonversal.com | CNAME | `jsonversal.com` |

（`sec/devops/codegen.jsonversal.com` 三条 CNAME 已删除。）

## 关键历史坑（避免重踩）

- ❌ **CF API 无法把 Direct Upload 项目改绑 GitHub**（8000069）：旧四项目 已作废删除，改用 `-v2` GitHub 集成。
- ❌ **redirect 项目 build 失败**：旧命令 `--filter=@versal/site-sec` 指向已删 turbo 包。随子站删除已不相关。
- ❌ **改动未同步生产分支**：曾误在非 `main` 分支提交，需 fast-forward/合并后再 push `main`。
- ✅ 当前仅一个生产项目 `jsonversal-main-v2`，四个栏目整合在内；子站三 CF 项目 + 三 DNS 记录 + 三 redirect 包均已删除。

## 注意事项

- 每轮先走 Cloudflare 插件 MCP 核验真实权限/配置，不要假定 token 可用（credentials.md 里那两串 CF token 已验证失效）。
- 验证写权限或改动线上资源时，优先「临时资源 + 用完即删」。
- 沙箱 `/workspace` 是临时克隆，推送前后与用户权威本地 `c:\new\jsonversal-monorepo` 保持 diff 一致，以防分叉。
- 本 skill 只覆盖 jsonversal 品牌矩阵；tri-sites（mathduel/boardduel/memoryduel）走 `tinysite-deploy-chain`；mathduel 细节走 `mathduel-site-manager`。