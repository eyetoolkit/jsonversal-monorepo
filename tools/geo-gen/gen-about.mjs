/**
 * Injects an `about` prop into every jsonversal tool page.
 *
 * Why: the content-depth review found tool pages carried ~426 words, most of
 * it sidebar navigation, against 1336 words for a comparable competitor. A
 * widget plus a FAQ gives search engines and AI assistants very little to
 * work with. Each entry below is written for that specific tool — what it
 * actually does, when you would reach for it, and the mistakes people make —
 * because generic filler would dilute the page it is meant to strengthen.
 *
 * Usage: node tools/geo-gen/gen-about.mjs [--dry]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAGES = path.resolve(__dirname, '../../apps/main/src/pages');
const DRY = process.argv.includes('--dry');

/** slug -> [ [heading, ...paragraphs], ... ] */
const ABOUT = {
  'json-formatter': [
    ['What the formatter actually does', [
      'The formatter parses your JSON with a real parser rather than a regular expression, so it only reformats input that is genuinely valid. Indentation is configurable — two spaces, four spaces, or tabs — and the output is re-serialised from the parsed structure, which means key order is preserved exactly as it appeared in the input.',
      'When validation fails, the error is reported with the line and column where parsing stopped, plus the token that caused it. That detail matters more than it sounds: "Unexpected token }" on a 4,000-line response tells you nothing, while line 2,041 column 18 narrows the search to a few characters.',
    ]],
    ['When to reach for it', [
      'Use it before committing a config file, when a hand-edited JSON file has lost its shape after a merge conflict. Use it when you receive minified JSON from an API and need to read it. Use it as a first pass before a schema validator — formatting first makes the error position readable.',
      'It is not a schema validator. If you need to know whether a document matches a contract rather than merely whether it parses, follow this with the JSON Schema Validator on the same site.',
    ]],
    ['What it does not do', [
      'The tool never sends your JSON anywhere, so a very large document will be processed at whatever speed your own machine manages — there is no server-side queue to wait for. Duplicate keys are collapsed to the last occurrence, matching JavaScript object semantics, which is worth knowing if your source has duplicates you care about.',
    ]],
  ],
  'json-validator': [
    ['Syntax validation versus schema validation', [
      'Two different questions get called "validation". Syntax validation asks whether the text is well-formed JSON at all — a missing comma or an unquoted key. Schema validation asks whether the document matches a contract you defined: this key must exist, this one must be a number, this array must have exactly three items.',
      'This page does the first kind, and reports the position of the failure. The JSON Schema Validator on this site does the second, supporting draft 2020-12, 2019-09 and draft-07.',
    ]],
    ['Common failure causes', [
      'The most frequent cause is a trailing comma, which JSON does not allow but many editors insert silently. The second is single quotes: JSON requires double quotes on both keys and string values. The third is a JavaScript literal pasted straight from code — `undefined`, `NaN`, functions and single-quoted strings all appear in source but none are valid JSON.',
      'A useful habit is to run minification first. If a document parses when minified but not when formatted, the problem is almost always whitespace-sensitive editing rather than the data itself.',
    ]],
  ],
  'json-minify': [
    ['What minification removes', [
      'Minification strips insignificant whitespace between tokens. It cannot change the contents of a string, so a value that contains meaningful spaces or newlines survives intact — only the whitespace between structural elements is removed.',
      'The size comparison shown next to the result gives the actual saving. For a typical API response the reduction is 40–60%, which is the difference between a payload that fits comfortably in a header and one that does not.',
    ]],
    ['When minifying is the wrong move', [
      'Do not minify a file you still need to read. Minified JSON is functionally identical but hostile to diffs, to code review, and to manual debugging — a single changed character shows up as a whole-line change in version control.',
      'If the goal is to shrink a response, minify at build or deploy time rather than editing the source. If the goal is to embed JSON in a URL, check whether the consumer expects URL encoding as well.',
    ]],
  ],
  'jwt-decoder': [
    ['What a JWT actually contains', [
      'A JWT is three base64url segments separated by dots: a header naming the algorithm, a payload carrying the claims, and a signature over the first two. Decoding is not verifying. Anyone can decode a token and read its contents; what requires a secret is confirming the signature was not altered.',
      'Because the payload is only base64url-encoded and not encrypted, treat everything inside as visible to anyone holding the token. Putting a password or a private key in a claim is a common and serious mistake.',
    ]],
    ['Signature verification', [
      'For HS256, HS384 and HS512 the signature is an HMAC over the header and payload using a shared secret, computed with the Web Crypto API in this browser. If verification fails with a valid-looking token, the usual causes are a mismatched secret, a token that has expired, or a signing library that produced a non-standard HMAC.',
      'RS256 and ES256 cannot be verified with a shared secret — they need the issuer\'s public key. The signing tool on this site produces HS-family tokens, which is the right choice for internal services but not for tokens a third party must verify.',
    ]],
    ['Claims worth checking', [
      '`exp` and `nbf` are timestamps in seconds since the epoch; an expired token is rejected even with a valid signature. `aud` should match the service receiving the token — a token minted for another service is still validly signed, just not for you. `iss` identifies the issuer and is how you decide which key to verify with.',
    ]],
  ],
  'password-generator': [
    ['Why the browser should generate the password', [
      'A password generated on your own machine never crosses a network, which removes an entire category of risk: no server logs it, no proxy sees it in transit, and no database breach can retroactively recover it. The trade-off is that you are responsible for storing it.',
      'This tool uses crypto.getRandomValues, the browser\'s cryptographically secure random source. Tools built on Math.random() are not safe for this purpose — the sequence is predictable from a few observed outputs, and password generation is exactly the case where predictability is fatal.',
    ]],
    ['Length and character classes', [
      'Length is the dominant factor: an 8-character password is far weaker than a 16-character one even if both use every character class. Entropy grows exponentially with length, so adding characters beats adding symbol requirements.',
      'For a passphrase, check the estimated entropy shown — aim for 80 bits or more for anything that matters. Avoid predictable substitutions: a passphrase built from dictionary words with the required symbol appended is weaker than its length suggests.',
    ]],
    ['What to avoid', [
      'Do not reuse a password across sites, and do not store generated passwords in a plain text file. If you want an automatic option, a password manager is the right tool: it generates, stores and autofills, which this page deliberately does not do.',
    ]],
  ],
  'base64': [
    ['Encoding is not encryption', [
      'Base64 transforms bytes into a 65-character alphabet so they survive transports that only handle text. It is reversible by design: anyone who can decode the output can read exactly what you encoded. Treating Base64 output as if it were a secret is the most common mistake with this tool.',
      'Use it for embedding binary in JSON, putting a small binary blob in a URL-safe string, or representing data that must survive a text-only channel. Do not use it to hide credentials.',
    ]],
    ['URL-safe variant', [
      'Standard Base64 uses `+` and `/`, both of which need percent-encoding in a URL or a filename. The URL-safe variant substitutes `-` and `_` and drops the padding `=` characters. JWTs, many cookie formats and most URL-embedded payloads use this variant.',
      'When decoding output from elsewhere, try the standard alphabet first and switch on failure — that ordering avoids subtle corruption when a payload happens not to contain `+` or `/`.',
    ]],
    ['Limits', [
      'Encoding expands the data by about a third: three bytes become four characters. For binary data this is unavoidable in a text channel, but it means Base64 is the wrong choice for large payloads where the transport already handles binary.',
    ]],
  ],
  'regex': [
    ['Reading a pattern before you write one', [
      'A regular expression is read left to right, and each token consumes input or groups it. `\\d` is one digit, `\\w` is a word character, `.` is any character except a newline, and a quantifier such as `+` or `{3,}` applies to the token immediately before it. Getting that last relationship right is most of the difficulty in writing patterns.',
      'Anchors change the scope of the match rather than what it matches: `^` requires the start of the string (or line, with the multiline flag) and `$` the end. For validation, an unanchored pattern that matches part of a string is almost never what you want.',
    ]],
    ['Greediness and backtracking', [
      'A quantifier is greedy by default — `.*` consumes as much as possible and then gives characters back when the rest of the pattern fails. When results are longer than expected, that backtracking is usually the cause, and `.*?` is the first thing to try.',
      'Nested quantifiers such as `(a+)+` can trigger catastrophic backtracking on non-matching input, freezing the page for seconds or minutes. If a pattern is slow rather than wrong, look for nested repetition first.',
    ]],
    ['Flavours are not interchangeable', [
      'JavaScript, Python and PCRE agree on the basics and disagree on the edges: `\\d` excludes some Unicode digits in some flavours, lookbehind support varies, and named group syntax differs. Test a pattern in the engine that will actually run it.',
    ]],
  ],
  'yaml-json': [
    ['What the converter preserves', [
      'YAML is a superset of JSON, so JSON converts to YAML without loss, but the reverse is not always true. This converter handles anchors and aliases, multiple documents in a single stream, flow style, and custom tags, and will tell you when a construct has no JSON equivalent rather than silently dropping it.',
      'Comments are the common exception: JSON has no comment syntax, so YAML comments are removed during conversion. If you are round-tripping a file and need them preserved, keep the YAML as the source of truth.',
    ]],
    ['When YAML is the wrong format', [
      'YAML\'s indentation-based syntax is forgiving to write and easy to break in ways JSON is not — a single misaligned list marker changes the structure rather than failing to parse. For machine-to-machine interchange where either side can read JSON, JSON is the safer contract.',
      'For Kubernetes manifests, keep YAML as the authored source and convert to JSON only when talking to an API that requires it.',
    ]],
  ],
  'qr-code-generator': [
    ['What is actually encoded', [
      'A QR code stores a payload as modules in a square grid, with error correction added at four levels (L, M, Q, H). Higher correction survives more damage but needs more modules, so a dense URL encoded at H may produce a code too large to scan reliably at a distance.',
      'WiFi and vCard payloads encode structured data rather than a URL. A scanner reads them and offers to connect or save a contact, which is why the same code can behave differently depending on which app opens it.',
    ]],
    ['Getting a scannable code', [
      'Size and contrast matter more than export format. Keep quiet zones — the light margin around the code — clear of other content, and avoid placing the code on a photograph with similar density in the background.',
      'Test with a second phone before printing anything. A code that reads on your screen at arm\'s length will usually print and scan, but a very high correction level on a long URL is the usual cause of a "too dense to scan" result.',
    ]],
  ],
  'uuid-generator': [
    ['v4 and v7 solve different problems', [
      'A v4 UUID is 122 random bits with no structure. It is the right default for anything that must be unpredictable or globally unique without coordination — object identifiers, token values, anything where two systems might generate the same id.',
      'A v7 UUID leads with a millisecond timestamp followed by random bits. That makes ids sortable by creation time, which turns an expensive "find by created_at and filter by id" query into an index range scan on the primary key. Use v7 for database primary keys where insert order matters.',
      'If you are using v4 and find index fragmentation on large tables, switching to v7 is usually the fix.',
    ]],
    ['Version and variant bits', [
      'The version nibble and the two variant bits are fixed by RFC 9562; that is why not every 128-bit value is a valid UUID. The validator on this page reports the version and variant, and will flag a UUID that is well-formed but not RFC-compliant.',
    ]],
  ],
  'json-schema-validator': [
    ['What a schema does and does not enforce', [
      'A JSON Schema describes the shape of a document: which keys are required, what type each value is, what pattern a string matches, what range a number falls in. It does not validate semantics — a schema can confirm an age is a non-negative integer and still have no opinion about whether it is plausible.',
      'The validator here supports draft 2020-12, 2019-09 and draft-07, and reports failures with the instance path so you can jump straight to the offending value in a large document.',
    ]],
    ['Validating LLM structured output', [
      'When a model is constrained to return a JSON object, the schema is the contract, and the failure mode is usually a mismatch between the schema you sent and the response you got. The presets on this page are shaped for the formats OpenAI, Anthropic and Gemini actually accept, including the strict-mode requirements those APIs impose.',
      'Test with the worst realistic output, not a clean sample. The cases that break in production are optional fields omitted, an extra property added by a fine-tuned model, or a nested object returned as a string.',
    ]],
  ],
  'cidr-calculator': [
    ['Reading CIDR notation', [
      'A block such as 192.168.1.0/24 is a network address followed by the number of leading bits that identify the network. The remaining bits are the host portion, so /24 leaves 8 host bits — 254 usable addresses once the network and broadcast addresses are reserved.',
      'The calculator shows the network address, broadcast address, first and last usable host, and the total host count, so you can check a block at a glance instead of counting by hand.',
    ]],
    ['Common mistakes', [
      'A host address inside the range is not the same as the network address. Configuring a gateway to 192.168.1.37/24 works at the OS level but the stated network should be the network address; some systems reject the difference.',
      'Overlapping blocks are the usual cause of a routing conflict. Check the broadcast address of each range — two ranges whose broadcast addresses overlap cannot both be valid.',
    ]],
  ],
  'regex-advanced': [
    ['Groups, captures and what backreferences match', [
      'A capture group records the substring it matched so it can be referenced later — in the replacement string, in a conditional, or through a backreference such as `\\1`. Group numbering follows the order of opening parentheses, including groups inside lookarounds.',
      'Named groups (`(?<name>...)` and `\\k<name>`) survive refactoring in a way numbered groups do not, and they make an expression self-documenting. They are supported in JavaScript and Python; support elsewhere varies by flavour.',
    ]],
    ['Lookarounds', [
      'A lookahead `(?=...)` asserts what follows without consuming it, a lookbehind `(?<=...)` asserts what precedes. This is how you match a word boundary that is not whitespace, or require quotes without consuming them, which keeps the match available to the surrounding pattern.',
      'Lookbehind must be fixed-width in JavaScript, which rules out `(?<=a*)`. A character-class alternative such as `(?<=[^,])` is usually the workaround.',
    ]],
  ],
  'timestamp': [
    ['Seconds, milliseconds and the ambiguity', [
      'Unix time is seconds since 1970-01-01 UTC. JavaScript\'s Date uses milliseconds, which is the single most common source of wrong dates when values cross a language boundary: a millisecond value interpreted as seconds lands in the year 56000-something, and a second value read as milliseconds lands in January 1970.',
      'This tool auto-detects which unit a value uses and shows the result in local time, UTC and ISO 8601 so you can confirm which reading was correct.',
    ]],
    ['Time zones and daylight saving', [
      'ISO 8601 strings carry an offset (`Z` means UTC, `+02:00` is a fixed offset). Naive strings carry neither, and interpreting one requires knowing which zone it was meant in — the assumption that it is UTC is a frequent cause of an off-by-hours bug in a scheduled job.',
    ]],
  ],
  'uuid-v7': [
    ['Why time-ordered identifiers matter', [
      'A v7 UUID begins with a 48-bit big-endian millisecond timestamp. Because primary key indexes are B-trees, random keys scatter inserts across the whole index, causing page splits and cache misses; time-ordered keys append near the end. On a large insert-heavy table this is the difference between an index that stays in memory and one that does not.',
      'The timestamp is also recoverable: decoding a v7 UUID tells you exactly when it was created, which is useful when debugging without a timestamp column.',
    ]],
    ['Collision resistance', [
      'The random bits after the timestamp guarantee uniqueness within the same millisecond, and the monotonic variant additionally guarantees ordering for ids minted in the same millisecond. Two processes generating v7 ids concurrently will not collide.',
    ]],
  ],
};

let touched = 0, skipped = 0, dry = 0;

for (const [slug, sections] of Object.entries(ABOUT)) {
  // 定位页面目录（四个栏目下都可能有同名，先按 tools 找，再回退）
  let dir = null;
  for (const root of ['tools', 'sec/tools', 'devops/tools', 'codegen/tools']) {
    const c = path.join(PAGES, root, slug);
    if (fs.existsSync(c)) { dir = c; break; }
  }
  if (!dir) { console.warn(`  ! 未找到页面: ${slug}`); skipped++; continue; }

  const file = path.join(dir, 'index.astro');
  let src = fs.readFileSync(file, 'utf8');

  if (/^\s*about=\{/m.test(src)) { console.log(`  = ${slug} 已有 about, 跳过`); skipped++; continue; }

  // 构造 Astro 表达式字面量
  const lit = JSON.stringify(sections, null, 2)
    .replace(/\n/g, '\n  ')
    .replace(/"([a-zA-Z0-9 ]+)":/g, "$1:");

  // lit is already a full JSON array of sections; do not wrap it again —
  // that produced about={[[ ... ]]} and the component saw one section whose
  // "heading" was the whole first section.
  const prop = `  about={${lit.split('\n').join('\n  ')}}\n`;

  // 插到 ToolPage 标签内，faqs={faqs} 之后
  const anchor = /\n(\s*)faqs=\{faqs\}\n/;
  if (!anchor.test(src)) { console.warn(`  ! ${slug} 未找到 faqs={faqs} 锚点, 跳过`); skipped++; continue; }

  src = src.replace(anchor, (m, ind) => `${m}${prop.replace(/^/gm, ind)}`);

  if (DRY) { console.log(`  · [dry] ${slug}`); dry++; continue; }
  fs.writeFileSync(file, src);
  console.log(`  ✓ ${slug} (${sections.length} sections)`);
  touched++;
}

console.log(`\n${DRY ? '[dry] ' : ''}updated ${touched}, skipped ${skipped}${dry ? `, would-update ${dry}` : ''}`);
console.log('提示：仅覆盖有专属内容的工具；其余页面保持原样。');
