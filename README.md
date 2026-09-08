# jsonversal-monorepo

jsonversal 品牌矩阵 monorepo —— 通过 Astro 多 host 路由 + Cloudflare for SaaS 同时托管四个站点。

## 站点

| 子域名 | 主题 | 状态 |
|---|---|---|
| `jsonversal.com` | LLM 工程化（主站） | ✅ 已有 |
| `devops.jsonversal.com` | DevOps / 云原生工具 | 🚧 MVP |
| `codegen.jsonversal.com` | 代码/配置文件生成器 | 🚧 MVP |
| `sec.jsonversal.com` | 安全 / 加密 | 🚧 MVP |

## 架构

```
apps/
  main/       jsonversal.com
  devops/     devops.jsonversal.com
  codegen/    codegen.jsonversal.com
  sec/        sec.jsonversal.com
packages/
  ui/         共享组件（Header / Footer / Cookie 条 / 工具卡片）
  seo/        JSON-LD、og:image、sitemap 生成器
  config/     设计 token + 站点配置
  analytics/  Cloudflare Web Analytics 统一封装
  ads/        BuySellAds / Carbon Ads 接入层
```

## 本地开发

```bash
pnpm install
pnpm dev:devops   # http://localhost:4321
pnpm dev:codegen  # http://localhost:4322
pnpm dev:sec      # http://localhost:4323
```

## 部署

- **单仓库 + Astro 多 host 路由**：在 Cloudflare Pages 项目上绑定 4 个自定义主机名
- **DNS**：通过 Cloudflare for SaaS 自动签发 SSL
- **CI**：GitHub Actions 监听 `apps/*` 路径变更，触发 Cloudflare Pages 部署

## 变现

- 主站与三个子站同步接入 **BuySellAds / Carbon Ads**
- 隐私优先：仅在用户同意 Cookie 后才加载个性化广告