# jsonversal.com 深度审核报告

> 审核日期：2026-09-10　　站点版本：`d4139e1`（线上已部署）
> 审核范围：合规（GDPR / ePrivacy / WCAG 2.1 AA / 无障碍）× 页面布局与交互
> 审核方式：**全部结论均为真机实测**——headless Edge + axe-core 注入、真实 DNS 查询、线上 HTTP 取证
> 覆盖样本：12 个页面 × 3 组合（桌面深色 / 桌面浅色 / 移动深色），另加 320px 回流与 Tab 序实测
>
> 说明：本文为产品与工程层面的合规评估，不构成法律意见；涉及具体司法辖区定性的条目建议由律师复核。

---

## 一、结论摘要

**整体健康度：良好。** 上一轮把最重的两块（字体版权 + 对比度）解决得很干净，本轮实测**没有任何对比度、回流、触控尺寸或键盘焦点缺陷**。问题集中在三类：

| 类别 | 数量 | 说明 |
|---|---|---|
| 🔴 P0 法律与事实准确 | 5 | 联系邮箱不可用、同意文案失实、声明了未启用的分析、"运营者是谁"缺失、软 404 |
| 🟠 P1 无障碍硬缺陷 | 5 | 移动端表格语义丢失、链接仅靠颜色、表单缺标签、零安全响应头 |
| 🟡 P2 体验与一致性 | 7 | 标题层级、条款单薄、Esc 关不掉菜单、www 未归一 等 |

**一句话**：合规的"骨架"是对的（本地优先、无 cookie、无第三方、字体自托管），但**对外声明的部分与实际不符**——这恰恰是合规审核最容易出事的地方；另一处硬伤是法律页的移动端表格对读屏用户完全失效。

---

## 二、先说通过项（不必重复投入）

以下均为**实测通过**，不是推断：

| 项目 | 实测结果 |
|---|---|
| 色彩对比度 | 14 页 × 深/浅 = **28 组合，0 项不达标**（含渐变文字按最差色停判定） |
| WCAG 1.4.10 回流 | **320px 视口（≈1280px 的 400% 缩放）7 个页面全部无横向滚动** |
| WCAG 2.5.8 触控目标 | 36 类直接达标；12 类属行内豁免；36 类经**间距豁免**通过；**0 类真正不达标** |
| 键盘焦点 | 首页前 8 个 Tab 停留点**全部**有 2px 实线焦点环；skip-link 是第一个停留点 |
| 标题结构 | **每页恰好 1 个 `<h1>`** |
| 尾斜杠 | `/privacy` → **308** → `/privacy/`，全站一致 |
| 协议 | `http://` → **301** → `https://`（apex 与 www 均如此） |
| Cookie | 响应头 **`Set-Cookie` 数量 = 0** |
| 第三方请求 | 线上 HTML 中 `<script>/<link>` 外部域名 = **0**（仅 `https://jsonversal.com`） |
| 字体 | 自托管于 `/fonts/`，OFL 全文同目录；无任何字体 CDN |
| sitemap | **80 / 80 全部 200** |
| 语言与动效 | `<html lang="en">`；`prefers-reduced-motion` 已适配 |

---

## 三、P0 —— 法律与事实准确性

### P0-1 🔴 对外公开的联系邮箱收不到信

**证据**

```
dns.resolveMx('jsonversal.com')  →  ENODATA          （域存在，但无 MX 记录）
TXT jsonversal.com               →  "v=spf1 -all"    （显式声明本域不发送邮件）
```

**影响**

`hello@jsonversal.com` 同时出现在 **Privacy Policy 的 Contact 段** 与 **Licenses 页的"报告署名问题"段**。DNS 层无 MX 意味着邮件**无法投递**：

- GDPR 第 13(1)(a)(b) 条要求向数据主体提供**控制者的身份与有效联系方式**；第 15–22 条的权利需要可达的行使通道。邮箱失效 = 权利条款形同虚设。
- 消费者透明度层面，公示一个不可用的联系方式亦属误导。

**修复建议**（任选其一，都很轻）

1. **最省事**：用 Cloudflare Email Routing（免费）把 `hello@jsonversal.com` 转发到你的常用邮箱，只需在 CF DNS 加 MX + TXT。
2. 换成确实可用的地址（例如现有域名的邮箱）。
3. 若确实不想维护邮箱，改为只提供一个**可用的工单/表单入口**，并同步修改两处文案。

> ⚠️ 这项优先级最高：它直接决定"用户能不能行使权利"，是审核者最常第一个点的项。

---

### P0-2 🔴 同意条文案描述了并不存在的处理

**证据** — `packages/ui/ConsentBanner.astro`：

> "We respect your privacy. We only set necessary cookies. **Personalized ads are only loaded if you consent.**"

而实际：

- 全站 **`Set-Cookie` = 0**，只用 `localStorage` 存两个键（主题、同意状态）。
- 源码与线上产物中**没有任何广告代码**。
- Privacy Policy 明写 "We do not set advertising or tracking cookies"、"We do not sell personal data and do not use it for advertising"。
- Licenses 页明写 "**no advertising**, no trackers"。

**影响**

三处口径互相打架，且同意条自己虚构了一个"个性化广告"处理。这是 GDPR 第 5(1)(a)（合法、公平、透明）与第 12 条（信息须清晰且**准确**）层面的问题；在德国还可能被认定为误导性商业陈述（UWG）。

另外 "necessary cookies" 用词也不准——**没有任何 cookie**。

**修复建议**

推荐**直接移除该同意条**。理由：站点只使用严格必要的本地存储（主题偏好 + 同意状态），依据 ePrivacy 第 5(3) 条**本就不需要征求同意**；条本身不必要的条反而制造了三重风险（文案失实、遮挡内容、无拒绝途径）。

若你希望保留一个提示（用于"我们不用 cookie"的正面表达），改成**信息性一行**、不叫 consent：

```
We use no tracking cookies. Your theme preference is stored locally on your device.
→ Privacy Policy
```

---

### P0-3 🔴 隐私政策与许可页声明了**并未启用**的 Cloudflare Web Analytics

**证据**

- 线上首页 HTML 中 **不存在** `static.cloudflareinsights.com`，也没有 `data-cf-beacon`。
- 线上 HTML 的外部资源域名计数 = **0**。
- 而 Privacy Policy 写 "We use Cloudflare Web Analytics (no cookies, no personal identifiers) to count page views"，Licenses 页写 "**The only external request is the Cloudflare Web Analytics beacon**"。

原因很清楚：`BaseLayout.astro` 里只有当 `PUBLIC_CF_WEB_ANALYTICS_TOKEN` 存在时才注入信标，而 CF Pages 构建环境里没有配这个变量。

**影响**

好消息是实时情况比声明的更干净（真的零分析与零第三方请求）。但**声明了不存在的处理同样是信息不准确**（GDPR 第 13 条）。此外有一处自相矛盾必须一并理顺：Licenses 页的小标题叫 "**No third-party requests at runtime**"，其下第一条却说 "The only external request is the Cloudflare Web Analytics beacon"。

**修复建议**（二选一，别两头都不落地）

- **A｜保持零分析**：删去隐私政策与许可页中所有分析相关表述，改为一句话——"We run no analytics and make no third-party requests."；并修正 Licenses 页那个自相矛盾的小标题。
- **B｜确实启用**：在 CF Pages 配置 `PUBLIC_CF_WEB_ANALYTICS_TOKEN`，让信标真的加载；同时保留现有披露，并补上处理的**法律依据**（第 6(1)(f) 正当利益）与**保留期限**。

> 我倾向 A：以你站点"数据不出浏览器"的定位，零分析本身就是一个强卖点，写在首页比藏起来更有价值。

---

### P0-4 🔴 全站没有任何"运营者是谁"的信息

**证据**：页脚仅有 `© 2026 jsonversal.com`；`privacy` 段通篇用 "we / us"，未给出任何法律主体名称或地址；全站检索 `impressum` / 控制者身份字段无结果。

**影响**

- GDPR 第 13(1)(a)：必须告知控制者的**身份与联系方式**。"我们"不构成身份。
- 德国 DDG（原 TMG）第 5 条要求商业网站在线提供**名称与地址**等。
- 另需评估 GDPR 第 27 条：若控制者位于欧盟境外、且向欧盟数据主体提供服务，通常需指定**欧盟代表**（豁免条件很窄，公开网站一般难以主张"偶发处理"）。这条请交由律师判断。

**修复建议**

1. 在页脚与隐私政策中补上控制者信息：主体名称、通信地址、可用邮箱。
2. 若面向欧盟用户且主体在境外，评估是否需要欧盟代表，并在隐私政策中披露其名称与地址。
3. 若你不想公开个人住址，可用一个可收信的商用地址或虚拟办公地址。

---

### P0-5 🔴 任意不存在的 URL 都返回 200 + 首页内容（软 404）

**证据**

| 请求 | 实际返回 |
|---|---|
| `/this-does-not-exist-xyz/` | **200**，标题 = `Free Browser-Based Developer Tools`，38897 B（首页内容） |
| `/a/b/c/d/e/f/` | **200** + 首页内容 |
| `/wp-login.php` | **200** + 首页内容 |
| `/中文不存在/` | **200** + 首页内容 |

代码库中**没有 `404.astro`**，也没有 `_redirects`——Cloudflare Pages 在找不到匹配文件时回退到了根 `index.html`。

**影响**

- **SEO**：搜索引擎可索引无限个内容相同的 URL（重复内容 + 浪费抓取预算），Search Console 会报"软 404"。
- **安全观感**：`/wp-login.php` 返回 200 会让漏洞扫描器误判"这里有个登录入口"。
- **用户体验**：输错地址的人看不到任何"找不到页面"的提示。

**修复建议**：新增 `apps/main/src/pages/404.astro`，用 `BaseLayout` 包裹并把文案写成"页面不存在 + 返回工具列表"。Astro 会输出 `404.html`，CF Pages 自动以 **404 状态**返回它。

---

## 四、P1 —— 无障碍硬缺陷与安全加固

### P1-1 🟠 移动端法律页表格的语义**完全丢失**（WCAG 1.3.1 A）

**证据**（390px 视口，可访问性树快照）

```
表1/表2/表3: display=block | role=(无显式 role) | tabindex=无 | 可横向滚动=true
可访问性树全部角色: {"WebArea":1,"link":17,"button":3,"heading":8,"text":58}
                                  ↑ 没有 table / row / cell / columnheader
```

根因在 `licenses/index.astro` 的媒体查询：

```css
@media (max-width: 720px) {
  .lic-table { display: block; overflow-x: auto; white-space: nowrap; }
}
```

**直接在 `<table>` 上写 `display: block` 会让浏览器放弃表格语义**——实测三个表在可访问性树里彻底不存在行/列角色，读屏用户听到的是一串扁平文本，**无法知道哪个许可证对应哪个资产**。

**修复建议**：把"可滚动"交给**外层容器**，保留表格自身的 `display`：

```html
<div class="lic-scroll" role="region" aria-label="Third-party code licenses" tabindex="0">
  <table class="lic-table"> … </table>
</div>
```
```css
@media (max-width: 720px) {
  .lic-scroll { overflow-x: auto; }
  .lic-table  { white-space: nowrap; }   /* 注意：不要改 display */
}
```

> 顺带修掉 axe 报的 `scrollable-region-focusable`：外层 `tabindex="0"` 让**键盘用户也能横向滚动**（WCAG 2.1.1）。目前他们完全滚不动。

---

### P1-2 🟠 链接仅靠颜色区分（WCAG 1.4.1 A）

**证据**（实测链接色 vs 周边文字色的对比，要求 ≥ 3:1）

| 位置 | 深色主题 | 浅色主题 |
|---|---|---|
| 正文内链接（privacy / licenses） | `#7b7ef3` on `#e7eaf0` = **2.85:1** ❌ | `#4f46e5` on `#10141c` = **2.93:1** ❌ |
| 面包屑（main 栏目） | — | `#4f46e5` on `#4c5464` = **1.21:1** ❌ |
| 面包屑（sec 栏目） | — | `#c81e1e` on `#4c5464` = **1.33:1** ❌ |

面包屑那两行尤其糟：浅色下强调色的**亮度**和 `--text-muted` 几乎相同，也就是说链接几乎**只靠色相**区分——对色觉障碍用户等于没有区分。

**修复建议**（最稳且改动最小）：给正文与面包屑链接加下划线。

```css
#main p a, #main li a, .breadcrumbs a { text-decoration: underline; text-underline-offset: 2px; }
```

下划线是 WCAG 明确认可的"非颜色"区分手段，一次改完所有主题与栏目。

---

### P1-3 🟠 两个表单控件缺可访问名称（axe critical，WCAG 4.1.2 A / 1.3.1）

**证据** — `/sec/tools/password-generator/`：

```html
<label class="text-muted">Length (8–64)</label>
<input id="len" type="number" min="8" max="64" value="20" />
```

`<label>` 既没有 `for="len"`，也没把 input 包进去 → 两者**没有关联**，读屏只会念一个没有名字的数字输入框。`#count` 同样。

同页的 4 个复选框写法是**正确**的（`<label>…<input id="upper">…</label>`），说明这只是两处遗漏。

**修复建议**

```html
<label class="text-muted" for="len">Length (8–64)</label>
<input id="len" type="number" min="8" max="64" value="20" />
```

> 建议顺手全站扫一遍同类写法：`grep -rn '<label' apps/main/src/pages | grep -v 'for='`，凡是后面紧跟 `<input id=` 却没写 `for` 的都按上面改。本例是 axe 抓到的，未被覆盖到的页面可能还有。

---

### P1-4 🟠 零安全响应头（`_headers` 缺失）

**证据** — 线上实际响应头：

```
✅ x-content-type-options: nosniff
✅ referrer-policy: strict-origin-when-cross-origin
❌ 缺 Content-Security-Policy
❌ 缺 Strict-Transport-Security
❌ 缺 Permissions-Policy
❌ 缺 X-Frame-Options / CSP frame-ancestors
❌ 缺 Cross-Origin-Opener-Policy
（另：HTML 响应带 Access-Control-Allow-Origin: *，可收紧）
```

**影响**：缺 HSTS 意味着首次访问仍可能被降级劫持；缺 `frame-ancestors` 可被 iframe 嵌套做点击劫持；缺 CSP 少了一层纵深防御，对 GDPR 第 32 条（处理安全性）也是减分项。

**额外一层尴尬**：站点里有一个 **`/sec/tools/csp/` 专门生成 CSP 的安全工具**，而站点自己不下发 CSP。

**修复建议**：新增 `apps/main/public/_headers`（Cloudflare Pages 原生支持，无需改构建）：

```
/*
  Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), camera=(), microphone=(), payment=(), usb=()
  X-Frame-Options: DENY
  Cross-Origin-Opener-Policy: same-origin
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'none'
```

**注意两点**：

1. 站点用了 `<script is:inline>`（主题初始化、同意条、导航）与内联 `style`，所以 `script-src` / `style-src` 目前必须留 `'unsafe-inline'`。想彻底收紧需要给这些内联脚本加 nonce 或 hash——可以列为后续增强。
2. **先在 CF Pages 的 preview 部署上验证**再上 main，避免 CSP 写错导致全站白屏。或者先用 `Content-Security-Policy-Report-Only` 观察一段时间。

---

### P1-5 🟠（与 P1-1 同源）横向滚动容器键盘不可达

axe 报 `scrollable-region-focusable`（WCAG 2.1.1 / 2.1.3，serious）：`/licenses/` 的移动端表格容器可横向滚动但不接受焦点，**键盘用户无法滚到右侧列**（如"License"列）。按 P1-1 的方案给外层容器加 `tabindex="0"` + `role="region"` + `aria-label` 即可一并解决。

---

## 五、P2 —— 体验与一致性

| # | 问题 | 证据 / 说明 | 建议 |
|---|---|---|---|
| P2-1 | **标题层级跳跃** | axe `heading-order`：工具卡用 `h3` 直接接在 `h1` 下（跳过 `h2`），8 页 24 处；页脚列标题用 `h4` | 工具卡标题降为 `h2`（或在卡片区外包一个 `h2` 分组标题）；页脚列标题改为 `h2`，或直接用非标题元素（`nav[aria-label]` 已提供可访问名称） |
| P2-2 | **`/terms/` 条款过于单薄** | 全文仅 3 段：使用、免责、联系。无适用法律与管辖、无责任限制、无知识产权、无变更条款；邮箱是纯文本不可点（与 privacy 页不一致） | 补齐上述条款；邮箱加 `<a href="mailto:">` |
| P2-3 | **密码学工具的合规免责缺位** | 站内提供 AES / RSA 密钥生成 / 口令生成等工具，Terms 只有一句 "provided as is" | 在 Terms 补：禁止非法用途、用户对输出负责、**出口管制/加密软件**相关声明（跨境提供加密工具在部分辖区有管制要求，建议律师过一眼） |
| P2-4 | **移动端导航 Esc 关不掉** | 实测：点汉堡展开 ✓，按 Escape 后**仍然展开** ❌；也没有"点击外部关闭" | 给 `#nav-toggle` 加 `keydown` 监听 `Escape` 关闭并回焦到按钮；`document` 上监听点击外部关闭 |
| P2-5 | **`www` 未归一** | `https://www.jsonversal.com/` 返回 **200**（不是 301 到 apex）。canonical 已指向 apex，搜索引擎会自行合并 | 加一条 `_redirects` 或 CF 规则：`www` → `301` → apex，更干净 |
| P2-6 | **同意条遮挡内容且只能"接受"** | 移动端实测：固定条与页面最后一个复选框**重叠 0px**；只有一个 "Accept necessary only" 按钮，**无关闭 / 无拒绝** | 按 P0-2 建议直接移除；若保留，需加关闭按钮并让其可被 Esc 关闭 |
| P2-7 | **主题切换按钮语义重复** | 同时使用「随状态变化的名字」（`Switch to light/dark theme`）与 `aria-pressed`。二者叠加会让读屏播报冗长且语义含糊 | 二选一：保留 `aria-pressed` 则名字固定为 "Dark theme"；或保留变化的名字则去掉 `aria-pressed` |
| P2-8 | **缺 `og:image`** | `BaseLayout.astro` 有 `og:type/title/description/url`，无 `og:image` | 加一张 1200×630 的品牌图，社交分享有预览 |

---

## 六、建议的推进顺序

**第一批（本周，均为低风险小改动，收益最大）**

1. P0-1 开通邮箱或换联系方式 —— *必须你来操作*（CF Email Routing 或提供可用邮箱）
2. P0-2 改/删同意条文案
3. P0-3 统一"是否做分析"的口径（建议保持零分析）
4. P0-5 加 `404.astro`
5. P1-3 修 `#len` / `#count` 的 label 关联 + 全站扫同类

**第二批（下一轮，需要一点验证）**

6. P1-1 + P1-5 表格外层容器方案（同时修好语义与键盘滚动）
7. P1-2 正文与面包屑链接加下划线
8. P1-4 加 `_headers`（**先在 preview 部署验证 CSP**）
9. P2-1 标题层级

**第三批（内容与策略，需要你的判断）**

10. P0-4 运营主体身份 + 是否需欧盟代表（建议律师确认）
11. P2-2 / P2-3 补齐 Terms
12. 其余 P2 项

---

## 七、复核方法（每条都有对应命令）

```bash
# 对比度 + 渐变文字（真机）        —— 见 audit 脚本（28 组合）
# axe 无障碍扫描                   —— page.addScriptTag({path:'axe-core/axe.min.js'}) 后 axe.run()
# 320px 回流                       —— viewport 320 下比较 documentElement.scrollWidth 与 innerWidth
# 触控目标间距豁免                  —— 以目标中心为圆心、半径 12 的圆是否与其他目标矩形相交
# 键盘焦点可见                      —— 连续 Tab，读 activeElement 的 computed outline
# 表格语义                          —— page.accessibility.snapshot() 统计 table/row/cell 角色
# 邮箱可用性                        —— node -e "require('dns').resolveMx('jsonversal.com',console.log)"
# 安全响应头                        —— curl -sD - -o /dev/null https://jsonversal.com/
# 软 404                            —— curl -o /dev/null -w '%{http_code}' https://jsonversal.com/<随机路径>/
```

两个**本机环境的假象**，复核时别被误导：

- `curl -o /dev/null -w '%{size_download}'` 恒返回 `0B` 且 exit 23 —— 要量体积请落到真实文件。
- `--noproxy '*'` 必须显式带上，否则请求会被沙箱代理影响。

---

*报告完 · 共 17 项发现（P0 5 / P1 5 / P2 8）*
