# @jsonversal/mcp-server

JSON / 编码 / 转换 / 生成 全家桶 — 25 个确定性工具，专为 AI Agent 设计。MCP Server（stdio）+ REST API（HTTP）双模版。

> 所有工具均为纯函数、服务端运行、零外部依赖、无网络请求、无状态。Agent 可安全调用。

## 工具清单（25）

### JSON 核心
| 工具 | MCP name | 说明 |
|------|----------|------|
| JSON 格式化 | `json_format` | 缩进美化 |
| JSON 验证 | `json_validate` | 语法 + JSON Schema |
| JSON 压缩 | `json_minify` | 去空格 |
| JSON 差异 | `json_diff` | 两 JSON 对比 |
| JSON → Zod | `json_to_zod` | 生成 Zod Schema |
| JSON → TypeScript | `json_to_typescript` | 生成 TS 类型（数组含对象用 union，保证可编译） |
| JSON → Python | `json_to_python` | 生成合法 Python dict |
| JSON → Pydantic | `json_to_pydantic` | 生成 Pydantic v2 模型（支持嵌套/数组） |
| Token 估算 | `json_token_count` | LLM token 粗估（标注为估算值） |
| JSONPath 查询 | `jsonpath_query` | 子集：$.a.b / [n] / [*] / ..递归 / [?(@.k>1)] 过滤 |

### 编码 / 转换
| 工具 | MCP name | 说明 |
|------|----------|------|
| Base64 编码 | `base64_encode` | UTF-8 安全 |
| Base64 解码 | `base64_decode` | 支持 URL-safe |
| URL 编码 | `url_encode` | encodeURIComponent |
| URL 解码 | `url_decode` | decodeURIComponent |
| 进制转换 | `number_base` | 2..36 进制（BigInt 无精度损失） |
| 时间戳转换 | `timestamp_convert` | Unix 秒/毫秒 ↔ ISO/UTC |
| CSV → JSON | `csv_to_json` | 支持引号/转义/换行 |
| JSON → CSV | `json_to_csv` | 数组对象 → 表头 CSV |

### 生成 / 安全
| 工具 | MCP name | 说明 |
|------|----------|------|
| 正则测试 | `regex_test` | pattern 测试 + 捕获组 |
| JWT 解码 | `jwt_decode` | header/payload/过期 |
| BCrypt 验证 | `bcrypt_verify` | 密码比对 |
| 哈希生成 | `hash_generate` | MD5/SHA/BCrypt |
| UUID 生成 | `uuid_generate` | v4 / v7 |
| 随机 Token | `random_token` | hex / base64 / base64url |
| 密码生成 | `password_generate` | 强随机，每类字符至少一个 |

## 部署

### Render（推荐）

```bash
# 1. Fork 或上传到 GitHub

# 2. Connect GitHub repo on Render
#    - Build command: npm install && npm run build
#    - Start command: STDOUT_MODE=http npm start
#    - Environment: Node
#    - Health check: /health

# 3. 环境变量
STDOUT_MODE=http   # HTTP 模式
PORT=10000         # Render 分配端口
NODE_ENV=production
```

或直接用 `render.yaml` 推送到 Render：

```bash
# Install Render CLI
npm install -g @render/comploy

# Deploy
render deploy
```

### Railway

```bash
# 1. railway login
railway login

# 2. railway init
cd packages/jsonversal-mcp-server
railway init

# 3. railway up
railway up

# 4. Set environment
railway env set STDOUT_MODE=http
```

### Docker

```bash
docker build -t jsonversal-mcp .
docker run -p 3000:3000 -e STDOUT_MODE=http jsonversal-mcp
```

## 使用

### MCP 模式（stdio）

```bash
# Claude Desktop 等 MCP 客户端
STDOUT_MODE=mcp node dist/index.js
```

### HTTP 模式（REST API）

```bash
STDOUT_MODE=http PORT=3000 node dist/index.js
```

### HTTP API 调用

```bash
# 健康检查
curl http://localhost:3000/health

# 工具列表
curl http://localhost:3000/tools

# JSON 格式化
curl -X POST http://localhost:3000/json_format \
  -H "Content-Type: application/json" \
  -d '{"json":"{\"ok\":true}","indent":2}'

# JWT 解码
curl -X POST http://localhost:3000/jwt_decode \
  -H "Content-Type: application/json" \
  -d '{"token":"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"}'
```

## MCP 注册

提交到 [modelcontextprotocol.io/registry](https://modelcontextprotocol.io/registry) 让 Agent 自动发现。

## 开发

```bash
pnpm install
pnpm run dev     # tsx watch
pnpm run build   # tsc
pnpm run test    # handler tests
STDOUT_MODE=http pnpm start
```
