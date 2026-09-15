import { Server } from '/opt/jsonversal/packages/jsonversal-mcp-server/node_modules/@modelcontextprotocol/sdk/dist/esm/server/index.js';
import { StdioServerTransport } from '/opt/jsonversal/packages/jsonversal-mcp-server/node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '/opt/jsonversal/packages/jsonversal-mcp-server/node_modules/@modelcontextprotocol/sdk/dist/esm/types.js';
console.log('Server:', typeof Server);
console.log('Transport:', typeof StdioServerTransport);
console.log('Schemas:', typeof CallToolRequestSchema, typeof ListToolsRequestSchema);
