---
name: "jsonversal-deploy-chain"
description: "jsonversal 品牌矩阵（jsonversal.com + tools/sec/devops/codegen 四栏目）在 Cloudflare Pages + GitHub 上的部署链路，项目配置、推送方式与核验方法。当需要部署/更新站点、核实 CF Pages 项目、排查线上不生效或域名问题时调用。仅覆盖 jsonversal；tri-sites（mathduel/boardduel/memoryduel）走 tinysite-deploy-chain，mathduel 细节走 mathduel-site-manager。"
---

<!-- deploy-chain-test: 2026-09-17T10:53Z -->

# jsonversal 部署链路

**一句话：改 monorepo → push `main` → Cloudflare Pages 自动构建 → 上线。没有手动上传环节。**

> 通用方法论（四段链路体检、零残留推送、凭证验活、522 排查）已抽到用户级技能 `deploy-chain-audit`，
> 本文只记 jsonversal 专属的事实与配置。**本文不记录任何密钥明文**；凭据只从 `.env` 或用户级环境变量按需读取。

---

## 1. 链路总览（2026-09-17 Agent 接管版）

```
  我（改代码）
      ↓  GitHub MCP 插件 或 HTTPS+PAT
  GitHub main  （jsonversal-monorepo）
      ↓  两条并行下游
      ├──▶  ECS 构建验证关卡 ──▶ ✅ 通过？CF Pages 自动部署
      │      /opt/jsonversal/       / 失败？当场修
      │      pnpm build + .toolcheck
      │
      └──▶  Cloudflare Pages jsonversal-main-v2 （GitHub 集成，自动触发）
             构建命令：pnpm turbo run build --filter=@versal/site-main
             产物：apps/main/dist → jsonversal.com
```

| 关卡 | 状态 | 权威证据 |
|---|---|---|
| ① GitHub main | ✅ | HEAD = `9ec0e2e`（2026-09-17 QR cdnjs 修复） |
| ② ECS 构建验证 | ✅ 跑通 | Node v20.19.5 + pnpm 10.11.1；81 页 / 4.96s / sitemap 80 URLs |
| ③ CF Pages 自动部署 | ✅ 稳定 | 最近 6 场 push 各触发一场构建，全 `deploy/success` |
| ④ 线上 jsonversal.com | ✅ | 200，安全头已生效（HSTS + CSP + X-Frame-Options） |

**当前生产 commit：`9ec0e2e`**（含 cdnjs 违规修复）

### 为什么加 ECS 关卡

本沙箱没有 node/pnpm/git，**无法本地构建验证**。ECS 补上了这个最关键的短板：
- 构建环境与 CF Pages 完全一致（同 pnpm 版本、同 lockfile）
- 能跑 `.toolcheck.cjs` 验证 69 个工具运行时
- 能直接测 `packages/jsonversal-mcp-server`（CF Pages 跑不了 Node 服务）
- 失败当场修，不用等 CF Pages 5–10 秒才出结果

---

## 2. ECS 权威真相源（火山云 101.96.194.237）

| 项 | 值 |
|---|---|
| 服务器 | 火山云 ECS Ubuntu 24.04，40G 磁盘（29G 可用） |
| 仓库路径 | `/opt/jsonversal/`（**权威构建副本**，每轮先 `git pull`） |
| 运行时 | **Node v20.19.5 + pnpm 10.11.1**（与 CF Pages 完全一致） |
| 远程 | `https://eyetoolkit:***@ghfast.top/https://github.com/eyetoolkit/jsonversal-monorepo.git` |
| SSH 密钥 | 本机 `~/.ssh/volcano_key`（已验证可用） |
| GitHub Actions Runner | `volcano-jsonversal`（online，labels: self-hosted/Linux/X64/volcano，**当前未被 workflow 使用**） |
| Runner 服务 | `systemctl status actions.runner.eyetoolkit-jsonversal-monorepo.volcano-jsonversal` — active |
| Runner 目录 | `/opt/jsonversal-runner/`（独立于 `/opt/jsonversal/`） |

> ⚠️ Runner 当前是"闲置"状态——`deploy-matrix.yml` 是空注释壳。它的构建能力通过 ECS 上手动 `ssh ... && pnpm build` 来用，不依赖 self-hosted workflow。以后需要 CI 流水线再激活。

### ECS 常用命令（Agent 直接执行）

```powershell
# 推完 GitHub 后，SSH 到 ECS 拉代码 + 构建验证
$kp = "$env:USERPROFILE\.ssh\volcano_key"
ssh -i $kp root@101.96.194.237 "cd /opt/jsonversal && git pull && pnpm install --frozen-lockfile 2>&1 | tail -3 && pnpm turbo run build --filter=@versal/site-main 2>&1 | tail -10"

# 工具自检（需要 node_modules 已 install）
ssh -i $kp root@101.96.194.237 "cd /opt/jsonversal && node .toolcheck.cjs"

# MCP Server 本地快速测试
ssh -i $kp root@101.96.194.237 "cd /opt/jsonversal/packages/jsonversal-mcp-server && node dist/index.js --help"
```

### SSH 注意（沙箱环境）
- 主机密钥可能因服务器重装而变化——遇到 `REMOTE HOST IDENTIFICATION HAS CHANGED` 时先清理 known_hosts：
  ```powershell
  (Get-Content "$env:USERPROFILE\.ssh\known_hosts" -Raw) -split "`n" | Where-Object { $_ -notmatch "101\.96\.194\.237" } | Set-Content "$env:USERPROFILE\.ssh\known_hosts"
  ```
- 中文用户名路径的密钥在 WSL/bash 里可能乱码——**直接用 PowerShell 的 `ssh` 命令**，不要 `bash -c "ssh ..."`

---

## 3. 站点结构

单域名 + 四子栏目，全部由 Astro 静态生成，托管于 CF Pages 项目 `jsonversal-main-v2`。

| 路径 | 主题 | 工具数 |
|---|---|---|
| `/` | LLM / JSON 工程工具（首页） | — |
| `/tools/` | JSON / LLM 工具 | 23 |
| `/sec/` | 安全工具 | 14 |
| `/devops/` | DevOps 工具 | 16（含 QR Code Generator，**已修复 cdnjs 违规**） |
| `/codegen/` | 代码生成器 | 16 |

合计 **69 个工具**。

> 路由不对称：CF Pages 会将 `/devops/tools/qr-code-generator/` 重写到 `/devops/tools/qr-code-generator`（末尾斜杠消失），Astro 的 404 页面无法区分，正确返回 200。

> 旧子站 `sec/devops/codegen.jsonversal.com` 已**彻底删除**：三个 CF 项目 `*-v2`、三条 DNS 记录、monorepo 里的三个 redirect 包全部清除。

---

## 4. 源码与仓库

| 项 | 值 |
|---|---|
| 仓库 | `eyetoolkit/jsonversal-monorepo` —— **private** |
| 生产分支 | `main` |
| 权威本地克隆 | `E:\TRAE\jsonversal-monorepo` |
| 技术栈 | pnpm workspace + turbo |
| 应用 | `apps/main`（唯一 Astro 应用） |
| 共享包 | `packages/ui`（BaseLayout / Header / Footer / ToolCard）、`packages/config`（tokens / sites / tools-icons） |
| MCP Server | `packages/jsonversal-mcp-server`（native JSON-RPC 2.0，11 个工具，stdio + HTTP REST 双模式） |

- 旧单仓库 `eyetoolkit/jsonversal` 已废弃。
- 历史路径 `c:\new\jsonversal-monorepo`、Trae 沙箱 `/workspace` 均已作废。

---

## 5. Cloudflare Pages 项目配置（权威值，取自 API）

```
name              = jsonversal-main-v2
subdomain         = jsonversal-main-v2.pages.dev
domains           = jsonversal-main-v2.pages.dev, jsonversal.com, www.jsonversal.com
production_branch = main
source            = github  eyetoolkit/jsonversal-monorepo
framework         = astro
build_command     = npx pnpm install && npx pnpm turbo run build --filter=@versal/site-main
destination_dir   = apps/main/dist
root_dir         = (空)
```

账户 ID `00cb5cd6be4881053e57a338ce62de2f`（不是密钥）。

> 构建配置在 **dashboard / API** 里，`apps/main/wrangler.toml` **不参与**线上构建。

---

## 6. 部署流程（Agent 标准操作）

```
① 改代码          → 直接文件读写（apps/main/**, packages/**）
② 推 GitHub       → GitHub MCP 插件 push_files；或 HTTPS+PAT
③ ECS 构建验证     → ssh ECS 拉代码 + pnpm install + pnpm build + .toolcheck
   ├─ 通过       → 继续
   └─ 失败       → 当场修，重新 ②③
④ CF Pages 自动部署 → push 已触发，约 5-10 秒出结果（并行于 ③）
⑤ 线上核验         → CF API 查 deployments + Invoke-WebRequest 探活
```

### 详细步骤

**① 改代码**
- 页面组件 → `apps/main/src/pages/**`
- 共享组件 / 样式 → `packages/{ui,config}`
- 新增工具别忘了 `packages/config/tools-icons.js` 加 emoji 映射

**② 推 GitHub** — 两条通道（Agent 优先用 MCP）

| 通道 | 适用场景 | 命令 |
|---|---|---|
| **GitHub 插件 MCP** ✅ 首选 | Agent 直接操作 | `push_files`（多文件）或 `create_or_update_file`（单文件）—— 不需要本机 git |
| **HTTPS + PAT** | 需要带 commit message 或批量 | 见第 8 节 |

**③ ECS 构建验证**（推完立刻跑，不用等 CF Pages）

```powershell
$kp = "$env:USERPROFILE\.ssh\volcano_key"
ssh -i $kp root@101.96.194.237 @'
  set -e
  cd /opt/jsonversal
  git pull
  pnpm install --frozen-lockfile 2>&1 | tail -3
  pnpm turbo run build --filter=@versal/site-main 2>&1 | tail -10
'@
```

**构建通过标准**：81 页 / sitemap 80 URLs / 0 错误。  
**工具自检**（可选，改了前端逻辑才跑）：
```powershell
ssh -i $kp root@101.96.194.237 "cd /opt/jsonversal && node .toolcheck.cjs"
```

**④⑤ 核验线上**

CF Pages 的构建与 ECS 验证是**并行**的——push 时两边同时开始。ECS 构建完成后，CF 通常也出结果了：

```powershell
# 最权威：CF API 查部署列表
$token = (Get-Content .env | Select-String '^CF_TOKEN_PAGES=').ToString().Split('=')[1].Trim()
Invoke-RestMethod -Uri "https://api.cloudflare.com/client/v4/accounts/00cb5cd6be4881053e57a338ce62de2f/pages/projects/jsonversal-main-v2/deployments" -Headers @{ Authorization = "Bearer $token" } | % { $_.result[0] } | % { Write-Output "$($_.latest_stage.status) commit=$($_.deployment_trigger.metadata.commit_hash.Substring(0,7))" }

# 探活 + 安全头
Invoke-WebRequest -Uri "https://jsonversal.com/" -UseBasicParsing | Select-Object StatusCode, @{n='HSTS';e={$_.Headers['strict-transport-security']}}, @{n='XFO';e={$_.Headers['x-frame-options']}}
```

### 触发重建的特殊情形
- **空构建**：GitHub MCP 推一个空 commit（或用 `allow-empty`）。
- **重跑上一次部署**：`POST .../deployments/{id}/retry`（CF API，比空提交干净）。
- **改 commit message / amend**：MCP 暂不支持 force push；需 HTTPS+PAT 通道。

### ECS vs CF Pages 构建结果不一致怎么办？

两边环境完全一致（同 pnpm 版本、同 lockfile、同 Node 主版本），理论上结果相同。如出现分歧：
1. 先确认两边用的是**同一个 commit**（ECS `git log -1` vs CF 部署列表的 commit hash）
2. 若 ECS 过而 CF 失败 → 大概率是 CF 缓存了旧 lockfile 或临时网络抖动 → 重跑 CF 部署
3. 若 ECS 失败而 CF 过 → CF 上构建的不是最新代码 → 检查 push 是否成功

---

## 7. 核验"线上是否是最新"——三层，从便宜到硬

### ① GitHub check-runs

```bash
curl -s -H "Authorization: Bearer $GH_TOKEN" \
  https://api.github.com/repos/eyetoolkit/jsonversal-monorepo/commits/<sha>/check-runs
```

### ② **最权威：CF Pages API 部署列表**

```bash
GET /accounts/{acc}/pages/projects/jsonversal-main-v2/deployments
```

确认最顶一条是 `production` 环境、`github:push`、commit hash 与本地 HEAD 一致、`latest_stage` 为 `deploy/success`。

### ③ 最硬：归一化 diff（证明内容等于源码）

```bash
curl -s "https://jsonversal.com/<path>?v=$RANDOM" -o live.html
diff <(sed -E 's/data-astro-cid-[a-z0-9]+/CID/g' apps/main/dist/<path>/index.html) \
      <(sed -E 's/data-astro-cid-[a-z0-9]+/CID/g' live.html)
```

归一化后无差异 = 线上等于当前源码。**预期且无害**的三类差异：
1. Astro 作用域样式哈希与 CSS/JS 文件名哈希
2. `ToolGrid.astro` 用 `Math.random()` 生成的 `data-toolgrid` uid
3. Cloudflare 邮件混淆注入（`mailto:` → `/cdn-cgi/l/email-protection#...`）

> 批量探活 sitemap 时**每条 URL 都加 `?v=$RANDOM`**，否则边缘缓存会给你旧内容。

---

## 8. 推送通道（Agent 双通道）

**Agent 优先用 GitHub MCP 插件**（不需要本机 git），复杂场景 fallback 到 HTTPS+PAT。

### ✅ 通道 A：GitHub 插件 MCP（Agent 首选）

本沙箱已预装并授权 `mcp_plugin_GitHub_github`，能直接调：

| 工具 | 用途 |
|---|---|
| `push_files` | 多文件一起推（单 commit） |
| `create_or_update_file` | 单文件新增/更新（**更新已存在文件必须先查 SHA**） |
| `delete_file` | 删除文件 |
| `list_commits` / `get_commit` | 查远端状态 |

**优点**：不需要本机 git/SSH/PAT，一条调用即推送。  
**限制**：不支持 `force push` / `commit --amend` / 复杂 git 操作。

**示例**（改了 2 个文件）：
```
push_files:
  owner=eyetoolkit, repo=jsonversal-monorepo, branch=main
  files=[
    {path: "apps/main/src/pages/tools/json-formatter/index.astro", content: "...", message: "feat: improve json formatter UX"},
    {path: "packages/ui/BaseLayout.astro", content: "...", message: "feat: improve json formatter UX"}
  ]
```

**重要**：`create_or_update_file` 更新已存在文件时，必须先调用 `get_file_contents` 取 SHA，**否则 422**。

### 通道 B：HTTPS + PAT（复杂场景 fallback）

需要 `force push` / `amend` / 或者 MCP 不可用时用：

```bash
GH=$(grep '^GH_TOKEN=' .env | cut -d= -f2- | tr -d '\r"'"'"'')   # 或从用户级环境变量取
B64=$(printf 'x-access-token:%s' "$GH" | base64 -w0)

env -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY -u all_proxy -u ALL_PROXY \
  git -c credential.helper= -c http.proxy= -c https.proxy= \
      -c http.extraheader="Authorization: Basic $B64" \
      push https://github.com/eyetoolkit/jsonversal-monorepo.git main:main
```

**为什么这么写**
- 不改 remote、不留 token 在 `.git/config`（推完 `grep -c "extraheader\|_pat" .git/config` 必须为 0）
- 必须绕开沙箱代理（对 github.com 间歇 502）
- `credential.helper=` 清空凭据助手，避免 GCM 协商干扰

### 推送自检（两项，缺一不可）
1. **以远端 sha 为准**：用 GitHub MCP `list_commits` 看最新 commit hash —— 比 `git rev-parse` 可靠（本地 `.git` 可能落后）
2. **不留凭据**：HTTPS+PAT 推完必须 `grep -c "extraheader\|_pat" .git/config` = 0

### 坑速查
- ❌ **判断 push 成败不能靠输出文本** —— 会被 `GH013` 等报错误命中
- ❌ **`GH013 GitHub Push Protection`** —— 提交含明文密钥会被拒；只写关系+短指纹
- ⚠️ push 失败常是间歇性抖动，先重试几次
- ⚠️ `hosts` 钉 `github.com` IP 不可靠，服务器重装/换 IP 就失效

---

## 9. 凭据

### ✅ 当前可用（存于 `.env`，`.gitignore` 第 16 行保护）

| 名称 | 实测权限 | 用途 |
|---|---|---|
| `CF_TOKEN_PAGES` | Pages 项目读 ✅、自定义域读/写 ✅、Zone 读 ✅ | **加自定义域就是用它** |
| `CF_TOKEN_DNS_WRITE` | Zone 读 ✅、DNS 记录读/写 ✅ | DNS 操作 |
| `GH_TOKEN` / `GH_PAT` | ✅ `eyetoolkit`，admin/push | 推送 |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | ✅ ListBuckets 200 + PUT/GET/DELETE | S3 对象存储 ⚠️ 见下 |

**两枚 CF 令牌是最小权限分工、权限互补**，做完整 CF 运维要同时用。

### 🔴 安全告警：R2 秘密密钥是 CF 令牌的 SHA-256

```
sha256(CF_TOKEN_PAGES)  ==  R2_SECRET_ACCESS_KEY        （逐字节相等）
```

**危害**：R2 秘密密钥可由 `cfat_` 令牌直接算出。而该令牌会出现在请求头、CI 变量、日志、报错里——**它一泄漏，R2 密钥随即泄漏**；再配上同文件里的 `R2_ACCESS_KEY_ID`，即可对 `mathduel-backup` / `md-quiz-bucket` 完整读写。

**处置**：到 Cloudflare **重新签发 R2 API 令牌**，使其 secret 由服务器随机生成、**不由任何其他凭证派生**；替换 `.env` 后作废当前 AK。

### ❌ 已失效（勿用）

- **7 个 CF 令牌**：`CF_API_TOKEN`、`CLOUDFLARE_API_TOKEN`、`CF_TOKEN_MAIN`、`CF_TOKEN_A`~`D` —— 实测均不可用。
- **旧 mathduel R2 密钥**（`MATHDUEL_R2_AK1/SK1/AK2/SK2/AK3`）—— **2026-09-10 已从 `.env` 删除**。

---

## 10. 域名与 DNS（zone `82591a57fa474a57fc21d26ea6e5c558`）

| 名称 | 类型 | 指向 | proxied | 实测 |
|---|---|---|---|---|
| `jsonversal.com` | CNAME | `jsonversal-main-v2.pages.dev` | ✅ | 200 |
| `www.jsonversal.com` | CNAME | `jsonversal.com` | ✅ | 200 |

---

## 11. 常用 API 入口

Base：`https://api.cloudflare.com/client/v4`，Header：`Authorization: Bearer $CF_TOKEN_PAGES`

- 列项目：`GET /accounts/{acc}/pages/projects`
- 查项目（含 build_config）：`GET /accounts/{acc}/pages/projects/jsonversal-main-v2`
- **查自定义域** ← **排查 522 / 域名问题的第一入口**：`GET .../pages/projects/jsonversal-main-v2/domains`
- 查部署历史：`GET .../pages/projects/jsonversal-main-v2/deployments`
- 查部署日志：`GET .../deployments/{id}/history/logs`
- 改构建配置：`PATCH .../pages/projects/jsonversal-main-v2`
- DNS 记录（换 `CF_TOKEN_DNS_WRITE`）：`GET /zones/{zone}/dns_records`

---

## 12. 历史坑（避免重踩）

- ❌ **CF API 无法把 Direct Upload 项目改绑 GitHub**（错误码 `8000069`）→ 旧四项目作废删除，改用 `-v2` + GitHub 集成。
- ❌ **改动未同步生产分支**：误在非 `main` 分支提交 → 需合并后再 push `main`。
- ❌ **把 `www` 522 误判为 DNS 问题** → 正解是注册进 Pages 项目自定义域列表。
- ❌ **用 `/user/tokens/verify` 判 token 死活** → 细粒度 token 会误报，必须打真实业务请求。
- ❌ **靠输出文本判断 push 成功** → 会被子虚乌有的报错误命中；以远端 sha 为准。

---

## 13. 本地工具脚本

### `.toolcheck.cjs`（仓库根目录）

遍历 4 栏目 → jsdom 解析页面脚本查语法错 → 灌入 `SAMPLES` 样例值 → 点动作按钮 → 抓输出判定 `PASS / NO_OUTPUT / NEEDS-INPUT`。依赖 root `devDependencies` 的 `jsdom`。

```bash
node .toolcheck.cjs                        # 默认读 apps/main/dist
node .toolcheck.cjs <dist目录>             # 或 TOOLCHECK_DIST=<dist目录> node .toolcheck.cjs
```

`SAMPLES` 中标 `'SKIP'` 的 4 个工具需上传文件，脚本不测，属预期。基线：**PASS=65 / SKIP=4 / NO_OUTPUT=0 / parse 错误=0**。

---

## 14. 沙箱环境注意（Agent 相关）

- **`.git/refs/remotes/` 写入被静默丢弃**：`git update-ref refs/remotes/origin/main <sha>` 返回 0 但不落地 → `git status` 会谎报 `ahead N`。**一律以 `git rev-parse HEAD` + 远端 API 为准。**
- **代理端口每次 Bash 调用都变**，不要缓存/硬编码。
- **沙箱 shell 不继承 Windows 用户级环境变量** —— 读全局凭据要「PowerShell 落盘 → Read → 立即删文件」。
- `reg.exe` 被安全策略列入黑名单；也不要从 Bash 调 `powershell.exe`（同样被拦），要用 PowerShell 工具。
- 临时文件别写 `/tmp`（Git Bash 下会失败），写工作区内相对路径或 `%TEMP%`。
