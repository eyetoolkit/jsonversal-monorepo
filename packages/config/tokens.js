/**
 * 共享设计 token —— 4 栏目差异化色彩 + 字体 + 间距
 *
 * ⚠️ 运行时的样式来源是 packages/ui/base.css。本文件承载：
 *    · sites[]                       —— JS 侧取色（<meta theme-color>、favicon、SEO 文案）
 *    · colors / colorsLight / fonts / radius / shadow —— 设计规范参考值
 *
 * ⚠️ 同步约定：sites[].accent / accentDark / accentText（深色主题）与
 *    sites[].light.*（浅色主题）逐项对应 base.css 中的 .site-* 与
 *    [data-theme="light"] .site-* 色彩表。
 *    之所以运行时不再用内联 style 注入：浅色模式下 devops 绿 / codegen 橙
 *    必须换成更深的值才能达 WCAG 图形阈值 3:1，sec 红还要再深一档才能让
 *    页脚品牌渐变字在 --bg-deep 上达 4.5:1；单套内联值无法按主题切换，
 *    故改由 CSS 按主题声明，此处仅作同源记录。改动请两边同步。
 */

export const tokens = {
  // 各子站品牌色（仅一处定义、跨站一致）
  sites: {
    main: {
      name: 'jsonversal',
      host: 'jsonversal.com',
      accent: '#6366f1',
      accentDark: '#4f46e5', // 白字 6.29:1
      accentText: '#7b7ef3', // 链接/文字 4.53:1（最差）
      light: { accent: '#6366f1', accentDark: '#4f46e5', accentText: '#4f46e5' }, // 品牌渐变字 on --bg-deep 5.81:1
      emoji: '🟦',
      tagline: 'JSON that runs in your browser',
      title: 'Free Browser-Based Developer Tools',
    },
    devops: {
      name: 'devops.versal',
      host: 'devops.jsonversal.com',
      accent: '#10b981',
      accentDark: '#047857', // 原 #059669 白字仅 3.77:1，已压暗
      accentText: '#10b981', // 7.66:1 on dark bg
      light: { accent: '#059669', accentDark: '#047857', accentText: '#047857' }, // #10b981 浅底仅 2.54:1
      emoji: '🟢',
      tagline: 'DevOps tools that run in your browser',
      title: 'Free Browser-Based DevOps Tools',
    },
    codegen: {
      name: 'codegen.versal',
      host: 'codegen.jsonversal.com',
      accent: '#f59e0b',
      accentDark: '#b45309', // 原 #d97706 白字仅 3.18:1，已压暗
      accentText: '#f59e0b', // 9.05:1 on dark bg
      light: { accent: '#d97706', accentDark: '#b45309', accentText: '#b45309' }, // #f59e0b 浅底仅 2.15:1
      emoji: '🟡',
      tagline: 'Generate config files in your browser',
      title: 'Free Browser-Based Code Generators',
    },
    sec: {
      name: 'sec.versal',
      host: 'sec.jsonversal.com',
      accent: '#ef4444',
      accentDark: '#dc2626', // 白字 4.83:1
      accentText: '#f87171', // 原 #ef4444 作文字仅 4.16:1，已提亮
      light: { accent: '#ef4444', accentDark: '#c81e1e', accentText: '#c81e1e' }, // 原 #dc2626 在 --bg-deep 上仅 4.46:1
      emoji: '🔴',
      tagline: 'Cryptography that runs in your browser',
      title: 'Free Browser-Based Security Tools',
    },
  },

  // 深色主题全局 token（与 base.css :root 对齐；仅作规范参考，不参与运行时）
  colors: {
    bg: '#0b0d12',
    bgDeep: '#08090d',
    surface: '#14171f',
    surfaceAlt: '#1a1e28',
    surface2: '#20252f',
    surfaceCode: '#1a1e28',
    border: '#262b36',
    borderStrong: '#333947',
    borderInput: '#5c6983', // 表单边界：3.02:1 on surface-alt
    text: '#e7eaf0',
    textMuted: '#9aa3b2',
    textDim: '#838c9c', // 原 #6b7484 最差仅 3.54:1，已提亮
    success: '#34d399',
    warning: '#fbbf24',
    danger: '#f87171',
  },

  // 浅色主题全局 token（与 base.css [data-theme="light"] 对齐；参考值）
  colorsLight: {
    bg: '#ffffff',
    bgDeep: '#f4f6f9',
    surface: '#f8f9fb',
    surfaceAlt: '#ffffff',
    surface2: '#edf0f4',
    surfaceCode: '#f5f7fa',
    border: '#e3e7ed',
    borderStrong: '#cbd2db',
    borderInput: '#8891a1', // 3.02:1 on surface
    text: '#10141c',
    textMuted: '#4c5464',
    textDim: '#656e7d', // 4.50:1 on surface-2（最差）
    success: '#047857',
    warning: '#b45309',
    danger: '#dc2626',
  },

  // 自托管 Geist —— SIL OFL 1.1，无任何第三方字体 CDN（GDPR 合规）
  fonts: {
    body: '"Geist", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"Geist Mono", ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  },

  radius: { sm: '8px', md: '12px', lg: '18px', xl: '24px' },
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,.35)',
    md: '0 8px 24px rgba(0,0,0,.45)',
    lg: '0 16px 48px rgba(0,0,0,.55)',
  },
};

export default tokens;
