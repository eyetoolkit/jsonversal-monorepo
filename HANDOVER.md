# jsonversal 交接班文件

> 最新更新：2026-09-12 by Trae Agent
> 下一个 agent 接手时，先读本文件，再读 README.md 和 package.json

## 当前状态

| 项目 | 值 |
|------|-----|
| 本地工作区 | `/workspace`（沙箱内） |
| 远端备份/VPS 副本 | `root@101.96.194.237:/opt/jsonversal` |
| 生产分支 | `main` |
| 当前 HEAD | `3f86d21 seo: Rich Results structured data across all 69 tool pages` |
| 构建 | ✅ 通过（81 pages / 3.0M / ~5s） |
| Remote | `https://github.com/eyetoolkit/jsonversal-monorepo.git` |

## 环境要求

- Node v20+（VPS 上 v20.19.5，沙箱 v24.1.0 也 OK）
- pnpm **必须 10.11.1**（package.json 有 `packageManager` 锁定）
- 不要用 npm/yarn，会破坏 lockfile

## 部署链路

```
本地改代码 → pnpm build 自检 → git push origin main → CF Pages 自动构建 → jsonversal.com 上线
```

| 项目 | 详情 |
|------|------|
| CF Pages 项目 | `jsonversal-main-v2` |
| 构建命令 | `pnpm turbo run build --filter=@versal/site-main` |
| 产物目录 | `apps/main/dist` |
| 自定义域名 | `jsonversal.com` + `www.jsonversal.com` |
| DNS | CNAME → `jsonversal-main-v2.pages.dev` |
| 部署方式 | GitHub 集成，push main 自动触发 |

## 源码结构速查

```
apps/main/          ← 唯一 Astro 应用（所有页面）
  src/pages/
    index.astro     ← 首页
    tools/          ← 16 个 JSON/LLM 工具
    sec/            ← 18 个安全工具
    devops/         ← 17 个 DevOps 工具
    codegen/        ← 18 个代码生成器
    privacy/ terms/ ← 合规页
packages/
  config/           ← tokens.js, sites.js, tools-icons.js（全局配置）
  ui/               ← BaseLayout, Header, Footer, Hero, ToolCard, ToolGrid
```

## VPS 上的东西（远端 agent 可直接用）

| 路径 | 用途 |
|------|------|
| `/opt/jsonversal` | VPS 上完整克隆 + node_modules + wrangler |
| `/opt/env/jsonversal.env` | CF_API_TOKEN, GH_PAT（**有值**，不要泄露） |
| SSH 入口 | `ssh -F /root/.ssh_config vps`（沙箱里的 config） |

## 项目边界（重要！不要越界）

> 每个对话框/agent 负责**一个独立项目**，VPS 上各有专属目录，互不干扰。
> **你（jsonversal agent）只负责 jsonversal，不要读写下方其他路径。**

| 其他项目 | VPS 路径 | 归谁管 |
|----------|---------|--------|
| eyetoolkit.com | `/opt/eyetoolkit-site` | 另一个对话/agent |
| 博客群（6站） | `/opt/blog` | 另一个对话/agent |
| tri-sites（math/board/memory duel） | `/opt/tri-sites` | 另一个对话/agent |
| mquickcalc（健康/金融） | `/opt/mquickcalc-{site,finance,health}` | 另一个对话/agent |
| 通用凭据/脚本 | `/opt/env/*.env`、`/opt/scripts/*` | 共用但只读 |

**唯一例外**：`/opt/env/jsonversal.env` 是 jsonversal 专属的，你可以 source 它。
其余 `.env` 里的 token（如 `tri-sites.env`）不是你的，**不要在命令里引用它们**。

## 凭据清单（沙箱重置后需要补）

| 凭据 | 存储位置 | 作用 |
|------|----------|------|
| SSH 私钥 | 沙箱 `/tmp/ssh_key` | 连 VPS（**每次重置需要用户重新给**） |
| GitHub PAT | VPS `/opt/env/jsonversal.env` + `~/.git-credentials` | push 到私有仓库 |
| CF API Token | VPS `/opt/env/jsonversal.env` | wrangler deploy / CF API |

## 日常 SOP

```bash
# 开发
cd /workspace
git pull origin main          # 先同步远端
pnpm build:main               # 或 turbo run build --filter=@versal/site-main
# 改代码...

# 自测
pnpm build:main && ls apps/main/dist/

# 部署
git add -A
git commit -m "feat: xxx"
git push origin main          # CF Pages 自动构建上线
```

## 沙箱重置恢复步骤

1. 用户重新提供 SSH 私钥
2. `cat > /tmp/ssh_key << 'EOF'...EOF && chmod 600`
3. `ssh root@101.96.194.237`（需 ProxyCommand 走 127.0.0.1:18080 CONNECT）
4. 从 VPS rsync 源码：`rsync -av -e "ssh ..." --exclude='node_modules' vps:/opt/jsonversal/ /workspace/`
5. 同步 `.git`：`rsync -av vps:/opt/jsonversal/.git/ /workspace/.git/`
6. `npm i -g pnpm@10.11.1 && pnpm install`
7. `pnpm build:main` 验证

## 注意事项

- **不要碰 pnpm-lock.yaml**，除非你明确要加/删依赖
- **不要部署 apps/{sec,devops,codegen} 子目录**，它们已整合进 apps/main 的子路径
- 共享配置改了（packages/config/tokens.js 等），记得重跑 build
- 工具详情页模板统一用 `ToolCard.astro` 组件，保持风格一致
- 构建产物约 3MB，81 页面，5 秒以内完成

## 待办事项（继承）

- [ ] （无待办，接手者自行规划）
