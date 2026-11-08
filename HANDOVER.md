# jsonversal 交接班文件
---

## ⚠️ 现状对照（2026-11-08 实测，`D1D2-STATUS-20261108`）

> **本文件是 2026-09-13 的交接快照，不是当前状态清单。** 下文「当前状态」「工具清单（54 个）」
> 「81 页面 / 80 URLs」「HEAD `122acb1`」「VPS 备份 /workspace」等均为历史值。
> 现行排期与待办见 `C:\TOOL\tools-roadmap-20261108.html`，部署核实结论见下。

| 本文件原口径 | 2026-11-08 实测 |
|---|---|
| HEAD `122acb1` | 远端 `main` = `a914a3bbe`（2026-11-08 埋点提交；本次文档提交后会前进） |
| 工具 54 个 / 81 页面 / sitemap 80 URLs | 工具 **85** 个；源码 **95 个 Astro 页 + 12 个静态 HTML**；线上 sitemap **105**（7 张子表：main 34 / sec 16 / devops 19 / codegen 20 / compare 11 / trust 2 / legal 3） |
| `/about/` `/contact/`：未提 | **两页均 404**；`SITE-AUDIT-2026-09-10` 曾实测域名无 MX、公示邮箱不可达（待办 B5） |
| 广告：未提 | 当前**无任何广告容器**：11-07 `e15c53b0b` 加入 `CarbonAds.astro` + CSP 白名单，11-08 `2be7e1c40` 埋点提交误删，待办 B6 需定广告网络方向 |
| 埋点：未提 | 五站 `/__uv` 第一方匿名 UV 已全量覆盖；本仓 11 个独立 `/compare/` 静态页由 `tools/geo-gen/gen-compare.mjs` 生成，产物与生成器模板必须同步改 |
| 构建命令 `npx pnpm install && turbo...` | CF Pages 实测：`npx --yes pnpm@10.11.1 install --prefer-offline && npx --yes pnpm@10.11.1 --filter=@versal/site-main build`，产物 `apps/main/dist` |
| 部署链「CF Pages 自动构建」 | ✅ **仍然正确且是唯一入口**：`jsonversal-main-v2` 的 `source.type=github`、生产分支 `main`，最新生产部署为 `github:push` 且 commit 与远端 `main` 一致；仓库内 `.github/workflows` 无部署 workflow |
| 日常 SOP `cd /workspace && git push` | 现行工作区在 `C:\TOOL`；本地 clone 常落后远端且带改动，一律走 GitHub Git Data API 在远端 `main` 上精确改文件，不 `checkout -f` / `reset --hard` |

| 维度 | 2026-11-08 实测 |
|---|---|
| 生产站点 | mQuickCalc **4 个**：`mquickcalc` / `mquickcalc-finance` / `mquickcalc-health` / `mquickcalc-cover`（源码目录分别是 `packages/site-main` / `site-finance` / `site-health` / **`site-insurance`**） |
| 页面数 | mQC 源码 234 个 HTML、工具页 143 个，线上 sitemap 可索引 **204**（主 72 / finance 60 / health 41 / cover 31）；Jsonversal 源码 95 个 Astro 页 + 12 个静态 HTML，线上 sitemap **105** |
| 部署唯一入口 | `git push origin main` → GitHub Actions `deploy.yml`（mQC，wrangler 直传 4 站）；Jsonversal 由 CF Pages GitHub App `github:push` 自动构建 `jsonversal-main-v2` |
| 流量基线 | 近 7 天两站搜索会话 **0 / 0**、空 referer 100%；第一方严格 UV 目前只有 2026-11-08 一天（净 5：mQC 4 / JV 1），**0 不等于零访客** |
| 变现层 | mQC 234/234 页有 3 个广告容器但零 `ca-pub-` / `adsbygoogle`；Jsonversal 当前无广告容器；五域 `ads.txt` 全 404；GSC 五域站点侧未见验证痕迹 |
| 现行规划 | `C:\TOOL\tools-roadmap-20261108.html`（离线自包含，26 项待办；Stage 0 = 能测 / 能申请，明确不新增页面） |

> 交接纪律：改动仍由 CF Pages GitHub App 构建部署，**禁止直接 wrangler / pages deploy**；
> 静态资源改内容后同步 SW 版本、`/__uv` bypass 与 CF 定向 purge，并线上复验。

---

> 最新更新：2026-09-13 by Trae Agent
> 接手前必须先读本文件 → README.md → package.json

## 当前状态

| 项目 | 值 |
|------|-----|
| **本地工作区** | `/workspace`（沙箱内） |
| **VPS 备份** | `root@101.96.194.237:/opt/jsonversal` |
| **SSH 快捷入口** | `ssh -F /root/.ssh_config vps` |
| **生产分支** | `main` |
| ~~**当前 HEAD**~~ | 历史值 `122acb1`；2026-11-08 远端 `main` = `a914a3bbe` |
| **GitHub 地址** | `https://github.com/eyetoolkit/jsonversal-monorepo` |
| **CF Pages 项目** | `jsonversal-main-v2` |
| ~~**构建**~~ | 历史值 81 页面 / 80 URLs；2026-11-08 源码 95 Astro 页 + 12 静态 HTML，线上 sitemap 105 |
| **线上域名** | `jsonversal.com` + `www.jsonversal.com`（CF Pages active） |
| **Remote（VPS 配置）** | `https://eyetoolkit:***@ghfast.top/https://github.com/eyetoolkit/jsonversal-monorepo.git` |

## 工具清单（历史快照：54 个）

> ⚠️ 2026-11-08 实测工具 **85** 个、线上 sitemap **105** 条。以下分类与 slug 列表是 2026-09-13 状态，仅供追溯路由结构（`/tools/{slug}/` 扁平 vs `/sec|devops|codegen/tools/{slug}/` 多一层），不可用于统计。

### 路由结构（⚠️ 不对称，容易踩坑）

```
/tools/{slug}/           ← tools 扁平（无中间 /tools/ 段）
/sec/tools/{slug}/      ← sec 多一层 /tools/
/devops/tools/{slug}/   ← devops 多一层 /tools/
/codegen/tools/{slug}/  ← codegen 多一层 /tools/
```

巡检和 canonical URL 检查时注意这一点。

### 各栏目工具

| 栏目 | 数量 | 路由 | 列表 |
|------|------|------|------|
| **/tools** | 16 | `/tools/{slug}/` | json-diff, json-escape, json-formatter, json-schema-generator, json-schema-sample-generator, json-sorter, json-to-csharp, json-to-go, json-to-pydantic, json-to-typescript, json-to-zod, jsonpath-tester, llm-token-calculator, markdown-preview, text-diff, uuid-v7 |
| **/sec/tools** | 13 | `/sec/tools/{slug}/` | aes, bcrypt, file-checksum, hash, hmac, **jwt-decoder** ✨, jwt-generator, passphrase-generator, password-generator, random-token, rsa-keygen, secret-scanner, x509-decoder |
| **/devops/tools** | 10 | `/devops/tools/{slug}/` | base64, cidr-calculator, crontab, json-viewer, k8s-generator, log-parser, number-base, **qr-code-generator** ✨, regex, yaml-json |
| **/codegen/tools** | 15 | `/codegen/tools/{slug}/` | base64-image, csv-to-json, curl-to-fetch, curl-to-python, docker-compose, env-generator, gitignore, html-escaper, json-to-csv, json-to-python, json-xml, schema-to-typescript, sql-formatter, sql-generator, **sql-validator** ✨ |

> ✨ = 9/13 大迭代新增（或跨栏目迁移过来）

## 大迭代历史（9/13）

最近 7 个 commit 是一次大清洗迭代：

```
3c94a33  fix: qr-code-generator — replace broken custom QR algorithm with cdnjs qrcode-generator library
f0312a6  feat: add 3 new tools — jwt-decoder, sql-validator, qr-code-generator
fa5ae32  feat: remove 18 low-SEO-value and duplicate tools
0b0bf89  fix: tools canonical correct /sec/devops/codegen add tools/ segment
0414c2a  fix: sec/devops canonical URLs missing tools/ segment
d9510c6  content: add canonical + keywords to all tool pages
eeb5efd  seo: upgrade meta/FAQ for json-formatter, json-to-zod, json-to-typescript, json-to-go, json-to-csv
```

### 删除的 18 个工具

| 栏目 | 被删工具 |
|------|---------|
| **/sec/tools** | csp, csr, hash-identifier, password-encrypt, password-strength, totp |
| **/devops/tools** | http-status, jwt-decoder（移到 sec！）, nginx-config, ports-reference, systemd-unit, timestamp, url-codec, uuid-generator |
| **/codegen/tools** | ci-workflow, commit-msg, license, readme |

> jwt-decoder 从 devops 迁到了 sec（语义更准确），不是消失了。

## 部署链路（2026-11-08 复核：本段**仍然正确**，是唯一入口）

> `jsonversal-main-v2` 的 `source.type=github`、生产分支 `main`；最新生产部署 `deployment_trigger.type=github:push`，commit 与远端 `main` 一致。仓库 `.github/workflows` 只有 `pr-check.yml` / `push-test.yml` / `mcp-server-deploy.yml`，没有前端部署 workflow。ECS 侧的 `deploy-watchdog.timer` 只服务 eyetoolkit.com 集群，与本站无关。

```
本地改代码 → pnpm build:main 自检 → git push origin main → CF Pages 自动构建 → jsonversal.com 上线
```

| 项目 | 详情 |
|------|------|
| 构建命令（CF Pages） | `npx pnpm install && npx pnpm turbo run build --filter=@versal/site-main` |
| 产物目录 | `apps/main/dist` |
| 框架 | Astro 4.16.19 |
| 项目名 | `jsonversal-main-v2` |
| 绑定域名 | `jsonversal.com`, `www.jsonversal.com`（均 active） |
| DNS | CNAME → `jsonversal-main-v2.pages.dev` |

## 源码结构

```
apps/main/                    ← 唯一 Astro 应用
  src/pages/
    index.astro               ← 首页
    tools/*.astro             ← 16 个 JSON/LLM 工具（扁平）
    sec/tools/*.astro         ← 13 个安全工具（嵌套）
    devops/tools/*.astro      ← 10 个 DevOps 工具（嵌套）
    codegen/tools/*.astro     ← 15 个代码生成器（嵌套）
    sec/index.astro           ← sec 栏目页
    devops/index.astro        ← devops 栏目页
    codegen/index.astro       ← codegen 栏目页
    privacy/index.astro       ← 隐私合规
    terms/index.astro         ← 服务条款
packages/
  config/                     ← tokens.js, sites.js, tools-icons.js（全局配置）
  ui/                         ← BaseLayout, Header, Footer, Hero, ToolCard, ToolGrid
```

## 环境要求

- Node v20+（VPS v20.19.5，沙箱 v24.1.0 也 OK）
- **pnpm 必须 10.11.1**（package.json 有 `packageManager` 锁定）
- 不要用 npm/yarn，会破坏 lockfile

## 凭据清单

| 凭据 | 存储位置 | 作用 |
|------|----------|------|
| SSH 私钥 | `/tmp/ssh/key`（沙箱每次重置需重写） | 连 VPS |
| GitHub PAT（用于 ghfast.top 代理） | VPS `~/.gitconfig` + `/opt/env/jsonversal.env` | push 私有仓库 |
| CF API Token | VPS `/opt/env/jsonversal.env` | CF Pages API / wrangler |
| 沙箱内 `GH_TOKEN` | 环境变量（可能有） | 沙箱直接 git fetch |

## 日常 SOP

```bash
# 开发
cd /workspace
git fetch origin && git log HEAD..origin/main --oneline  # 先看有没有新提交
git pull origin main                                      # 同步
pnpm install                                              # 拉新依赖后
pnpm turbo run build --filter=@versal/site-main           # 本地构建自检
# 改代码...
pnpm turbo run build --filter=@versal/site-main           # 改完再自检

# 部署
git add -A
git commit -m "feat: xxx"
git push origin main                                      # CF Pages 自动构建上线
```

## 注意事项

- **sitemap.xml 自动生成**：`apps/main/public/sitemap.xml` 已删除！现在通过 `apps/main/scripts/generate-sitemap.cjs` 在 build 后自动扫描 `dist/` 生成（build 命令已包含此调用）。**不要手动编辑 sitemap.xml**，新增/删除工具后自动正确。
- **不要碰 pnpm-lock.yaml**，除非明确加/删依赖
- **canonical URL 格式**：`/sec/tools/{slug}/` 必须带中间 `/tools/`，tools 栏目不带
- **共享配置改了**（packages/config/*），记得重跑 build
- **工具详情页**统一用 `ToolCard.astro` 组件
- **新增工具**时别忘了改 `packages/config/tools-icons.js`（slug → emoji 映射）和 `packages/config/sites.js`
- VPS 上的 `.git remote` 走 `ghfast.top` 代理，沙箱直接走 GitHub

## 项目边界（重要！不要越界）

> 每个对话框/agent 负责一个独立项目，VPS 上各有专属目录。
> **你只负责 jsonversal，不要读写下方路径。**

| 其他项目 | VPS 路径 | 归谁管 |
|----------|---------|--------|
| eyetoolkit.com | `/opt/eyetoolkit-site` | 另一个对话/agent |
| 博客群（6站） | `/opt/blog` | 另一个对话/agent |
| tri-sites（math/board/memory duel） | `/opt/tri-sites` | 另一个对话/agent |
| mquickcalc（健康/金融） | `/opt/mquickcalc-{site,finance,health}` | 另一个对话/agent |

**唯一例外**：`/opt/env/jsonversal.env` 是 jsonversal 专属的，可以 source。
其余 `.env` 里的 token 不是你的，不要引用。

## 沙箱重置恢复步骤

1. 用户重新提供 SSH 私钥
2. `mkdir -p /tmp/ssh && chmod 700 /tmp/ssh`
3. `cat > /tmp/ssh/key << 'EOF'...EOF && chmod 600 /tmp/ssh/key`
4. 写 `/root/.ssh_config`（Host vps, HostName 101.96.194.237, User root, IdentityFile /tmp/ssh/key, ProxyCommand `nc -X connect -x 127.0.0.1:18080 %h %p`）
5. 沙箱如果带了 `GH_TOKEN`，直接 `git fetch origin main` 拉；否则走 VPS 代理
6. `git pull origin main`
7. `pnpm install`
8. `pnpm turbo run build --filter=@versal/site-main` 验证

## 待办事项（继承）

- [ ] （无待办，接手者自行规划）
