/**
 * Figma MCP Client — 通过 TalkToFigma MCP 执行设计命令
 *
 * 用法:
 *   node figma-mcp-client.js <commands.json> [--channel <id>] [--bunx <path>]
 *
 * 命令文件格式见 references/command-format.md
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// ── CLI 参数 ──────────────────────────────────────────────
const args = process.argv.slice(2);
let cmdFile = null, channel = null, bunxPath = null, timeout = 8000;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--channel') { channel = args[++i]; continue; }
  if (args[i] === '--bunx') { bunxPath = args[++i]; continue; }
  if (args[i] === '--timeout') { timeout = parseInt(args[++i], 10); continue; }
  if (!cmdFile) cmdFile = args[i];
}

if (!cmdFile) {
  console.error('Usage: node figma-mcp-client.js <commands.json> [--channel <id>] [--bunx <path>]');
  process.exit(1);
}

if (!bunxPath) {
  bunxPath = path.join(process.env.HOME || '', '.bun/bin/bunx');
}

// ── MCP 进程管理 ─────────────────────────────────────────
const proc = spawn(bunxPath, ['cursor-talk-to-figma-mcp@latest'], {
  stdio: ['pipe', 'pipe', 'pipe'],
});

let buf = '';
const pending = {};
let msgId = 1;

proc.stdout.on('data', (data) => {
  buf += data.toString();
  const lines = buf.split('\n');
  buf = lines.pop(); // 保留不完整的行
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const json = JSON.parse(line);
      if (json.id && pending[json.id]) {
        const cb = pending[json.id];
        delete pending[json.id];
        cb(json);
      }
    } catch (_) {}
  }
});

proc.stderr.on('data', () => {}); // 静默忽略 stderr

// ── RPC 调用 ─────────────────────────────────────────────
function rpc(method, params, timeoutMs = timeout) {
  return new Promise((resolve) => {
    const id = msgId++;
    pending[id] = resolve;
    proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    setTimeout(() => {
      if (pending[id]) {
        delete pending[id];
        resolve({ error: 'timeout' });
      }
    }, timeoutMs);
  });
}

function call(toolName, toolArgs, timeoutMs = timeout) {
  return rpc('tools/call', { name: toolName, arguments: toolArgs }, timeoutMs);
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Node ID 提取 ─────────────────────────────────────────
// MCP 返回格式: Created rectangle "{"id":"6:112","name":"Btn",...}"
// 即 content[0].text 中嵌套了一个 JSON 字符串
function extractNodeId(resp) {
  try {
    const text = resp?.result?.content?.[0]?.text || '';

    // 格式 1: 嵌套 JSON 字符串 — Created xxx "{"id":"6:112",...}"
    const nestedMatch = text.match(/"(\{[^"]*"id"[^"]*\})"/);
    if (nestedMatch) {
      const inner = JSON.parse(nestedMatch[1]);
      if (inner.id) return inner.id;
    }

    // 格式 2: 直接 JSON
    const data = JSON.parse(text);
    return data.id || data.nodeId || null;
  } catch (_) {
    // 格式 3: 正则兜底
    const m = (resp?.result?.content?.[0]?.text || '').match(/"id"\s*:\s*"([^"]+)"/);
    return m ? m[1] : null;
  }
}

// ── 主流程 ───────────────────────────────────────────────
async function main() {
  const cmds = JSON.parse(fs.readFileSync(cmdFile, 'utf8'));

  // 1. MCP 初始化握手
  console.log('⏳ Initializing MCP...');
  await rpc('initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'figma-design-client', version: '1.0' },
  });
  await delay(1000);
  proc.stdin.write('{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}\n');
  await delay(1000);
  console.log('✅ MCP initialized');

  // 2. 加入频道
  if (channel) {
    const joinResp = await call('join_channel', { channel });
    const joinText = joinResp?.result?.content?.[0]?.text || '';
    console.log(`📡 Channel: ${joinText}`);
    await delay(500);
  }

  // 3. 执行命令序列
  let lastNodeId = null;
  const nodeMap = {};
  let ok = 0, err = 0;

  for (let i = 0; i < cmds.length; i++) {
    const cmd = cmds[i];
    const args = { ...(cmd.arguments || {}) };

    // 解析 $LAST 和 $name 引用
    for (const key in args) {
      if (args[key] === '$LAST' && lastNodeId) {
        args[key] = lastNodeId;
      } else if (typeof args[key] === 'string' && args[key].startsWith('$')) {
        const ref = args[key].substring(1);
        if (nodeMap[ref]) args[key] = nodeMap[ref];
      }
    }

    process.stdout.write(`[${i + 1}/${cmds.length}] ${cmd.name}${cmd.as ? ' (' + cmd.as + ')' : ''} `);
    const resp = await call(cmd.name, args, timeout);

    if (resp.error) {
      err++;
      const errMsg = typeof resp.error === 'string'
        ? resp.error
        : (resp.error.message || JSON.stringify(resp.error));
      process.stdout.write('✗ ' + errMsg.substring(0, 80) + '\n');
    } else {
      ok++;
      const nid = extractNodeId(resp);
      if (nid) lastNodeId = nid;
      if (cmd.as && nid) nodeMap[cmd.as] = nid;
      process.stdout.write('✓' + (nid ? ` [${nid}]` : '') + '\n');
    }

    await delay(cmd.d || 800);
  }

  console.log(`\n🏁 Done! OK:${ok} ERR:${err}`);
  if (Object.keys(nodeMap).length > 0) {
    console.log('📋 Node map:', JSON.stringify(nodeMap, null, 2));
  }

  proc.kill();
  process.exit(err > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error('Fatal:', e);
  proc.kill();
  process.exit(1);
});
