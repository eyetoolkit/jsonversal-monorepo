/**
 * Generates jsonversal comparison pages.
 *
 * Why a generator instead of hand-written files: these pages share one
 * template and differ only in a small data table. Keeping the content in a
 * single array makes it cheap to add more comparisons later and impossible
 * for the styling to drift between pages.
 *
 * Output: apps/main/public/compare/<slug>/index.html (static, copied
 * verbatim by Astro's public/ handling — no page build needed).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../../apps/main/public/compare');

const CSS = `:root{--brand:#4f46e5;--ink:#0b1220;--muted:#5a6780;--line:#e6e9f0;--bg:#f7f8fb;--ok:#059669;--warn:#b45309}
*{box-sizing:border-box}
body{margin:0;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;color:var(--ink);background:var(--bg);line-height:1.6}
.wrap{max-width:920px;margin:0 auto;padding:32px 20px 64px}
header.top{border-bottom:1px solid var(--line);background:#fff}
header.top .wrap{padding:16px 20px;display:flex;align-items:center;gap:10px}
.logo{font-weight:700;color:var(--brand);font-size:18px;text-decoration:none}
h1{font-size:28px;line-height:1.25;margin:8px 0}
h2{font-size:20px;margin:32px 0 10px}
p.lede{color:var(--muted);font-size:17px;margin-top:0}
a{color:var(--brand)}
table{width:100%;border-collapse:collapse;margin:18px 0;background:#fff;border:1px solid var(--line);border-radius:10px;overflow:hidden}
th,td{padding:12px 14px;text-align:left;border-bottom:1px solid var(--line);vertical-align:top;font-size:14.5px}
th{background:#f1f5f9;font-weight:600}
tr:last-child td{border-bottom:none}
.yes{color:var(--ok);font-weight:600}
.no{color:#b91c1c;font-weight:600}
.mid{color:var(--warn);font-weight:600}
.cta{display:inline-block;margin-top:8px;background:var(--brand);color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600}
.note{border-left:3px solid var(--brand);background:#fff;padding:14px 16px;border-radius:0 8px 8px 0;margin:20px 0}
.related{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:12px;margin:16px 0}
.related a{border:1px solid var(--line);background:#fff;border-radius:10px;padding:14px 16px;text-decoration:none;color:inherit}
.related a:hover{border-color:var(--brand)}
.related strong{display:block;color:var(--brand);font-size:15px;margin-bottom:2px}
.related span{font-size:13.5px;color:var(--muted)}
footer{border-top:1px solid var(--line);margin-top:48px;padding:24px 0;color:var(--muted);font-size:14px}
@media(max-width:640px){h1{font-size:22px}th,td{padding:10px;font-size:13.5px}}`;

const PAGES = [
  {
    slug: 'password-generator',
    title: 'Password Generator — jsonversal vs 1Password vs Bitwarden vs LastPass',
    lede: 'Every mainstream password manager ships a generator. The difference is whether the password is generated in your browser or sent to a server.',
    tool: { name: 'Password Generator', url: 'https://jsonversal.com/sec/tools/password-generator/' },
    cols: ['Capability', 'jsonversal', '1Password / Bitwarden', 'Standalone web tools'],
    rows: [
      ['Where generation happens', '<span class="yes">In your browser</span>', 'In the app (client-side)', '<span class="mid">Varies — many post to a server</span>'],
      ['Account required', '<span class="yes">No</span>', '<span class="no">Yes</span>', '<span class="yes">Usually no</span>'],
      ['Stores your passwords', '<span class="yes">No, generates and forgets</span>', '<span class="no">Yes, encrypted vault</span>', '<span class="mid">Should not, but varies</span>'],
      ['Crypto source', 'Web Crypto API (CSPRNG)', 'Platform CSPRNG', '<span class="mid">Sometimes Math.random (weak)</span>'],
      ['Bulk generation', '<span class="yes">Yes</span>', 'Varies by plan', '<span class="yes">Often</span>'],
      ['Passphrases (Diceware)', '<span class="yes">Yes</span>', '<span class="yes">Yes</span>', '<span class="mid">Varies</span>'],
    ],
    verdict: 'If you want a password for a single account right now, a password manager is the better product — it stores and autofills. If you are migrating a database, generating a batch of throwaway credentials, or you simply do not want an account, a browser-only generator removes both the upload question and the vendor lock-in. jsonversal never transmits anything and keeps no history.',
  },
  {
    slug: 'regex-tester',
    title: 'Regex Tester — jsonversal vs regex101 vs RegExr',
    lede: 'Every regex tester shows you matches. The questions that matter are whether your pattern leaves the browser and whether it explains itself.',
    tool: { name: 'Regex Tester', url: 'https://jsonversal.com/devops/tools/regex/' },
    cols: ['Capability', 'jsonversal', 'regex101 / RegExr', 'Online evaluators (eval sites)'],
    rows: [
      ['Runs client-side', '<span class="yes">Yes</span>', '<span class="yes">Yes</span>', '<span class="mid">Varies</span>'],
      ['Works on private input', '<span class="yes">Yes — patterns and text never leave the tab</span>', '<span class="yes">Yes</span>', '<span class="mid">Check before pasting secrets</span>'],
      ['Explains the pattern', '<span class="yes">Yes — tokens and groups described</span>', '<span class="yes">Yes</span>', '<span class="no">Usually just results</span>'],
      ['Flavour selection', 'JavaScript &amp; Python', 'JavaScript, PCRE', '<span class="mid">Varies</span>'],
      ['Match groups / indices', '<span class="yes">Yes</span>', '<span class="yes">Yes</span>', '<span class="yes">Yes</span>'],
      ['Pattern presets', '<span class="yes">Common patterns included</span>', '<span class="yes">Yes</span>', '<span class="no">No</span>'],
    ],
    verdict: 'For interactive learning, regex101 has the better live editing. For a pattern that contains customer data, an internal routing rule, or anything you would not paste into a chat window, a client-side tester with explanations is the safer choice — you can see what each group does without sending the text anywhere.',
  },
  {
    slug: 'json-schema-validator',
    title: 'JSON Schema Validator — jsonversal vs ajv-cli vs cloud validators',
    lede: 'Schema validation is where LLM contracts live. Most online validators upload your payload to a server to do it.',
    tool: { name: 'JSON Schema Validator', url: 'https://jsonversal.com/tools/json-schema-validator/' },
    cols: ['Capability', 'jsonversal', 'ajv (CLI/library)', 'Hosted validators'],
    rows: [
      ['Draft support', '<span class="yes">2020-12, 2019-09, draft-07</span>', '<span class="yes">2020-12, 2019-09, draft-07</span>', '<span class="mid">Varies</span>'],
      ['Payload leaves the browser', '<span class="yes">Never</span>', '<span class="no">N/A — runs locally in your code</span>', '<span class="yes">Usually yes</span>'],
      ['Setup required', '<span class="yes">None</span>', '<span class="no">npm install + code</span>', '<span class="yes">None</span>'],
      ['Error location reporting', '<span class="yes">Path + line/column</span>', '<span class="yes">Detailed</span>', '<span class="mid">Varies</span>'],
      ['Validates LLM structured output', '<span class="yes">Presets for OpenAI / Anthropic / Gemini</span>', '<span class="yes">Yes, if you wire it up</span>', '<span class="mid">Rarely</span>'],
      ['Account required', '<span class="yes">No</span>', '<span class="yes">No</span>', '<span class="yes">Often</span>'],
    ],
    verdict: 'ajv is the right choice when validation belongs in your test suite. When you are debugging why a model returned an invalid object, or checking a payload before it reaches an API, a browser validator that never uploads is faster and keeps the data in your browser. jsonversal also ships presets shaped for the major providers\' structured-output formats, so you can paste a schema and test it immediately.',
  },
  {
    slug: 'yaml-json',
    title: 'YAML to JSON Converter — jsonversal vs online converters',
    lede: 'Converting YAML to JSON is trivial; converting it without uploading your Kubernetes manifests is not.',
    tool: { name: 'YAML ↔ JSON Converter', url: 'https://jsonversal.com/devops/tools/yaml-json/' },
    cols: ['Capability', 'jsonversal', 'Typical online converter', 'CLI tools (yq)'],
    rows: [
      ['Runs in browser', '<span class="yes">Yes</span>', '<span class="yes">Usually</span>', '<span class="no">Local binary</span>'],
      ['Handles anchors &amp; aliases', '<span class="yes">Yes</span>', '<span class="mid">Varies</span>', '<span class="yes">Yes</span>'],
      ['Multi-document streams', '<span class="yes">Yes</span>', '<span class="mid">Varies</span>', '<span class="yes">Yes</span>'],
      ['Custom tags / flow style', '<span class="yes">Yes</span>', '<span class="mid">Often lossy</span>', '<span class="yes">Yes</span>'],
      ['Manifests stay on device', '<span class="yes">Yes</span>', '<span class="mid">Check policy</span>', '<span class="yes">Yes</span>'],
      ['Round-trips back to YAML', '<span class="yes">Yes, both directions</span>', '<span class="mid">Varies</span>', '<span class="yes">Yes</span>'],
    ],
    verdict: 'Reach for yq when you are working in a terminal or scripting conversions. When you are reading a production manifest that may contain secrets, or you want to convert a GitHub Actions workflow you just pasted in, a browser converter that round-trips and never uploads is the faster path.',
  },
  {
    slug: 'uuid-generator',
    title: 'UUID Generator — jsonversal vs uuidgenerator.com vs crypto.randomUUID()',
    lede: 'Generating a UUID is one line of code — unless you need it in the browser, at scale, or with v7 ordering.',
    tool: { name: 'UUID v4 / v7 Generator', url: 'https://jsonversal.com/devops/tools/uuid-generator/' },
    cols: ['Capability', 'jsonversal', 'uuidgenerator.com', 'crypto.randomUUID()'],
    rows: [
      ['No code required', '<span class="yes">Yes</span>', '<span class="yes">Yes</span>', '<span class="no">Requires writing code</span>'],
      ['Bulk generation', '<span class="yes">Yes, with formatting options</span>', '<span class="yes">Yes</span>', '<span class="no">Manual loop</span>'],
      ['UUID v7 (time-ordered)', '<span class="yes">Yes, with timestamp decode</span>', '<span class="mid">Varies</span>', '<span class="no">Not built in</span>'],
      ['Entropy source', 'crypto.getRandomValues', 'crypto.getRandomValues', 'crypto.getRandomValues'],
      ['Offline / air-gapped', '<span class="yes">Yes after first load</span>', '<span class="mid">Page needed</span>', '<span class="yes">Yes</span>'],
      ['Validates an existing UUID', '<span class="yes">Yes — version &amp; variant</span>', '<span class="no">No</span>', '<span class="no">No</span>'],
    ],
    verdict: 'In application code, use the platform: crypto.randomUUID() is correct, free and non-negotiable for entropy. Reach for a browser generator when you are seeding a database, filling a test fixture, or need v7 ordering that the platform does not provide.',
  },
  {
    slug: 'qr-code-generator',
    title: 'QR Code Generator — jsonversal vs qr-code-generator.com',
    lede: 'The common QR generators upload your payload to produce the image. For a WiFi password or an internal URL, that is a real exposure.',
    tool: { name: 'QR Code Studio', url: 'https://jsonversal.com/devops/tools/qr-code-generator/' },
    cols: ['Capability', 'jsonversal', 'Typical web generator', 'Library (qrcode.js)'],
    rows: [
      ['Payload leaves the browser', '<span class="yes">Never</span>', '<span class="yes">Usually yes</span>', '<span class="no">N/A — runs locally</span>'],
      ['WiFi / vCard payloads', '<span class="yes">Yes</span>', '<span class="yes">Yes</span>', '<span class="mid">Requires code</span>'],
      ['PNG and SVG export', '<span class="yes">Yes</span>', '<span class="yes">Usually</span>', '<span class="yes">Yes</span>'],
      ['Custom colours &amp; size', '<span class="yes">Yes</span>', '<span class="yes">Yes</span>', '<span class="yes">Yes</span>'],
      ['Account required', '<span class="yes">No</span>', '<span class="no">Often for branding</span>', '<span class="yes">No</span>'],
      ['Works offline', '<span class="yes">Yes after first load</span>', '<span class="no">No</span>', '<span class="yes">Yes</span>'],
    ],
    verdict: 'For a one-off QR that encodes a café WiFi password, an access token in a URL, or an internal hostname, the upload is the part worth avoiding. A client-side generator produces the same image with the payload never leaving the tab. If you need QR codes inside a product, use a library.',
  },
  {
    slug: 'base64',
    title: 'Base64 Encoder & Decoder — jsonversal vs base64.guru',
    lede: 'Base64 is not encryption, but most converters still upload what you give them — and people paste tokens far more often than they realise.',
    tool: { name: 'Base64 Encoder / Decoder', url: 'https://jsonversal.com/devops/tools/base64/' },
    cols: ['Capability', 'jsonversal', 'base64.guru &amp; similar', 'Command line (base64)'],
    rows: [
      ['Data leaves the browser', '<span class="yes">Never</span>', '<span class="yes">Usually yes</span>', '<span class="no">N/A — local</span>'],
      ['URL-safe variant', '<span class="yes">Yes</span>', '<span class="mid">Varies</span>', '<span class="mid">Flag needed</span>'],
      ['Decode detects bad input', '<span class="yes">Yes</span>', '<span class="mid">Varies</span>', '<span class="yes">Yes</span>'],
      ['Binary files', '<span class="yes">Yes</span>', '<span class="yes">Varies</span>', '<span class="yes">Yes</span>'],
      ['No signup', '<span class="yes">Yes</span>', '<span class="yes">Yes</span>', '<span class="yes">Yes</span>'],
      ['Available offline', '<span class="yes">Yes after first load</span>', '<span class="no">No</span>', '<span class="yes">Yes</span>'],
    ],
    verdict: 'Base64 is encoding, not encryption — anyone decoding the output can read it. That is exactly why the upload matters: a Basic-Auth header or an API key pasted into a converter should not become someone else\'s server log. Use the shell tool for automation, a browser converter when you need it by hand.',
  },
];

const escape = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function render(p) {
  // FAQPage + SoftwareApplication structured data. Comparison pages are the
  // most likely thing an assistant cites for an "X vs Y" question, so making
  // the Q&A explicit in JSON-LD measurably improves the odds of being quoted.
  const faqLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'SoftwareApplication',
        name: `jsonversal — ${p.title.split('—')[0].trim()}`,
        applicationCategory: 'DeveloperApplication',
        operatingSystem: 'Any',
        url: 'https://jsonversal.com/compare/',
        offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      },
      {
        '@type': 'FAQPage',
        mainEntity: [
          {
            '@type': 'Question',
            name: `When should I use jsonversal's ${p.title.split('—')[0].trim().toLowerCase()} instead of the alternative?`,
            acceptedAnswer: { '@type': 'Answer', text: p.verdict.replace(/<[^>]+>/g, '') },
          },
        ],
      },
    ],
  };

  const rowsHtml = p.rows.map(r => {
    const [cap, ...cells] = r;
    return `    <tr><td>${cap}</td>${cells.map(c => `<td>${c}</td>`).join('')}</tr>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escape(p.title)}</title>
<meta name="description" content="${escape(p.lede)}">
<link rel="canonical" href="https://jsonversal.com/compare/${p.slug}/">
<script type="application/ld+json" is:inline>${JSON.stringify(faqLd)}</script>
<style>${CSS}</style>
</head>
<body>
<header class="top"><div class="wrap"><a class="logo" href="https://jsonversal.com/">jsonversal</a> <span style="color:var(--muted)">/ comparisons</span></div></header>
<div class="wrap">
<h1>${escape(p.title)}</h1>
<p class="lede">${escape(p.lede)}</p>
<h2>Feature comparison</h2>
<table>
    <tr><th>${escape(p.cols[0])}</th>${p.cols.slice(1).map(c => `<th>${escape(c)}</th>`).join('')}</tr>
${rowsHtml}
</table>
<h2>When to pick which</h2>
<p>${p.verdict}</p>
<div class="note">
<strong>Bottom line:</strong> <a class="cta" href="${p.tool.url}">Try ${escape(p.tool.name)} →</a>
</div>
<div class="related">
  <a href="/compare/json-formatter/"><strong>JSON Formatter</strong><span>jsonversal vs JSONFormatter.org, JSON Editor Online</span></a>
  <a href="/compare/jwt-decoder/"><strong>JWT Decoder</strong><span>jsonversal vs jwt.io</span></a>
  <a href="/compare/json-to-typescript/"><strong>JSON to TypeScript</strong><span>jsonversal vs QuickType</span></a>
  <a href="/compare/"><strong>All comparisons</strong><span>Every side-by-side we publish</span></a>
</div>
</div>
<footer><div class="wrap">© jsonversal — all tools run 100% client-side in your browser. Comparisons are informational; verify each tool's current privacy posture before trusting it with sensitive data.</div></footer>
</body>
</html>
`;
}

let n = 0;
for (const p of PAGES) {
  const dir = path.join(OUT, p.slug);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), render(p));
  console.log('wrote', p.slug);
  n++;
}
console.log(`\n${n} comparison pages generated in ${OUT}`);
