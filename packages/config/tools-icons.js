/**
 * 工具图标映射 —— 按目录 slug 分配 emoji 磁贴，跨 4 个栏目统一。
 * slug 全局唯一（已核对 69 个工具无重名），便于按最后一节路径查找。
 */

// 栏目 → 品牌色（与各站 token accent 一致）
export const SECTION_ACCENT = {
  tools: '#6366f1',
  sec: '#ef4444',
  devops: '#10b981',
  codegen: '#f59e0b',
};

// slug → emoji
const ICONS = {
  // hub / 栏目索引页
  'tools': '🧰',
  'sec': '🛡️',
  'devops': '🛠️',
  'codegen': '⚙️',

  // main /tools
  'llm-token-calculator': '🧮',
  'json-schema-generator': '📐',
  'json-schema-sample-generator': '🧪',
  'json-to-pydantic': '🐍',
  'json-to-zod': '⚡',
  'json-to-typescript': '🏷️',
  'jsonpath-tester': '🧭',
  'json-diff': '🔀',
  'json-formatter': '✨',
  'json-to-go': '🐹',
  'json-to-csharp': '🔷',
  'uuid-v7': '🪪',
  'markdown-preview': '📝',
  'text-diff': '↔️',
  'json-escape': '🔣',
  'json-sorter': '🔢',

  // sec
  'hash': '🔐',
  'aes': '🔒',
  'bcrypt': '🧂',
  'hmac': '✒️',
  'password-generator': '🔑',
  'file-checksum': '📎',
  'password-strength': '🎯',
  'csp': '🛡️',
  'csr': '📄',
  'totp': '⏰',
  'random-token': '🎲',
  'rsa-keygen': '🗝️',
  'jwt-generator': '🍪',
  'x509-decoder': '📜',
  'hash-identifier': '🔍',
  'passphrase-generator': '📖',
  'password-encrypt': '🧷',
  'secret-scanner': '🕵️',

  // devops
  'yaml-json': '🔄',
  'json-viewer': '🌳',
  'base64': '🔤',
  'url-codec': '🔗',
  'jwt-decoder': '🍪',
  'timestamp': '🕐',
  'crontab': '⏲️',
  'regex': '🧩',
  'uuid-generator': '🆔',
  'http-status': '📟',
  'cidr-calculator': '🌐',
  'k8s-generator': '☸️',
  'ports-reference': '🔌',
  'nginx-config': '🚀',
  'systemd-unit': '🖥️',
  'log-parser': '📊',
  'qr-code-generator': '📱',
  'number-base': '🔢',

  // codegen
  'gitignore': '👻',
  'license': '📋',
  'readme': '📄',
  'ci-workflow': '🤖',
  'json-to-python': '🐍',
  'curl-to-fetch': '🌐',
  'env-generator': '🌱',
  'commit-msg': '✅',
  'html-escaper': '🔤',
  'json-to-csv': '🗂️',
  'csv-to-json': '🗃️',
  'json-xml': '🔁',
  'sql-generator': '🗄️',
  'docker-compose': '🐳',
  'schema-to-typescript': '🧾',
  'curl-to-python': '🐾',
  'base64-image': '🖼️',
  'sql-formatter': '🧹',
  'sql-validator': '📋',
};

// 从 href（如 /sec/tools/hash/）解析出 section + slug
export function parseToolRef(href = '') {
  const parts = href.split('/').filter(Boolean); // e.g. ['sec','tools','hash']
  const slug = parts[parts.length - 1] || '';
  const section = parts[0] || 'tools';
  return { section, slug };
}

export function toolIcon(href) {
  const { section, slug } = parseToolRef(href);
  return {
    emoji: ICONS[slug] || '🧰',
    section,
    accent: SECTION_ACCENT[section] || SECTION_ACCENT.tools,
  };
}

export default { toolIcon, SECTION_ACCENT, parseToolRef };