# MCP stdio 连接指南

## 架构概览

```
AI Agent ──stdio──> MCP Server (bunx cursor-talk-to-figma-mcp)
                         │
                    WebSocket (port 3055)
                         │
                    Figma Plugin (浏览器中运行)
```

三层结构：
1. **MCP Server**：Node.js 进程，通过 stdin/stdout 接收 JSON-RPC 消息
2. **WebSocket 中继**：运行在端口 3055，转发 MCP Server 和 Figma Plugin 之间的消息
3. **Figma Plugin**：在 Figma 编辑器中运行，执行实际的设计操作

## 连接步骤

### 1. 确认前置条件

```bash
# WebSocket 中继服务器在运行
lsof -i :3055

# Figma 插件已连接并提供了频道 ID（如 gf20r91q）
```

### 2. MCP 初始化握手（必须按顺序）

```javascript
// Step 1: initialize 请求
rpc('initialize', {
  protocolVersion: '2024-11-05',
  capabilities: {},
  clientInfo: { name: 'my-client', version: '1.0' }
});

// Step 2: 等待 1-2 秒

// Step 3: notifications/initialized 通知（注意：无 id 字段）
stdin.write('{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}\n');

// Step 4: 等待 1 秒

// Step 5: join_channel
call('join_channel', { channel: '<channel-id>' });
```

### 3. 开始执行命令

加入频道后即可调用 `create_frame`、`create_text` 等工具。

## ⚠️ 踩坑记录

### 坑 1：管道方式不可行

```bash
# ❌ 错误：stdin 关闭后进程退出
echo '{"jsonrpc":"2.0",...}' | bunx cursor-talk-to-figma-mcp
```

MCP 服务器是**有状态的长连接进程**，需要保持 stdin/stdout 持续打开。

**正确做法**：用 `child_process.spawn` 创建子进程，保持 stdin pipe 开放。

### 坑 2：macOS 没有 timeout 命令

```bash
# ❌ macOS 无此命令
timeout 10 bunx ...

# ✅ 替代方案
perl -e 'alarm 10; exec @ARGV' bunx ...
```

### 坑 3：bunx 路径问题

`spawn('bunx', ...)` 在 Node.js 子进程中可能找不到 bun。

**正确做法**：使用绝对路径：

```javascript
const bunxPath = path.join(process.env.HOME, '.bun/bin/bunx');
spawn(bunxPath, ['cursor-talk-to-figma-mcp@latest']);
```

### 坑 4：notifications/initialized 不能有 id 字段

```javascript
// ❌ 错误：带 id 字段
{ "jsonrpc": "2.0", "id": 2, "method": "notifications/initialized", "params": {} }

// ✅ 正确：通知消息不带 id
{ "jsonrpc": "2.0", "method": "notifications/initialized", "params": {} }
```

### 坑 5：响应缓冲区拼接

stdout 可能分多次 `data` 事件传输一条完整消息：

```javascript
let buf = '';
proc.stdout.on('data', (d) => {
  buf += d.toString();
  const lines = buf.split('\n');
  buf = lines.pop(); // 保留不完整的最后一行
  for (const line of lines) {
    if (!line.trim()) continue;
    const json = JSON.parse(line);
    // 处理完整消息
  }
});
```

### 坑 6：并发请求需要 id 匹配

所有请求都必须用唯一递增的 `id`，响应通过 `id` 匹配回调：

```javascript
const pending = {};
let msgId = 1;

function rpc(method, params) {
  return new Promise((resolve) => {
    const id = msgId++;
    pending[id] = resolve;
    proc.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
    setTimeout(() => { delete pending[id]; resolve({ error: 'timeout' }); }, 8000);
  });
}
```

## CodeBuddy MCP 配置

如果 CodeBuddy 内置 MCP 支持可用，配置 `~/.codebuddy/mcp.json`：

```json
{
  "mcpServers": {
    "TalkToFigma": {
      "name": "TalkToFigma",
      "transport": "stdio",
      "command": "bunx",
      "args": ["cursor-talk-to-figma-mcp@latest"],
      "env": {},
      "disabled": false
    }
  }
}
```

此时可直接使用 `mcp__TalkToFigma__join_channel` 等工具，无需自行管理进程。

但当 CodeBuddy MCP 集成不可用或需要更精细控制时，使用 `scripts/figma-mcp-client.js` 脚本。
