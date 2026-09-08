/**
 * 共享设计 token —— 4 站点差异化色彩 + 字体 + 间距
 */

export const tokens = {
  // 各子站品牌色（仅一处定义、跨站一致）
  sites: {
    main: {
      name: 'jsonversal',
      host: 'jsonversal.com',
      accent: '#6366f1',
      accentDark: '#4f46e5',
      emoji: '🟦',
      tagline: 'JSON that runs in your browser',
      title: 'Free Browser-Based Developer Tools',
    },
    devops: {
      name: 'devops.versal',
      host: 'devops.jsonversal.com',
      accent: '#10b981',
      accentDark: '#059669',
      emoji: '🟢',
      tagline: 'DevOps tools that run in your browser',
      title: 'Free Browser-Based DevOps Tools',
    },
    codegen: {
      name: 'codegen.versal',
      host: 'codegen.jsonversal.com',
      accent: '#f59e0b',
      accentDark: '#d97706',
      emoji: '🟡',
      tagline: 'Generate config files in your browser',
      title: 'Free Browser-Based Code Generators',
    },
    sec: {
      name: 'sec.versal',
      host: 'sec.jsonversal.com',
      accent: '#ef4444',
      accentDark: '#dc2626',
      emoji: '🔴',
      tagline: 'Cryptography that runs in your browser',
      title: 'Free Browser-Based Security Tools',
    },
  },

  // 全局 token（中性色 / 排版 / 间距）
  colors: {
    bg: '#0b0d12',
    surface: '#15181f',
    surfaceAlt: '#1c1f27',
    border: '#272a33',
    text: '#e4e6eb',
    textMuted: '#9aa0a6',
    textDim: '#6b7280',
    success: '#22c55e',
    warning: '#f59e0b',
    danger: '#ef4444',
  },

  fonts: {
    body: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: 'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
  },

  radius: { sm: '6px', md: '10px', lg: '16px' },
  shadow: {
    sm: '0 1px 2px rgba(0,0,0,.3)',
    md: '0 4px 12px rgba(0,0,0,.4)',
  },
};

export default tokens;