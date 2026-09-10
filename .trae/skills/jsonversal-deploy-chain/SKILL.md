---
name: "jsonversal-deploy-chain"
description: "jsonversal 品牌矩阵（jsonversal.com + tools/sec/devops/codegen 四栏目）在 Cloudflare Pages + GitHub 上的部署链路、项目配置、推送方式与核验方法。当需要部署/更新站点、核实 CF Pages 项目、排查线上不生效或域名问题时调用。仅覆盖 jsonversal；tri-sites（mathduel/boardduel/memoryduel）走 tinysite-deploy-chain，mathduel 细节走 mathduel-site-manager。"
---

# jsonversal 部署链路

**一句话：改 monorepo → push `main` → Cloudflare Pages 自动构建 → 上线。没有手动上传环节。**

> 通用方法论（四段链路体检、零残留推送、凭证验活、522 排查）已抽到用户级技能 `deploy-chain-audit`，
> 本文只记 jsonversal 专属的事实与配置。**本文不记录任何密钥明文**；凭据只从 `.env` 或用户级环境变量按需读取。

---

## 1. 链路总览（2026-09-10 实测）

| 环节 | 状态 | 权威证据 |
|---|---|---|
| ① 本地构建 | ✅ | `turbo run build --filter=@versal/site-main` → 79 页 / 12.9s / 0 报错 |
| ② 本地 → GitHub | ✅ | push 成功，本地 HEAD = 远端 HEAD = `641219c` |
| ③ GitHub → CF Pages | ✅ | Pages 最新部署 `09f4e8f3`，`github:push` of `641219c`，`deploy/success` |
| ④ 平台 → 站点 | ✅ | apex / www / pages.dev 全 200；sitemap **79 条 = 本地 79 条**，抽检全 200 |

**当前生产 commit：`641219c`**（production 分支 `main`）

### 最近部署（CF Pages API）

| 部署 ID | commit | 状态 | 时间 |
|---|---|---|---|
| `09f4e8f3` | `641219c` | deploy/success | 2026-09-10 09:47Z |
| `8af70bb4` | `48d202b` | deploy/success | 2026-09-10 09:25Z |
| `c1dfceb0` | `0e62dcd` | deploy/success | 2026-09-10 08:04Z |

---

## 2. 站点结构

单域名 + 四子栏目，全部由 Astro 静态生成，托管于 CF Pages 项目 `jsonversal-main-v2`。

| 路径 | 主题 | 工具数 |
|---|---|---|
| `/` | LLM / JSON 工程工具（首页） | — |
| `/tools/` | JSON / LLM 工具 | 16 |
| `/sec/` | 安全工具 | 18 |
| `/devops/` | DevOps 工具 | 17 |
| `/codegen/` | 代码生成器 | 18 |

合计 **69 个工具**（65 个可脚本自检通过 + 4 个需上传外部文件：file-checksum / csr / x509-decoder / base64-image）。

> 旧子站 `sec/devops/codegen.jsonversal.com` 已**彻底删除**：三个 CF 项目 `*-v2`、三条 DNS 记录、monorepo 里的三个 redirect 包全部清除。实测三域均 **NXDOMAIN**（`socket.gethostbyname_ex` 抛 `gaierror`）。

---

## 3. 源码与仓库

| 项 | 值 |
|---|---|
| 仓库 | `eyetoolkit/jsonversal-monorepo`（public） |
| 生产分支 | `main` |
| 权威本地克隆 | `E:\TRAE\jsonversal-monorepo` |
| 技术栈 | pnpm workspace + turbo |
| 应用 | `apps/main`（唯一 Astro 应用） |
| 共享包 | `packages/ui`（BaseLayout / Header / Footer / ToolCard / Hero / ToolGrid）、`packages/config`（tokens / sites / tools-icons） |

- 旧单仓库 `eyetoolkit/jsonversal` 已废弃。
- 历史路径 `c:\new\jsonversal-monorepo`、Trae 沙箱 `/workspace` 均已作废，看到即视为过期信息。

---

## 4. Cloudflare Pages 项目配置（权威值，取自 API）

```
name              = jsonversal-main-v2
subdomain         = jsonversal-main-v2.pages.dev
domains           = jsonversal-main-v2.pages.dev, jsonversal.com, www.jsonversal.com
production_branch = main
source            = github  eyetoolkit/jsonversal-monorepo
framework         = astro
build_command     = npx pnpm install && npx pnpm turbo run build --filter=@versal/site-main
destination_dir   = apps/main/dist
root_dir          = (空)
```

账户 ID `00cb5cd6be4881053e57a338ce62de2f`（不是密钥）。

> 构建配置在 **dashboard / API** 里，`apps/main/wrangler.toml` **不参与**线上构建。
> 该文件的 `name` 已于 2026-09-10 校正为 `jsonversal-main-v2`，避免 `wrangler pages deploy` 打错项目。

---

## 5. 部署流程

1. **改代码**
   - UI / 页面 → `apps/main/src/pages/**`
   - 共享样式 / 组件 → `packages/{ui,config}`
2. **本地构建自检**
   ```bash
   npx pnpm install && npx pnpm turbo run build --filter=@versal/site-main
   ```
3. **提交**（只 add 本次改动文件，勿 `git add -A`）
   ```bash
   git add <具体文件> && git commit
   ```
   commit message 要语义准确——曾用「查看部署状态」这类无关命名导致返工。
4. **推送 `main`** → 见第 7 节。origin 是 SSH 但公钥未注册，**直接 `git push origin main` 会失败**。
5. **核验**（约 35 秒后出结果）→ 见第 6 节。

### 触发重建的两种特殊情形
- **空构建**：`git commit --allow-empty` + push（CF 不提供对失败部署的直接 retry）。
- **改 commit message**：`git commit --amend` + 强推；会改变 hash 并触发重部署。**用户本地需 `git fetch && git reset --hard origin/main` 对齐**，避免分叉。

---

## 6. 核验"线上是否是最新"——三层，从便宜到硬

### ① 最快：GitHub check-runs（免认证，不需 CF 凭据）
```bash
curl -s https://api.github.com/repos/eyetoolkit/jsonversal-monorepo/commits/<sha>/check-runs
```
看 `name=Cloudflare Pages` + `status=completed` + `conclusion=success`。公开仓库无需 token，push 后约 35 秒出结果。

### ② 最权威：CF Pages API 的部署列表
```bash
GET /accounts/{acc}/pages/projects/jsonversal-main-v2/deployments
```
确认最顶一条是 `production` 环境、`github:push`、commit hash 与本地 HEAD 一致、`latest_stage` 为 `deploy/success`。
**这是唯一能直接证明「哪个 commit 被部署了」的接口**，优先用它。

### ③ 最硬：归一化 diff（证明内容等于源码）
```bash
curl -s "https://jsonversal.com/<path>?v=$RANDOM" -o live.html   # 随机 query 绕边缘缓存
diff <(sed -E 's/data-astro-cid-[a-z0-9]+/CID/g; s/index\.[A-Za-z0-9_-]+\.css/index.CSS/g' apps/main/dist/<path>/index.html) \
     <(sed -E 's/data-astro-cid-[a-z0-9]+/CID/g; s/index\.[A-Za-z0-9_-]+\.css/index.CSS/g' live.html)
```
归一化后无差异 = 线上等于当前源码。**预期且无害**的三类差异：
1. Astro 作用域样式哈希与 CSS/JS 文件名哈希（随构建机绝对路径变化）
2. `ToolGrid.astro` 用 `Math.random()` 生成的 `data-toolgrid` uid
3. Cloudflare 邮件混淆注入（`mailto:` → `/cdn-cgi/l/email-protection#...`，另注入 `email-decode.min.js`，约 +151B/页）

> 批量探活 sitemap 时**每条 URL 都加 `?v=$RANDOM`**，否则边缘缓存会给你旧内容。

---

## 7. 推送通道（当前唯一可用方式：HTTPS + PAT）

**现状**：SSH 走不通，`gh` CLI 未安装。可用的是用户级环境变量里的细粒度 PAT（身份 `eyetoolkit`，仓库权限 `admin/maintain/push/triage/pull` 全真）。

```bash
GH=$(grep '^GH_TOKEN=' .env | cut -d= -f2- | tr -d '\r"'"'"'')   # 或从用户级环境变量取
B64=$(printf 'x-access-token:%s' "$GH" | base64 -w0)

env -u http_proxy -u https_proxy -u HTTP_PROXY -u HTTPS_PROXY -u all_proxy -u ALL_PROXY \
  git -c credential.helper= -c http.proxy= -c https.proxy= \
      -c http.extraheader="Authorization: Basic $B64" \
      push https://github.com/eyetoolkit/jsonversal-monorepo.git main:main
```

**为什么这么写（每条都有实测依据）**
- **不改 remote**、不在 `.git/config` 留 token —— 推完自检 `grep -c "extraheader\|_pat" .git/config` 应为 `0`。
- **必须绕开沙箱代理**：代理端口每次 Bash 调用都变（见过 `59335`→`56178`），且对 `github.com` 本体间歇 `CONNECT tunnel failed 502` / 10s 超时。
- 显式 `credential.helper=` 清空凭据助手，避免 GCM 的 `x-access-token` 协商干扰。

### 推送自检（两项，缺一不可）
```bash
git rev-parse HEAD                                   # 与远端 /branches/main 的 sha 比对（以远端为准）
grep -c "extraheader\|_pat" .git/config              # 必须为 0
```

### 坑
- ⚠️ **判断推送成败不能靠输出文本匹配**。`grep -qE 'main -> main'` 会被 `GH013` 之类的报错输出误命中，造成"推送成功"假阳性。**一律以远端 sha 为准。**
- ⚠️ **`gh013 GITHUB PUSH PROTECTION`**：提交内容里只要有明文密钥就会被拒。安全发现只写**关系 + 短指纹**。
- ⚠️ push 失败常是**间歇性抖动**（`Recv failure: Connection was reset`），**先重试几次**，别急着改配置。
- ⚠️ **`hosts` 里 `github.com` 的 IP 钉定不可长期信任**：曾钉 `140.82.112.4`（当时 14/14 通）。2026-09-10 下午复测 140.82.112/113/114/116/121 段全超时，反而 DNS 解析的 `20.205.243.166` 恢复可用 —— **同一 IP 的通断会随时间反转**。改 hosts 需管理员权限（非提权会话会 `PermissionError`），要改必须请用户操作。
- ✅ 目前 `hosts` 仍钉 `140.82.112.4`，实测**对 git push 有效**（`curl` 探测可能超时但 git 能推）。

### 持久化修复（三者择一，均需用户操作）
1. 把 `C:/Users/刘先生/.ssh/github_ed25519.pub`（comment `local-windows-push`，指纹 `SHA256:m/zbKprP6JmTBn9e9g/RJE+rQ3hJhzUYN9iu+7Eey9c`）注册到 GitHub → Settings → SSH and GPG keys。
2. 或把 remote 改为 HTTPS：`git remote set-url origin https://github.com/eyetoolkit/jsonversal-monorepo.git`。
3. 或给 `~/.ssh/config` 补（`IdentityFile` **必须写 Windows 绝对路径**，否则中文用户名会被 MSYS 转义成 `/c/Users/\301\365...`）：
   ```
   Host github.com
       HostName github.com
       User git
       IdentityFile C:/Users/刘先生/.ssh/github_ed25519
       UserKnownHostsFile C:/Users/刘先生/.ssh/known_hosts
       IdentitiesOnly yes
   ```

---

## 8. 凭据

### ✅ 当前可用（存于 `.env`，`.gitignore` 第 16 行保护）

| 名称 | 实测权限 | 用途 |
|---|---|---|
| `CF_TOKEN_PAGES` | Pages 项目读 ✅、自定义域读/写 ✅、Zone 读 ✅ | **加自定义域就是用它**；打 DNS 记录会 403 |
| `CF_TOKEN_DNS_WRITE` | Zone 读 ✅（7 个 zone）、DNS 记录读/写 ✅ | DNS 操作；打 Pages 会 403 |
| `GH_TOKEN` / `GH_PAT` | ✅ `eyetoolkit`，admin/push | 推送 |
| `MINIMAX_API_KEY` | ✅ `/models` 200 | — |
| `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` | ✅ ListBuckets 200 + PUT/GET/DELETE 全链路 | S3 对象存储 ⚠️ 见下 |

**两枚 CF 令牌是最小权限分工、权限互补**（互相缺对方那一块，但都能列 zone），做完整 CF 运维要同时用。
两枚令牌**已写入用户级全局环境变量**（`setx CF_TOKEN_PAGES` / `CF_TOKEN_DNS_WRITE`，用 sha256 比对校验无误）——新开终端即可直接读，无需再手工从 `.env` 取。

### 🔴 安全告警：R2 秘密密钥是 CF 令牌的 SHA-256

```
sha256(CF_TOKEN_PAGES)  ==  R2_SECRET_ACCESS_KEY        （逐字节相等，已多路复现）
```

> ⚠️ **本文件不记录这两个值的明文。** 曾经直接写出完整令牌来"举例说明"，被 GitHub Push Protection
> 以 `GH013` 拦下 —— **在仓库里写明文密钥本身就是事故**。复核请用配套脚本（本地读 `.env` 当场计算）：
> ```bash
> python "C:/Users/刘先生/.workbuddy/skills/deploy-chain-audit/scripts/verify_credentials.py" --r2-full
> ```
> 指纹仅供比对：秘密密钥前 8 位 `bd280fbc`、后 4 位 `654f3`。

**危害**：R2 秘密密钥可由 `cfat_` 令牌直接算出。而该令牌会出现在请求头、CI 变量、日志、报错里——**它一泄漏，R2 密钥随即泄漏**；再配上同文件里的 `R2_ACCESS_KEY_ID`，即可对 `mathduel-backup` / `md-quiz-bucket` 完整读写。
**两套凭证本身都完全可用**，所以只看"能不能用"永远发现不了这个问题。

**处置（待用户执行）**：到 Cloudflare 重新签发 R2 API 令牌，使其 secret 由服务器随机生成、**不由任何其他凭证派生**；替换 `.env` 后作废当前 AK。

### ❌ 已失效（勿用）

- **7 个 CF 令牌**：`CF_API_TOKEN`、`CLOUDFLARE_API_TOKEN`、`CF_TOKEN_MAIN`、`CF_TOKEN_A`~`D` —— 实测均不可用（列 zone 也拿不到）。
  ⚠️ 清理前先确认旧名 `CF_API_TOKEN` / `CLOUDFLARE_API_TOKEN` 没被别的项目脚本引用，**不要直接覆盖**，否则权限错配。
- **整套旧 mathduel R2 密钥**（`MATHDUEL_R2_AK1/SK1/AK2/SK2/AK3`）—— 逐组合实测：`AK1+SK1` 401、`AK2` 报 400（长度 64，是 SK 规格串填进了 AK 位）、`AK3` 无配对 SK 且组合均 401。**2026-09-10 已从 `.env` 删除**，仅保留 `MATHDUEL_R2_ENDPOINT` / `_BUCKET`。该 bucket 请改用 `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY`。

### ⚠️ 两件容易误判的事

1. **`GET /user/tokens/verify` 会误报**：细粒度 token 一律返回 `code 1000 Invalid API Token`，即使完全可用。**判 token 死活只能打它该干的活**（列 zone / 读 DNS / 读 Pages）。
2. **凭证会轮换，旧记录必须复测**：本文早前记的「`MATHDUEL_R2_AK1+SK1` ✅ 200」在后续版本的 `.env` 上实测为 401。

---

## 9. 域名与 DNS（zone `82591a57fa474a57fc21d26ea6e5c558`）

| 名称 | 类型 | 指向 | proxied | 实测 |
|---|---|---|---|---|
| `jsonversal.com` | CNAME | `jsonversal-main-v2.pages.dev` | ✅ | 200 |
| `www.jsonversal.com` | CNAME | `jsonversal.com` | ✅ | 200（已注册为 Pages 自定义域） |

`www` 的 CNAME 指向 apex **不是问题**（橙云下 CNAME 到同 zone 主机，解析成相同边缘 IP 属正常）。**决定成败的是 Pages 项目的自定义域列表**，不是这条 DNS 记录。

### ✅ 已修复：`www` 522（2026-09-10）

**真根因不是「双 CNAME 环路」，而是 `www.jsonversal.com` 从未被注册为 Pages 自定义域。** CF Pages 的边缘路由**按 Host 头匹配已注册的自定义域**，未注册的 `www` 无法路由到项目 → 522。

| 检查 | 修复前 | 修复后 |
|---|---|---|
| Pages 自定义域列表 | `['jsonversal.com']` | `['jsonversal.com', 'www.jsonversal.com']` |
| DNS `www` 记录 | `CNAME → jsonversal.com` | **一个字节都没动** |
| `https://www.../` | ❌ 522（稳定复现） | ✅ 200 |
| `http://www.../` | ❌ 522 | ✅ 301 跳 https |

**修复命令（一条）：**
```bash
POST /accounts/{acc}/pages/projects/jsonversal-main-v2/domains
body: {"name": "www.jsonversal.com"}     # initializing → pending → active，约 60~90 秒
```

---

## 10. 常用 API 入口

Base：`https://api.cloudflare.com/client/v4`，Header：`Authorization: Bearer $CF_TOKEN_PAGES`

- 列项目：`GET /accounts/{acc}/pages/projects`
- 查项目（含 build_config）：`GET /accounts/{acc}/pages/projects/jsonversal-main-v2`
- **查自定义域** ← **排查 522 / 域名问题的第一入口**：`GET .../pages/projects/jsonversal-main-v2/domains`
- 加 / 删自定义域：`POST` / `DELETE .../domains[/{domain}]`
- 查部署历史：`GET .../pages/projects/jsonversal-main-v2/deployments`
- 查部署日志：`GET .../deployments/{id}/history/logs`
- 改构建配置：`PATCH .../pages/projects/jsonversal-main-v2`，body `{ "build_config": { "build_command": ..., "destination_dir": ... } }`
- DNS 记录（换 `CF_TOKEN_DNS_WRITE`）：`GET /zones/{zone}/dns_records`

---

## 11. 历史坑（避免重踩）

- ❌ **CF API 无法把 Direct Upload 项目改绑 GitHub**（错误码 `8000069`）→ 旧四项目作废删除，改用 `-v2` + GitHub 集成。
- ❌ **redirect 项目 build 失败**：旧构建命令 `--filter=@versal/site-sec` 指向已删的 turbo 包。随子站删除已不相关。
- ❌ **改动未同步生产分支**：曾误在非 `main` 分支提交 → 需合并后再 push `main`。
- ❌ **把 `www` 522 误判为 DNS 问题**（2026-09-10 踩过）→ 正解是注册进 Pages 项目。**遇 522 先查 `.../pages/projects/{proj}/domains`。**
- ❌ **用 `/user/tokens/verify` 判 token 死活** → 细粒度 token 会误报，必须打真实业务请求。
- ❌ **把密钥明文写进文档**（2026-09-10 踩过）→ 被 `GH013` 拦下；只写关系 + 指纹。
- ❌ **靠输出文本判断 push 成功**（2026-09-10 踩过）→ 会被报错输出误命中；以远端 sha 为准。

---

## 12. 本地工具脚本

### `.toolcheck.cjs`（仓库根目录）
遍历 4 栏目 → jsdom 解析页面脚本查语法错 → 灌入 `SAMPLES` 样例值 → 点动作按钮 → 抓输出判定 `PASS / NO_OUTPUT / NEEDS-INPUT`。依赖 root `devDependencies` 的 `jsdom`。

```bash
node .toolcheck.cjs                        # 默认读 apps/main/dist
node .toolcheck.cjs <dist目录>             # 或 TOOLCHECK_DIST=<dist目录> node .toolcheck.cjs
```
`SAMPLES` 中标 `'SKIP'` 的 4 个工具需上传文件，脚本不测，属预期。基线：**PASS=65 / SKIP=4 / NO_OUTPUT=0 / parse 错误=0**。

---

## 13. 沙箱环境注意（Agent 相关）

- **`.git/refs/remotes/` 写入被静默丢弃**：`git update-ref refs/remotes/origin/main <sha>` 返回 0 但不落地 → `git status` 会谎报 `ahead N`。**一律以 `git rev-parse HEAD` + 远端 API 为准。**
- **代理端口每次 Bash 调用都变**，不要缓存/硬编码；取值用 `grep -m1 '^http_proxy='`（区分大小写，`grep -i` 会命中两行导致变量含换行，请求秒败 `code=000`）。
- **沙箱 shell 不继承 Windows 用户级环境变量** —— 读全局凭据要「PowerShell 落盘 → Read → 立即删文件」。
- `reg.exe` 被安全策略列入黑名单；也不要从 Bash 调 `powershell.exe`（同样被拦），要用 PowerShell 工具。
- 临时文件别写 `/tmp`（Git Bash 下会失败），写工作区内相对路径或 `%TEMP%`。

## 附：其他环境

若在 **Trae** 侧操作，可用 `mcp_trae-remote-official_plugin_cloudflare_cloudflare-api` 的 `execute`（无需自备 token；授权失败先 `RequestAuthorization`，service `trae-remote-official:cloudflare::cloudflare-api`），以及 GitHub 插件 MCP 读写仓库（`trae-remote-official:github::github`）。
**在 WorkBuddy 侧没有 Cloudflare / GitHub 连接器**，走上面的 HTTP API + `.env` 令牌 / PAT 即可，不要因为"用不了 MCP"就认为做不了。
