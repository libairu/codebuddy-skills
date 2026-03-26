# 让 AI 直接画 Figma 设计稿！CodeBuddy + MCP 全链路实战指南

> 用 AI 写代码已经不新鲜了，但用 AI 直接在 Figma 里画设计稿呢？本文是一篇从零到一的**完整实战指南**——涵盖环境搭建、Token 配置、插件安装、一句话出图、5 个真实踩坑记录，以及 MCP 启动失败的系统化排查方案。不管你是想尝鲜还是排错，这一篇就够了。

## 一、先看效果

一句话 prompt：

> "帮我在 Figma 中创建一个设计师个人网站首页，包含导航栏、Hero 区域、统计栏、作品集展示、关于我和页脚。风格现代简洁，紫色主色调。"

2 分钟后，Figma 画布上就出现了一个完整的 1440px 桌面端首页设计：

- 🎯 **导航栏**：Logo + 4 个导航链接 + "Hire Me" CTA 按钮
- 🦸 **Hero 区域**："Available for work" 胶囊标签 + 大标题 + 描述 + 双按钮 + 右侧配图占位
- 📊 **统计栏**：深色背景，4 组关键数字（8+ Years / 120+ Projects / 50+ Clients / 15+ Awards）
- 🖼️ **作品集**：4 个项目卡片，带分类标签和描述
- 👤 **关于我**：头像占位 + 个人简介 + 技能标签云 + Download CV 按钮
- 🔗 **页脚**：CTA 大文字 + 联系方式 + 社交链接

整个过程，我没打开 Figma 的任何工具面板，没拖过一个图层，甚至连颜色选择器都没碰过。

**这就是 Figma MCP 的魔力。**

---

## 二、这是什么黑科技？

### 2.1 MCP 是什么

MCP（Model Context Protocol）是 Anthropic 提出的开放协议，让 AI 模型能通过标准化接口调用外部工具。你可以把它理解为 **AI 的 USB 接口**——插上不同的 MCP 服务器，AI 就获得了不同的超能力。

### 2.2 Figma MCP 是什么

社区大神做了一个叫 **cursor-talk-to-figma-mcp** 的插件，架构是这样的：

```
CodeBuddy (AI IDE)
    │
    │  stdio (JSON-RPC)
    ▼
MCP Server (cursor-talk-to-figma-mcp)
    │
    │  WebSocket (port 3055)
    ▼
Figma Plugin (浏览器中运行)
    │
    ▼
Figma 画布 ← 元素被创建在这里！
```

三层架构，AI 的指令通过 MCP 协议 → WebSocket 中继 → Figma 插件，最终在你的 Figma 文件里**真实地创建出图层、矩形、文字、设置颜色和圆角**。

不是生成截图，不是生成代码——是**直接操作 Figma 画布**。

### 2.3 为什么选 CodeBuddy

CodeBuddy 原生支持 MCP 协议配置。只需在 `~/.codebuddy/mcp.json` 中添加一条配置，就能让 AI 助手直接调用 Figma MCP 的所有工具。零代码接入，开箱即用。

---

## 三、保姆级安装教程

### 📋 前置条件

| 工具 | 版本要求 | 安装方式 |
|------|----------|----------|
| CodeBuddy | 最新版 | [官网下载](https://www.codebuddy.ai) |
| Node.js | ≥ 18 | `brew install node` 或 [官网](https://nodejs.org) |
| Bun 运行时 | 最新版 | `curl -fsSL https://bun.sh/install \| bash` |
| Figma 桌面版或网页版 | - | [figma.com](https://figma.com) |

### Step 1：安装 Bun 运行时

cursor-talk-to-figma-mcp 依赖 Bun 运行时来启动 MCP Server。如果你还没安装：

```bash
curl -fsSL https://bun.sh/install | bash
```

安装完成后**重启终端**（这一步很重要！），然后验证：

```bash
bun --version
# 输出版本号即可，如 1.2.5

# 同时确认 bunx 命令可用
which bunx
# 应该输出类似 /Users/你的用户名/.bun/bin/bunx
```

> 💡 **记住这个 bunx 路径**，后面配置 MCP 时可能用到。

### Step 2：获取 Figma Personal Access Token

如果你想同时使用 Figma 官方 MCP（只读能力，读取设计稿详细数据），就需要获取 Figma 的 Personal Access Token。**如果只用 TalkToFigma MCP（写入能力），可以跳过此步。**

#### 2.1 创建 Token

1. 打开浏览器，登录 [figma.com](https://www.figma.com)
2. 点击左上角头像 → **Settings**（设置）
3. 切换到 **Security**（安全）标签页
4. 向下滚动，找到 **Personal access tokens** 区域
5. 点击 **Generate new token**（生成新令牌）
6. 输入一个便于识别的名称，如 `codebuddy-mcp`
7. 选择需要的权限范围（Scopes）：
   - **File content** → `Read-only`（必选，读取设计稿内容）
   - 其他权限按需勾选
8. 按 **Enter** 确认

#### 2.2 复制并保存 Token

⚠️ **重要提醒**：Token 只会显示一次！生成后**立即复制保存**到安全位置。如果忘了复制，只能删除重新生成。

Token 格式形如：`figd_<your-token-here>`

#### 2.3 Token 安全建议

- 🔒 不要把 Token 提交到 Git 仓库
- 🔒 不要在聊天/文章中泄露完整 Token
- 🔒 不再使用时及时到 Figma Settings 中 **Revoke**（撤销）

### Step 3：安装 Figma 插件（Cursor Talk To Figma MCP Plugin）

这个插件是整个链路的**最后一环**——它运行在 Figma 编辑器中，负责接收 AI 发来的指令并执行真实的设计操作。

#### 方式一：从 Figma 社区安装（推荐）

1. 打开 Figma **桌面版或网页版**，进入任意设计文件
2. 右键画布 → **Plugins** → **Find more plugins**（或顶部菜单 Resources → Plugins）
3. 在搜索框输入 **"Cursor Talk To Figma MCP"**
4. 找到插件后，点击 **Install** 安装

#### 方式二：通过 Figma Community 链接安装

1. 打开浏览器访问 [Figma Community](https://www.figma.com/community)
2. 搜索 **"Cursor Talk To Figma MCP"**
3. 点击 **Install** 按钮
4. 安装完成后回到 Figma 编辑器

#### 运行插件

安装完成后，在 Figma 编辑器中运行插件：

1. 右键画布 → **Plugins** → 找到 **"Cursor Talk To Figma MCP"** → 点击 **Run**
2. 或者用顶部菜单：**Plugins** → **Cursor Talk To Figma MCP**

插件启动后会弹出一个控制面板，上面有：

- ✅ **WebSocket 连接状态**：显示 "Connected" 表示 WebSocket 中继服务连接正常
- 📋 **Channel ID（频道 ID）**：一串随机字符，如 `gf20r91q`，**记下来，后面要用！**
- 📜 **消息日志**：实时显示收发的消息

> 💡 **注意**：
> - 频道 ID 每次重新运行插件都会**重新生成**，旧的 ID 会失效
> - 如果显示 "Disconnected"，说明 WebSocket 中继服务未启动（后面的排查章节会讲解决方案）
> - 插件需要保持运行状态，关闭面板会断开连接

### Step 4：配置 CodeBuddy MCP

现在来配置 CodeBuddy，让 AI 能找到并调用 Figma MCP Server。

#### 4.1 配置 TalkToFigma MCP（写入能力）

打开或创建文件 `~/.codebuddy/mcp.json`：

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

> ⚠️ 如果你已有其他 MCP 配置，把 `"TalkToFigma": {...}` 这一段加到现有的 `mcpServers` 对象中即可，**不要覆盖已有配置**！

#### 4.2 同时配置 Figma 官方 MCP（可选，读取能力）

如果你在 Step 2 获取了 Personal Access Token，可以同时配置 Figma 官方 MCP，实现**读+写**双向能力：

```json
{
  "mcpServers": {
    "figma": {
      "name": "figma",
      "transport": "streamable-http",
      "url": "https://mcp.figma.com/mcp",
      "headers": {
        "Authorization": "Bearer <替换为你的 Personal Access Token>"
      },
      "disabled": false
    },
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

**两个 MCP 的分工**：

| MCP | 协议 | 能力 | 用途 |
|-----|------|------|------|
| **figma**（官方） | streamable-http | 只读 | 读取设计稿结构、组件、样式、变量等详细数据 |
| **TalkToFigma** | stdio + WebSocket | 读写 | 在画布上创建/修改图层、文字、形状、颜色等 |

#### 4.3 使配置生效

保存 `mcp.json` 后，**重启 CodeBuddy** 使配置生效。

重启后，可以在 CodeBuddy 的 MCP 设置面板中确认 MCP 服务状态。如果显示绿色状态灯，说明 MCP Server 启动成功。

### Step 5：验证连接

所有组件就绪后，来做最终验证。

#### 5.1 确认 Figma 插件运行中

回到 Figma 编辑器，确保插件面板打开，状态显示 "Connected"，记下最新的 **Channel ID**。

#### 5.2 在 CodeBuddy 中测试

新建一个对话，输入：

```
使用 TalkToFigma MCP，加入频道 <你的频道ID>，然后获取当前文档信息
```

把 `<你的频道ID>` 替换为插件面板上显示的真实 ID。

#### 5.3 验证成功的标志

- ✅ AI 返回了 Figma 文件的文档结构信息（文件名、页面列表等）
- ✅ Figma 插件面板上的消息日志在滚动，显示收发的消息
- ✅ 没有报错信息

看到这些？恭喜，**AI 已经成功连上你的 Figma 了！** 🎉

---

## 四、实战：一句话生成完整 UI

### 4.1 加入频道

确保 Figma 插件正在运行，记下频道 ID。

### 4.2 下达设计指令

在 CodeBuddy 对话中输入：

```
先加入 Figma 频道 <频道ID>，然后帮我创建一个设计师个人作品集网站首页。
要求：
- 1440px 桌面端宽度
- 现代简洁风格，紫色主色调
- 包含：导航栏、Hero 区域（大标题+描述+CTA按钮）、数据统计栏、
  作品集展示（4张卡片）、关于我区域、页脚
- 注意排版层级和间距
```

然后坐下来，看 AI 在你的 Figma 中一层一层地搭建界面 ——

你会看到 Figma 画布上的图层列表在飞速增长：先是导航栏的白色底框，然后是 Logo 文字，然后是导航链接，CTA 按钮……

**整个过程大约 2 分钟。** 最终你会得到一个包含 100+ 图层的完整设计稿。

### 4.3 AI 做了什么？

在这 2 分钟里，AI 自动完成了：

1. **调用 `join_channel`** 连接到你的 Figma 文件
2. **调用 `create_frame`** 创建各区域的容器，直接内联 `fillColor` 设置背景色
3. **调用 `create_text`** 创建所有文字内容，内联 `fontColor` 设置文字颜色
4. **调用 `create_rectangle`** 创建按钮、卡片、标签等形状
5. **调用 `set_corner_radius`** 设置圆角（按钮用 22px 全圆角，卡片用 16px）
6. **调用 `set_fill_color`** 设置填充颜色

每个操作之间还精心控制了延迟（1-2 秒），避免 WebSocket 消息拥塞。

---

## 五、踩坑实录 & 避坑指南

为了这个看似轻松的 "2 分钟"，我实际踩了不少坑。把它们记下来，帮你省掉调试时间。

### 坑 1：`bunx` 命令找不到

**现象**：CodeBuddy 报错 `spawn bunx ENOENT`

**原因**：MCP 子进程的 PATH 环境变量和你的终端不同，找不到 bun 的安装路径。

**解决**：在 mcp.json 中用绝对路径：

```json
{
  "command": "/Users/你的用户名/.bun/bin/bunx",
  "args": ["cursor-talk-to-figma-mcp@latest"]
}
```

或者，确保 `bunx` 在 `/usr/local/bin/` 下有软链接。

### 坑 2：插件显示 "Disconnected"

**现象**：Figma 插件面板显示 WebSocket 未连接

**原因**：WebSocket 中继服务器（端口 3055）没有正常启动。cursor-talk-to-figma-mcp 在启动时会自动拉起中继服务器。

**解决**：

```bash
# 检查端口是否被占用
lsof -i :3055

# 如果被旧进程占用，杀掉重来
kill -9 <PID>
```

然后重启 CodeBuddy 或重新触发 MCP 连接。

### 坑 3：频道 ID 过期

**现象**：`join_channel` 返回成功，但后续操作无响应

**原因**：Figma 插件重新运行后频道 ID 会变化，旧的 ID 已经失效。

**解决**：每次开始前，在 Figma 插件面板上确认最新的频道 ID。

### 坑 4：元素都堆在一起

**现象**：创建了很多元素，但全都重叠在坐标 (0, 0)

**原因**：没有正确指定每个元素的 x/y 坐标。MCP 创建的节点使用**绝对坐标**，不会自动布局。

**解决**：这个需要 AI 在生成命令时仔细计算每个元素的位置。如果你用自然语言描述，好的 AI 模型会帮你做好布局计算。

### 坑 5：macOS 下 `timeout` 命令不存在

**现象**：如果你用脚本方式调试，`timeout 10 bunx ...` 报错

**解决**：macOS 没有 `timeout`，用这个替代：

```bash
brew install coreutils
# 然后用 gtimeout 代替 timeout
gtimeout 10 bunx cursor-talk-to-figma-mcp@latest
```

---

## 六、MCP 启动失败排查指南

安装配置看着简单，但真正跑起来总会遇到各种问题。这一章专门梳理 MCP 启动失败的**系统化排查方向**，帮你快速定位问题。

### 🔍 排查思路总览

MCP 连接链路是 **三段式** 的，哪段断了都不行：

```
CodeBuddy ──[1]── MCP Server ──[2]── WebSocket 中继 ──[3]── Figma 插件
```

排查顺序：**从右往左**——先确认 Figma 插件正常，再查 WebSocket，最后查 MCP Server。

### 排查方向 1：MCP Server 未启动

**现象**：CodeBuddy MCP 面板中 TalkToFigma 显示红色状态灯 / 报错 "Server failed to start"

**排查步骤**：

```bash
# 1. 确认 bunx 命令存在
which bunx
# 如果没输出，说明 bun 没装好，重新执行 Step 1

# 2. 手动启动 MCP Server 测试
bunx cursor-talk-to-figma-mcp@latest
# 正常情况会持续运行，输出等待 stdio 输入的状态
# 如果立即退出或报错，看错误信息

# 3. 如果报 "permission denied"
chmod +x $(which bunx)

# 4. 如果报 "package not found"
bun cache clean
bunx cursor-talk-to-figma-mcp@latest
```

**常见原因 & 解决**：

| 报错 | 原因 | 解决 |
|------|------|------|
| `spawn bunx ENOENT` | CodeBuddy 子进程的 PATH 找不到 bunx | 在 mcp.json 中用 bunx 的**绝对路径**，如 `/Users/你的用户名/.bun/bin/bunx` |
| `Error: Cannot find package` | 网络问题或 bun 缓存损坏 | `bun cache clean` 后重试 |
| `EACCES: permission denied` | bunx 可执行文件权限不够 | `chmod +x ~/.bun/bin/bunx` |
| 进程秒退无报错 | Node.js 版本太低 | 升级到 Node.js ≥ 18 |

### 排查方向 2：WebSocket 中继服务异常

**现象**：MCP Server 启动了，但 Figma 插件显示 "Disconnected"；或者 `join_channel` 无响应

**排查步骤**：

```bash
# 1. 检查端口 3055 是否有进程在监听
lsof -i :3055

# 正常情况应该看到类似：
# COMMAND   PID   USER   FD   TYPE   DEVICE   SIZE/OFF   NODE NAME
# node    12345  user    23u  IPv6  0x...     0t0        TCP *:3055 (LISTEN)

# 2. 如果端口被旧进程占用
kill -9 <PID>
# 然后重启 CodeBuddy

# 3. 如果端口未被监听
# 说明 MCP Server 未成功启动 WebSocket 服务，回到排查方向 1
```

**常见原因 & 解决**：

| 问题 | 原因 | 解决 |
|------|------|------|
| 端口 3055 被其他程序占用 | 之前的 MCP Server 进程没有退出干净 | `kill -9` 旧进程，重启 CodeBuddy |
| 防火墙拦截 | macOS 防火墙阻止了本地端口通信 | 系统偏好设置 → 安全性与隐私 → 防火墙 → 允许传入连接 |
| 插件面板反复 Connected / Disconnected | WebSocket 连接不稳定 | 关闭 VPN / 代理，或检查网络稳定性 |

### 排查方向 3：Figma 插件连接问题

**现象**：插件安装了但打不开、运行后无反应、或频道 ID 不显示

**排查步骤**：

1. **确认 Figma 版本**：建议使用 Figma **桌面版**，网页版也可以但偶尔会有限制
2. **确认已进入设计文件**：插件需要在一个打开的设计文件中运行，不能在 Figma 首页运行
3. **重新运行插件**：右键画布 → Plugins → Cursor Talk To Figma MCP → Run
4. **检查浏览器控制台**（网页版）：F12 打开开发者工具，查看有无报错

**常见原因 & 解决**：

| 问题 | 原因 | 解决 |
|------|------|------|
| 插件面板空白 | 插件未正确加载 | 关闭并重新运行插件；或卸载后重新安装 |
| 频道 ID 不显示 | WebSocket 连接失败 | 确认本地 3055 端口有服务在监听（先启动 MCP Server） |
| 频道 ID 已过期 | 重新运行插件后 ID 变了 | 每次重连时在插件面板上获取最新 ID |
| "Plugin ran into an error" | Figma 插件 API 变更或版本不兼容 | 卸载插件，安装最新版本 |

### 排查方向 4：CodeBuddy MCP 配置问题

**现象**：CodeBuddy 中看不到 TalkToFigma MCP 工具、或调用时报 "Tool not found"

**排查清单**：

```bash
# 1. 确认配置文件位置正确
cat ~/.codebuddy/mcp.json

# 2. 验证 JSON 格式
# 常见错误：多余的逗号、缺少引号、大括号不匹配
python3 -c "import json; json.load(open('$HOME/.codebuddy/mcp.json'))"
# 如果报错说明 JSON 格式有问题

# 3. 确认配置字段
# - "transport" 必须是 "stdio"
# - "command" 指向正确的 bunx 路径
# - "disabled" 必须是 false
```

**一个正确的最小配置示例**（适合排查时使用）：

```json
{
  "mcpServers": {
    "TalkToFigma": {
      "name": "TalkToFigma",
      "transport": "stdio",
      "command": "/Users/你的用户名/.bun/bin/bunx",
      "args": ["cursor-talk-to-figma-mcp@latest"],
      "env": {},
      "disabled": false
    }
  }
}
```

> 💡 **排查黄金法则**：用**绝对路径**！MCP 子进程的环境变量可能和你的终端不同，用绝对路径可以排除 99% 的路径问题。

### 排查方向 5：Figma 官方 MCP 连接失败

**现象**：配置了 `figma` 官方 MCP 但状态灯为红色 / 调用报 401 / 403 错误

**排查步骤**：

1. **确认 Token 有效**：到 Figma Settings → Security → Personal access tokens 检查 Token 状态
2. **确认 Token 权限**：需要勾选 `File content: Read-only` 权限
3. **确认配置格式**：

```json
{
  "figma": {
    "name": "figma",
    "transport": "streamable-http",
    "url": "https://mcp.figma.com/mcp",
    "headers": {
      "Authorization": "Bearer figd_<your-token-here>"
    },
    "disabled": false
  }
}
```

**常见原因 & 解决**：

| 报错 | 原因 | 解决 |
|------|------|------|
| 401 Unauthorized | Token 过期或无效 | 到 Figma Settings 重新生成 Token |
| 403 Forbidden | Token 权限不足 | 确保勾选了 File content 权限 |
| Connection refused | 网络问题 | 检查是否能访问 `https://mcp.figma.com`，关闭代理试试 |
| "transport not supported" | CodeBuddy 版本过旧 | 更新到支持 `streamable-http` 的最新版 |

### 🚨 终极排查流程图

如果以上都试过了还是不行，按这个顺序走一遍：

```
1. bun --version       → 确认 Bun 安装正常
       ↓
2. bunx cursor-talk-to-figma-mcp@latest  → 手动启动 Server，看报错
       ↓
3. lsof -i :3055      → 确认 WebSocket 端口在监听
       ↓
4. Figma 插件面板      → 确认显示 Connected + Channel ID
       ↓
5. mcp.json 配置      → 确认 JSON 格式正确、路径正确
       ↓
6. 重启 CodeBuddy     → 让配置生效
       ↓
7. 对话中输入 "加入频道 <ID>"  → 测试端到端连通性
```

**如果第 2 步就报错了，说明是环境问题**——解决环境问题才是根本。
**如果第 4 步插件显示 Disconnected，说明是 WebSocket 问题**——检查端口和防火墙。
**如果前 5 步都正常但第 7 步不通，重启 CodeBuddy 通常能解决。**

---

## 七、进阶玩法

### 7.1 读取已有设计 + 修改

Figma MCP 不只能创建，还能读取。你可以：

```
读取当前 Figma 文件的文档结构，找到所有按钮元素，把它们的圆角统一改为 12px
```

### 7.2 搭配 Figma 官方 MCP（只读）实现 "读+写"

如果你在安装教程 Step 2 中已经获取了 Personal Access Token，并在 Step 4.2 中配好了 `figma` 官方 MCP，那么你的 AI 现在同时拥有了**读取**和**写入**两种能力：

- **读**：通过官方 MCP 精确读取设计稿中的组件库、设计变量、样式 token 等
- **写**：通过 TalkToFigma MCP 在画布上创建和修改元素

一个实际用法：

```
先用 Figma 官方 MCP 读取这个设计文件中所有定义的颜色变量和文字样式，
然后用 TalkToFigma 按照这些变量创建一个新页面，保持设计系统一致性。
```

这就是 "读写分离" 的威力——AI 可以先 "看懂" 你的设计系统，再 "动手" 生成符合规范的新页面。

### 7.3 批量生成多个页面

可以在一个对话中连续生成：

```
在当前 Figma 文件中创建 3 个页面设计：
1. 首页（坐标从 x=0 开始）
2. 关于页（坐标从 x=1600 开始）  
3. 联系页（坐标从 x=3200 开始）
```

AI 会自动计算坐标偏移，把三个页面并排放置在画布上。

---

## 八、它能替代设计师吗？

**当然不能。** 但它能做这些事：

| 场景 | 效果 |
|------|------|
| 🚀 **快速原型** | 产品经理 2 分钟出初版设计稿，拿去评审 |
| 📐 **布局验证** | 用 AI 快速生成多个布局方案，挑选最优 |
| 🎨 **设计初稿** | 给设计师一个 "起点"，省去从零开始搭框架的时间 |
| 📊 **批量生成** | 需要大量类似页面（如落地页、活动页）时特别好用 |
| 🧪 **技术验证** | 验证 "AI + 设计工具" 的工作流是否可行 |

它目前的局限性也很明显：

- ❌ 不支持 Auto Layout（自动布局），所有元素都是绝对定位
- ❌ 不支持组件化，创建的都是基础图层
- ❌ 不支持图片插入（只能用色块占位）
- ❌ 文字不会自动换行，多行文本需要分开创建

但这些都是工具层面的限制，随着 cursor-talk-to-figma-mcp 插件的迭代，这些能力会逐步补齐。

---

## 九、总结

| 步骤 | 时间 | 操作 |
|------|------|------|
| 安装 Bun | 30秒 | 一行命令 |
| 获取 Figma Token | 2分钟 | Figma Settings → Security → 生成 Token |
| 安装 Figma 插件 | 1分钟 | 搜索 + 安装 + 运行 |
| 配置 CodeBuddy MCP | 1分钟 | 编辑一个 JSON 文件 |
| 生成完整 UI 设计 | 2分钟 | 一句话 prompt |
| **总计** | **< 7分钟** | 🎉 |

**从安装到出图，7 分钟不到。**

这就是 MCP 协议的威力——它让 AI 不再只是"纸上谈兵"的建议者，而是真正能"动手干活"的执行者。CodeBuddy 原生的 MCP 支持让这一切变得无比简单：一个 JSON 配置文件，就打通了 AI → Figma 的最后一公里。

以前是 "AI 帮你写代码"，现在是 "AI 帮你画设计"。

**设计和开发的边界，正在被 AI 重新定义。**

---

*本文基于 CodeBuddy + cursor-talk-to-figma-mcp 的实际测试经验撰写。所有踩坑记录均为亲身经历。*

*关键字：Figma MCP, cursor-talk-to-figma-mcp, CodeBuddy, AI 设计, MCP 协议, Figma Plugin, Personal Access Token, MCP 排查*
