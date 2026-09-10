# design-system —— 合规整改档案（只读存档）

本目录记录 **jsonversal.com 面向欧美市场的合规整改**过程与证据，**不是运行时资产**。
线上样式唯一来源是 `packages/ui/base.css`。

| 文件 | 性质 | 状态 |
|---|---|---|
| `COMPLIANCE.md` | 合规评估与整改报告（法源、逐项对照、整改清单、复核方法） | ✅ 现行有效，随方案更新 |
| `SITE-AUDIT-2026-09-10.md` | **全站深度审核报告**（合规 × 无障碍 × 布局，17 项发现含真机证据） | ✅ 待整改清单已排优先级 |
| `tokens.css` | 设计令牌快照（深/浅双主题 + 分栏目色） | 📦 已并入 `packages/ui/base.css`，仅供比对 |
| `fonts.css` | Geist 自托管 `@font-face` 声明 | 📦 已并入 `packages/ui/base.css` |
| `aa-patch.css` | WCAG AA 修正补丁（对比度、渐变作用域、跳转链接等） | 📦 已全部应用，留作变更留痕 |

> ⚠️ **以 `base.css` 为准**。三个 CSS 是整改当时的补丁快照，此后不再单独维护；
> 若与 `base.css` 不一致，一律以 `base.css` 为正确值，并顺手同步本目录或直接删除对应快照。

配套的运行时事实：

- 字体：Geist / Geist Mono 自托管于 `apps/main/public/fonts/`（SIL OFL 1.1，许可全文同目录）
- 运行时第三方请求：**零**（含字体、脚本、样式；`yaml` 库亦已自托管于 `apps/main/public/vendor/`）
- 许可页：`/licenses/`（源码 `apps/main/src/pages/licenses/index.astro`）
