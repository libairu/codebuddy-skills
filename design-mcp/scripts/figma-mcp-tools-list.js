/**
 * 获取 TalkToFigma MCP 服务器的完整工具列表及参数定义
 *
 * 用法:
 *   node figma-mcp-tools-list.js [--bunx <path>]
 *
 * 输出每个工具的名称、必填参数和可选参数。
 * 在首次使用 MCP 或工具版本更新时运行一次，了解可用工具和参数要求。
 */
const { spawn } = require('child_process');
const path = require('path');

const bunxPath = process.argv.includes('--bunx')
  ? process.argv[process.argv.indexOf('--bunx') + 1]
  : path.join(process.env.HOME || '', '.bun/bin/bunx');

const proc = spawn(bunxPath, ['cursor-talk-to-figma-mcp@latest']);
let buf = '';
let id = 1;

proc.stdout.on('data', (d) => {
  buf += d.toString();
  const lines = buf.split('\n');
  buf = lines.pop();
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const json = JSON.parse(line);
      if (json.result?.tools) {
        console.log(`\n📦 Found ${json.result.tools.length} tools:\n`);
        json.result.tools.forEach((t) => {
          const required = t.inputSchema?.required || [];
          const props = Object.entries(t.inputSchema?.properties || {});
          const reqStr = props
            .filter(([k]) => required.includes(k))
            .map(([k, v]) => `${k}:${v.type}`)
            .join(', ');
          const optStr = props
            .filter(([k]) => !required.includes(k))
            .map(([k, v]) => `${k}?:${v.type}`)
            .join(', ');
          console.log(`  ${t.name}(${reqStr}${optStr ? ' | ' + optStr : ''})`);
          if (t.description) {
            console.log(`    └─ ${t.description.substring(0, 100)}`);
          }
        });
        proc.kill();
        process.exit(0);
      }
    } catch (_) {}
  }
});

proc.stderr.on('data', () => {});

const write = (m) => proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: id++, ...m }) + '\n');

write({
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'tools-inspector', version: '1.0' },
  },
});

setTimeout(() => {
  proc.stdin.write('{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}\n');
}, 2000);

setTimeout(() => {
  write({ method: 'tools/list', params: {} });
}, 3500);

// 兜底超时
setTimeout(() => {
  console.error('❌ Timeout — no tools/list response');
  proc.kill();
  process.exit(1);
}, 15000);
