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
  - 当前工作区：`E:\TRAE\jsonversal-monorepo`（2026-09-10 起为权威本地克隆）
  - 历史路径 `c:\new\jsonversal-monorepo`、Trae 沙箱 `/workspace` 均已作废，看到即视为过期信息
- **远端为 SSH**：`git@github.com:eyetoolkit/jsonversal-monorepo.git`（非 https）。
  - 本机 Git Bash 下 `git ls-remote origin` 可能静默无输出（SSH key 未加载），核对远端 HEAD 优先用 GitHub 插件 MCP 的 `list_commits`。
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
4. **推送**：⚠️ 当前 **SSH 通道不通、`gh` 未安装** —— 推送前先按下方「GitHub 认证」小节的修复方案 1 或 2 打通通道，否则 `git push` 必然失败。
5. **核验线上**：调用 Cloudflare MCP 拉部署列表，确认最顶一条为 `github:push` + 目标 commit，状态由 `active` 轮询至 `success`。

### 注意事项
- 触发空构建：`git commit --allow-empty` + push（无法直接对失败部署 retry）。
- 改 commit 消息：`git commit --amend` + `git push --force-with-lease origin main`，会改变 hash 并重部署；**用户本地需 `git fetch && git reset --hard origin/main` 对齐**（避免与远端分叉）。
- commit 消息要语义准确，避免「查看部署状态」这类无关命名（曾因此返工改写）。

## Cloudflare 认证（有效通道）

- **Cloudflare 插件 MCP**：`mcp_trae-remote-official_plugin_cloudflare_cloudflare-api` 的 `execute` 无需自备 token——已预置认证与 `accountId`（账号：19820393768@139.com），脚本直接用 `accountId` 常量，勿硬编码。
- 授权失败：先 `RequestAuthorization`（service `trae-remote-official:cloudflare::cloudflare-api`）。

## GitHub 认证（2026-09-10 实测修订）

**当前状态：SSH 推送通道不通 —— 没有任何公钥注册到 GitHub 账号 `eyetoolkit`。**

| 通道 | 实测结果 |
|---|---|
| SSH `git@github.com` | ❌ TCP/协议层通（返回 `Permission denied (publickey)`），但 `id_ed25519` 与 `github_ed25519` 均被拒 |
| SSH over 443 `ssh.github.com:443` | ❌ 同上，可连但公钥被拒 |
| HTTPS `git ls-remote` | ✅ 通（Git Credential Manager 存有 `x-access-token`），返回正确 HEAD |
| HTTPS `git push` | ⚠️ 在沙箱代理（`http_proxy=127.0.0.1:59335`）下报 `CONNECT tunnel failed 502`；用户本机终端无此代理 |
| `gh` CLI | ❌ **本机未安装**（旧版 skill 称"gh 已认证"为过期信息），`gh auth setup-git` 不可用 |
| ssh-agent | ❌ 未运行（`ssh-add -l` 报无法连接认证代理） |
| `~/.ssh/config` | ⚠️ 无 `Host github.com` 条目（只有 `volc` / `hk`） |

**修复方案（二选一）：**

1. **注册公钥（推荐）**：把 `C:/Users/刘先生/.ssh/github_ed25519.pub`（comment `local-windows-push`，指纹 `SHA256:m/zbKprP6JmTBn9e9g/RJE+rQ3hJhzUYN9iu+7Eey9c`）加到 GitHub → Settings → SSH and GPG keys。SSH 不经 HTTP 代理，注册后 `git push origin main` 立即可用。
2. **改走 HTTPS**：`git remote set-url origin https://github.com/eyetoolkit/jsonversal-monorepo.git`，在**用户本机终端**（非 Agent 沙箱）推送。沙箱内因代理会 502。

**建议同时给 `~/.ssh/config` 补一段**（避免中文用户名路径被 MSYS 转义成 `/c/Users/\301\365...`）：

```
Host github.com
    HostName github.com
    User git
    IdentityFile C:/Users/刘先生/.ssh/github_ed25519
    UserKnownHostsFile C:/Users/刘先生/.ssh/known_hosts
    IdentitiesOnly yes
```

- 或走 GitHub 插件 MCP（`mcp_trae-remote-official_plugin_github_github`）读仓库/提交，无需本地凭据。
- 授权失败：`RequestAuthorization`（service `trae-remote-official:github::github`）。

## 部署链路体检结论（2026-09-10）

| 环节 | 状态 | 证据 |
|---|---|---|
| 本地构建 | ✅ | 79 页 / 12.9s / 0 报错 |
| 本地 → GitHub 推送 | ❌ **断** | origin 为 SSH，公钥未注册 → `Permission denied (publickey)` |
| GitHub 仓库 | ✅ | public，默认分支 main，HEAD `fd27c7d`，`pushed_at` 与本地一致 |
| GitHub → Cloudflare Pages | ✅ **通** | 每个 commit 的 `Cloudflare Pages` check run 均为 `completed/success`（`fd27c7d`/`506af9a`/`8df6a6c` 三连验证） |
| CF Pages → 站点 | ✅ | `jsonversal.com` 200、`jsonversal-main-v2.pages.dev` 200 |
| 域名 apex | ✅ | 200 |
| 域名 **www** | ❌ **522** | http/https 均 522（Cloudflare 回源超时），解析到 CF 代理 IP `104.21.60.47`/`172.67.191.163` |
| 旧子域 sec/devops/codegen | ✅ | 无解析记录（NXDOMAIN）、HTTP 000，确认删净 |

> **「GitHub → CF Pages 是否触发构建」的最优查法**：无需 Cloudflare 凭据，直接查 GitHub check-runs ——
> `curl -s https://api.github.com/repos/eyetoolkit/jsonversal-monorepo/commits/<sha>/check-runs | grep -A2 '"name": "Cloudflare Pages"'`
> 返回 `status: completed` + `conclusion: success` 即表示该 commit 的 CF 构建已成功。

### 待修配置项

1. **`www.jsonversal.com` 522**：现 DNS 为 `www` CNAME → `jsonversal.com`（apex 本身也是橙云代理到 `pages.dev`），形成双重代理回源失败。修法：把 `www` 直接 CNAME 指向 `jsonversal-main-v2.pages.dev`（橙云代理），或在 CF Pages 项目里把 `www.jsonversal.com` 加为 Custom domain。
2. **`apps/main/wrangler.toml` 项目名不符**：写的是 `name = "jsonversal-main"`，实际 CF 项目为 `jsonversal-main-v2`；其 `[pages] build_config` 也不会被 CF Pages Git 集成读取（构建配置在 dashboard）。属易误导的死配置，建议改名或删除并加注释。
3. **`~/.ssh/config` 缺 `Host github.com`**（见上）。

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

## 当前核实状态（2026-09-10 第二轮 · 已闭环）

- **本地 HEAD = 远端 HEAD = `fd27c7d`**，工作区干净；`506af9a..HEAD` 仅改 `.trae/` 文档与 skill，**无源码变更**。
- **线上全部正常**：sitemap 全部 **79 条 URL 均 200**；首页含四栏目导航与「Explore 69 tools」。
- **本地全量构建通过**：`pnpm install` + `turbo run build --filter=@versal/site-main` → 79 页 / 12.9s / 0 报错。
- **工具自检 69 个全跑通**：`.toolcheck.cjs` → `PASS=65`、`SKIP=4`（file-checksum / csr / x509-decoder / base64-image，需上传外部文件）、`NO_OUTPUT=0`、`parse/load 错误=0`。
- **线上即最新（已证明）**：见下方「验证线上是否为最新」。原「待确认 CF 部署」项**已关闭** —— 内容比对给出的证据比部署列表更强，不必依赖 Cloudflare MCP。

## 验证线上是否为最新（推荐方法，不依赖 CF 凭据）

1. 本地全量构建：`npx pnpm@10.11.1 install && npx pnpm@10.11.1 turbo run build --filter=@versal/site-main`
2. 抽页比对：`curl -s https://jsonversal.com/<path> -o live.html`，与 `apps/main/dist/<path>/index.html` 做**归一化 diff**：
   `sed -E 's/data-astro-cid-[a-z0-9]+/CID/g; s/index\.[A-Za-z0-9_-]+\.css/index.CSS/g'`
3. 归一化后**无差异**即线上等于当前源码。预期且**无害**的三类差异：
   - Astro 作用域样式哈希与 CSS 文件名哈希（随构建机绝对路径变化）
   - `ToolGrid.astro` 的 `Math.random()` uid（`data-toolgrid="tgXXXXXX"`）
   - Cloudflare 邮件混淆注入（`mailto:` → `/cdn-cgi/l/email-protection#...` 且注入 `email-decode.min.js`，约 +151B/页）

## 工具自检脚本 `.toolcheck.cjs`

- 位置：仓库根目录；依赖 root `devDependencies` 的 `jsdom`。
- 用法（`DIST` 已改为自动推导，不再硬编码沙箱路径）：
  - `node .toolcheck.cjs`（默认读 `apps/main/dist`）
  - 或 `node .toolcheck.cjs <dist目录>` / `TOOLCHECK_DIST=<dist目录> node .toolcheck.cjs`
- 流程：遍历 4 栏目 → jsdom 解析页面脚本查语法错 → 灌入 `SAMPLES` 样例值 → 点动作按钮 → 抓输出判定 `PASS / NO_OUTPUT / NEEDS-INPUT`。
- `SAMPLES` 中标 `'SKIP'` 的 4 个工具需上传文件，脚本不测，属预期。

## 注意事项

- 每轮先走 Cloudflare 插件 MCP 核验真实权限/配置，不要假定 token 可用（credentials.md 里那两串 CF token 已验证失效）。
- 验证写权限或改动线上资源时，优先「临时资源 + 用完即删」。
- 本 skill 只覆盖 jsonversal 品牌矩阵；tri-sites（mathduel/boardduel/memoryduel）走 `tinysite-deploy-chain`；mathduel 细节走 `mathduel-site-manager`。
- 推送前把本地与 `origin/main` 对齐（`git fetch` + 比对 HEAD），避免分叉；推送后可用 GitHub 插件 MCP `list_commits` 复核远端 HEAD。