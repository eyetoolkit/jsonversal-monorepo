/**
 * 全站工具目录 —— 跨 4 个子站的搜索数据源
 * 在构建时被搜索页和 Header 搜索快捷键共用
 *
 * 字段：
 *   title          工具标题
 *   description    描述（搜索关键字）
 *   href           URL 路径
 *   section        所属栏目（tools / sec / devops / codegen）
 *   keywords       关键词数组（用于搜索加权）
 */
export const allTools = [
  // ===== JSON & LLM (23) =====
  { title: 'JSON Diff', description: 'Compare two JSON documents and see what changed.', href: '/tools/json-diff/', section: 'tools', keywords: ['json diff', 'compare json', 'diff'] },
  { title: 'JSON Escape & Unescape', description: 'Escape plain text into a JSON string literal.', href: '/tools/json-escape/', section: 'tools', keywords: ['json escape', 'unescape', 'string escape'] },
  { title: 'JSON Formatter & Validator', description: 'Pretty-print, validate, and minify JSON.', href: '/tools/json-formatter/', section: 'tools', keywords: ['json formatter', 'json validator', 'pretty print', 'format json'] },
  { title: 'JSON Minify & Compress', description: 'Strip whitespace from JSON.', href: '/tools/json-minify/', section: 'tools', keywords: ['json minify', 'compress json', 'minify'] },
  { title: 'JSON Schema Builder', description: 'Build JSON Schemas visually.', href: '/tools/json-schema-builder/', section: 'tools', keywords: ['json schema builder', 'visual editor'] },
  { title: 'JSON Schema Generator', description: 'Generate a strict JSON Schema for LLM structured output.', href: '/tools/json-schema-generator/', section: 'tools', keywords: ['json schema', 'llm schema', 'structured output'] },
  { title: 'JSON Schema Sample Data', description: 'Generate sample JSON that satisfies your schema.', href: '/tools/json-schema-sample-generator/', section: 'tools', keywords: ['sample data', 'mock json', 'schema generator'] },
  { title: 'JSON Schema Validator', description: 'Validate JSON against a JSON Schema.', href: '/tools/json-schema-validator/', section: 'tools', keywords: ['json schema validator', 'draft-07', '2020-12'] },
  { title: 'JSON Sorter & Deduper', description: 'Sort object keys, sort arrays, dedupe.', href: '/tools/json-sorter/', section: 'tools', keywords: ['json sort', 'dedupe', 'deduplicate'] },
  { title: 'JSON Statistics & Structure Analyzer', description: 'Key count, depth, type distribution.', href: '/tools/json-statistics/', section: 'tools', keywords: ['json stats', 'analyze', 'depth'] },
  { title: 'JSON to C# Class Generator', description: 'Generate C# POCO classes.', href: '/tools/json-to-csharp/', section: 'tools', keywords: ['csharp', 'c# class', 'poco'] },
  { title: 'JSON to Go Struct', description: 'Convert JSON to Go struct.', href: '/tools/json-to-go/', section: 'tools', keywords: ['go struct', 'go json'] },
  { title: 'JSON to Pydantic Model', description: 'Generate Pydantic v2 BaseModel.', href: '/tools/json-to-pydantic/', section: 'tools', keywords: ['pydantic', 'python model'] },
  { title: 'JSON to TypeScript Interface', description: 'Convert JSON to TypeScript.', href: '/tools/json-to-typescript/', section: 'tools', keywords: ['typescript', 'ts interface'] },
  { title: 'JSON to Zod Schema', description: 'Infer Zod schema from JSON.', href: '/tools/json-to-zod/', section: 'tools', keywords: ['zod', 'typescript schema'] },
  { title: 'JSONPath Tester', description: 'Test JSONPath expressions.', href: '/tools/jsonpath-tester/', section: 'tools', keywords: ['jsonpath', 'query'] },
  { title: 'LLM Token & Pricing Calculator', description: 'Estimate tokens and cost across GPT, Claude, Llama, Gemini.', href: '/tools/llm-token-calculator/', section: 'tools', keywords: ['llm', 'token', 'gpt', 'claude', 'pricing', 'cost'] },
  { title: 'Markdown Editor & Live Preview', description: 'Write Markdown with live preview.', href: '/tools/markdown-preview/', section: 'tools', keywords: ['markdown', 'preview', 'md'] },
  { title: 'Mock Data Generator', description: 'Generate realistic fake JSON.', href: '/tools/mock-data-generator/', section: 'tools', keywords: ['mock data', 'fake data', 'fixture'] },
  { title: 'Text Diff', description: 'Compare two texts line by line.', href: '/tools/text-diff/', section: 'tools', keywords: ['text diff', 'compare text', 'lcs'] },
  { title: 'UUID v7 Generator', description: 'Generate RFC 9562 UUID v7.', href: '/tools/uuid-v7/', section: 'tools', keywords: ['uuid', 'uuid v7', 'rfc 9562'] },
  { title: 'XML Formatter & Validator', description: 'Pretty-print, validate XML.', href: '/tools/xml-formatter/', section: 'tools', keywords: ['xml', 'formatter'] },
  { title: 'YAML Formatter & Validator', description: 'Format, validate YAML.', href: '/tools/yaml-formatter/', section: 'tools', keywords: ['yaml', 'formatter'] },

  // ===== Security (14) =====
  { title: 'AES Encryption / Decryption', description: 'Encrypt and decrypt with AES-GCM or AES-CBC.', href: '/sec/tools/aes/', section: 'sec', keywords: ['aes', 'encryption', 'decryption', 'aes-gcm', 'aes-cbc'] },
  { title: 'BCrypt Hash & Verify', description: 'Generate bcrypt hashes and verify passwords.', href: '/sec/tools/bcrypt/', section: 'sec', keywords: ['bcrypt', 'hash', 'password'] },
  { title: 'File Checksum Calculator', description: 'Compute SHA-256, SHA-1, SHA-384, SHA-512 of a file.', href: '/sec/tools/file-checksum/', section: 'sec', keywords: ['checksum', 'sha-256', 'file hash'] },
  { title: 'Hash & HMAC Generator', description: 'Generate MD5, SHA-1, SHA-256 hashes and HMAC signatures.', href: '/sec/tools/hash-generator/', section: 'sec', keywords: ['hash', 'hmac', 'md5', 'sha256'] },
  { title: 'Hash Generator', description: 'Compute MD5, SHA-1, SHA-256 of text or file.', href: '/sec/tools/hash/', section: 'sec', keywords: ['hash', 'md5', 'sha1', 'sha256'] },
  { title: 'HMAC Generator', description: 'Compute HMAC-SHA256/SHA384/SHA512 signatures.', href: '/sec/tools/hmac/', section: 'sec', keywords: ['hmac', 'signature'] },
  { title: 'JWT Decoder', description: 'Decode JWT tokens, view header, payload, signature.', href: '/sec/tools/jwt-decoder/', section: 'sec', keywords: ['jwt', 'json web token', 'decode', 'jwt decoder'] },
  { title: 'JWT Generator', description: 'Build and sign JWTs with HS256/HS384/HS512.', href: '/sec/tools/jwt-generator/', section: 'sec', keywords: ['jwt', 'jwt generator', 'sign'] },
  { title: 'Passphrase Generator', description: 'Generate memorable diceware-style passphrases.', href: '/sec/tools/passphrase-generator/', section: 'sec', keywords: ['passphrase', 'diceware'] },
  { title: 'Random Password Generator', description: 'Generate strong random passwords.', href: '/sec/tools/password-generator/', section: 'sec', keywords: ['password', 'random', 'generator'] },
  { title: 'Random Token Generator', description: 'Generate secure random tokens in hex, base64, UUID.', href: '/sec/tools/random-token/', section: 'sec', keywords: ['token', 'random', 'hex', 'base64'] },
  { title: 'RSA Key Pair Generator', description: 'Generate 2048/3072/4096-bit RSA key pairs.', href: '/sec/tools/rsa-keygen/', section: 'sec', keywords: ['rsa', 'key pair', 'public key', 'private key'] },
  { title: 'Secret & API Key Scanner', description: 'Detect leaked credentials in logs and files.', href: '/sec/tools/secret-scanner/', section: 'sec', keywords: ['secret scanner', 'api key', 'leaked'] },
  { title: 'X.509 Certificate Decoder', description: 'Decode PEM X.509 certificates.', href: '/sec/tools/x509-decoder/', section: 'sec', keywords: ['x509', 'certificate', 'pem', 'decrypt'] },

  // ===== DevOps (16) =====
  { title: 'Base64 Encoder / Decoder', description: 'Encode text to Base64 or decode Base64.', href: '/devops/tools/base64/', section: 'devops', keywords: ['base64', 'encode', 'decode'] },
  { title: 'Basic Auth Header Generator', description: 'Generate HTTP Basic Auth headers.', href: '/devops/tools/basic-auth-generator/', section: 'devops', keywords: ['basic auth', 'authorization header'] },
  { title: 'CIDR / Subnet Calculator', description: 'Calculate network address, broadcast, host ranges.', href: '/devops/tools/cidr-calculator/', section: 'devops', keywords: ['cidr', 'subnet', 'network'] },
  { title: 'Crontab Explainer', description: 'Translate crontab expression into plain English.', href: '/devops/tools/crontab/', section: 'devops', keywords: ['crontab', 'cron', 'schedule'] },
  { title: 'Crontab Parser', description: 'Translate cron expressions and preview next 10 runs.', href: '/devops/tools/cron-parser/', section: 'devops', keywords: ['cron', 'cron parser', 'schedule'] },
  { title: 'JSON Tree Viewer', description: 'Explore JSON as a collapsible tree.', href: '/devops/tools/json-viewer/', section: 'devops', keywords: ['json tree', 'viewer'] },
  { title: 'Kubernetes YAML Generator', description: 'Scaffold Deployment, Service, Ingress manifests.', href: '/devops/tools/k8s-generator/', section: 'devops', keywords: ['kubernetes', 'k8s', 'yaml', 'deployment'] },
  { title: 'Log Line Parser', description: 'Parse nginx, Apache, JSON, or regex log lines.', href: '/devops/tools/log-parser/', section: 'devops', keywords: ['log', 'nginx', 'apache'] },
  { title: 'Number Base Converter', description: 'Convert between binary, octal, decimal, hex.', href: '/devops/tools/number-base/', section: 'devops', keywords: ['base converter', 'binary', 'hex'] },
  { title: 'QR Code Generator', description: 'Generate QR codes for URLs, text, WiFi, contacts.', href: '/devops/tools/qr-code-generator/', section: 'devops', keywords: ['qr code', 'qr generator'] },
  { title: 'Regex Tester', description: 'Test regular expressions with live match highlighting.', href: '/devops/tools/regex/', section: 'devops', keywords: ['regex', 'regexp', 'pattern'] },
  { title: 'Regex Tester with Explanations', description: 'Test regex with groups, indices, captured values.', href: '/devops/tools/regex-advanced/', section: 'devops', keywords: ['regex advanced', 'explanations'] },
  { title: 'Unix Timestamp Converter', description: 'Convert Unix timestamps to dates and back.', href: '/devops/tools/timestamp/', section: 'devops', keywords: ['timestamp', 'unix', 'date'] },
  { title: 'URL Encoder & Decoder', description: 'Percent-encode or decode URLs.', href: '/devops/tools/url-codec/', section: 'devops', keywords: ['url encode', 'url decode', 'percent encoding'] },
  { title: 'UUID v4 Generator', description: 'Generate RFC 4122 UUID v4 identifiers.', href: '/devops/tools/uuid-generator/', section: 'devops', keywords: ['uuid v4', 'uuid generator'] },
  { title: 'YAML ↔ JSON Converter', description: 'Convert YAML to JSON and back.', href: '/devops/tools/yaml-json/', section: 'devops', keywords: ['yaml', 'json', 'converter'] },

  // ===== Code Generators (16) =====
  { title: '.env Template Generator', description: 'Generate .env template from JSON.', href: '/codegen/tools/env-generator/', section: 'codegen', keywords: ['env', 'environment', 'dotenv'] },
  { title: '.gitignore Generator', description: 'Generate .gitignore by language.', href: '/codegen/tools/gitignore/', section: 'codegen', keywords: ['gitignore', 'git'] },
  { title: 'Base64 Image Viewer', description: 'Convert base64 to image or image to base64.', href: '/codegen/tools/base64-image/', section: 'codegen', keywords: ['base64 image', 'data uri'] },
  { title: 'CSV to JSON Converter', description: 'Convert CSV/TSV to JSON.', href: '/codegen/tools/csv-to-json/', section: 'codegen', keywords: ['csv', 'json'] },
  { title: 'cURL to Fetch Converter', description: 'Convert curl command to fetch().', href: '/codegen/tools/curl-to-fetch/', section: 'codegen', keywords: ['curl', 'fetch', 'js'] },
  { title: 'cURL to Python (requests)', description: 'Convert curl to Python requests.', href: '/codegen/tools/curl-to-python/', section: 'codegen', keywords: ['curl', 'python', 'requests'] },
  { title: 'Docker Compose Generator', description: 'Scaffold docker-compose.yml.', href: '/codegen/tools/docker-compose/', section: 'codegen', keywords: ['docker', 'docker-compose'] },
  { title: 'HTML Entity Escaper', description: 'Escape text into HTML entities.', href: '/codegen/tools/html-escaper/', section: 'codegen', keywords: ['html escape', 'html entities'] },
  { title: 'JSON ↔ XML Converter', description: 'Convert JSON to XML and back.', href: '/codegen/tools/json-xml/', section: 'codegen', keywords: ['json', 'xml', 'converter'] },
  { title: 'JSON Schema to TypeScript', description: 'Convert JSON Schema to TypeScript interfaces.', href: '/codegen/tools/schema-to-typescript/', section: 'codegen', keywords: ['json schema', 'typescript', 'codegen'] },
  { title: 'JSON to CSV Converter', description: 'Convert JSON array to CSV.', href: '/codegen/tools/json-to-csv/', section: 'codegen', keywords: ['json', 'csv'] },
  { title: 'JSON to Python Dict', description: 'Convert JSON sample to Python dict literal.', href: '/codegen/tools/json-to-python/', section: 'codegen', keywords: ['python', 'dict'] },
  { title: 'JSON to SQL Generator', description: 'Generate CREATE TABLE and INSERT.', href: '/codegen/tools/sql-generator/', section: 'codegen', keywords: ['sql', 'create table', 'insert'] },
  { title: 'LLM Structured Output Validator', description: 'Validate JSON Schemas for LLM output.', href: '/codegen/tools/llm-structured-output-validator/', section: 'codegen', keywords: ['llm', 'structured output', 'openai', 'anthropic'] },
  { title: 'SQL Formatter', description: 'Format messy SQL or minify.', href: '/codegen/tools/sql-formatter/', section: 'codegen', keywords: ['sql', 'format sql'] },
  { title: 'SQL Validator', description: 'Validate SQL syntax.', href: '/codegen/tools/sql-validator/', section: 'codegen', keywords: ['sql', 'validator', 'syntax check'] },
];

/** 搜索：title + description + keywords 任一字段匹配（不区分大小写，按匹配位置排序） */
export function searchTools(query, limit = 50) {
  if (!query) return [];
  const q = query.toLowerCase().trim();
  if (!q) return [];
  const words = q.split(/\s+/);
  const results = [];
  for (const tool of allTools) {
    const titleL = tool.title.toLowerCase();
    const descL = tool.description.toLowerCase();
    const kwL = tool.keywords.join(' ').toLowerCase();
    let score = 0;
    let allMatch = true;
    for (const w of words) {
      const inTitle = titleL.includes(w);
      const inDesc = descL.includes(w);
      const inKw = kwL.includes(w);
      if (!inTitle && !inDesc && !inKw) { allMatch = false; break; }
      if (inTitle) score += 10;
      if (inDesc) score += 3;
      if (inKw) score += 5;
      // 标题开头命中更优先
      if (titleL.indexOf(w) === 0) score += 5;
    }
    if (allMatch) results.push({ ...tool, _score: score });
  }
  results.sort((a, b) => b._score - a._score || a.title.localeCompare(b.title));
  return results.slice(0, limit);
}

export default allTools;