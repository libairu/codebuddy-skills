---
name: design-mcp
description: 通过 TalkToFigma MCP 在 Figma 中生成设计稿。当用户需要通过 AI 在 Figma 中创建 UI 设计、生成页面布局、或使用 cursor-talk-to-figma-mcp 工具时使用此 skill。触发词：Figma 生成设计、TalkToFigma、MCP 创建设计、Figma MCP、design generation、生成 Figma 页面。
---

# Design MCP — Figma 设计生成

通过 TalkToFigma MCP（cursor-talk-to-figma-mcp）在 Figma 中程序化创建 UI 设计。

## 快速开始

基础路径：`{skill_dir}` 指当前 skill 目录。

```bash
# 1. 获取可用工具列表（首次或版本更新时）
node {skill_dir}/scripts/figma-mcp-tools-list.js

# 2. 执行设计命令
node {skill_dir}/scripts/figma-mcp-client.js commands.json --channel <channel-id>
```

## 核心工作流

### Phase 0: 环境确认

1. 确认 WebSocket 中继服务器运行中：`lsof -i :3055`
2. 确认 Figma Plugin 已连接并获取频道 ID
3. 如 CodeBuddy MCP 集成可用（`mcp__TalkToFigma__*` 工具），直接使用内置工具，跳过脚本

### Phase 1: 工具发现

**首次使用必做**。运行 `figma-mcp-tools-list.js` 获取全部工具及参数签名。

关键发现（已验证）：
- `create_frame` 支持 `fillColor` 内联参数 → 优先使用，减少命令数
- `create_text` 支持 `fontColor` 内联参数
- `create_rectangle` **不支持**内联颜色/圆角 → 必须后续 `set_fill_color` + `set_corner_radius`
- `create_ellipse` **不存在** → 用正方形 rectangle + corner_radius 模拟圆形
- 修改类工具 (`set_fill_color`/`set_corner_radius`) 需要 `nodeId` 参数

工具 API 详情见 [references/command-format.md](references/command-format.md)。

### Phase 2: 规划设计

将页面拆分为区域，每区域一个 JSON 命令文件：

```
step1-nav-hero.json       ← 导航栏 + Hero（~35 条命令）
step2-content.json        ← 主内容区（~45 条命令）
step3-footer.json         ← 页脚（~30 条命令）
```

**每批不超过 45 条命令**，避免超时和消息拥塞。

### Phase 3: 编写命令

命令文件格式详见 [references/command-format.md](references/command-format.md)。

关键规则：
1. **内联优先**：`create_frame` 用 `fillColor`，`create_text` 用 `fontColor`
2. **创建-修改紧邻**：rectangle 的 `create → set_corner_radius → set_fill_color` 紧连
3. **$LAST 引用**：修改类工具用 `"nodeId": "$LAST"` 引用上一个创建的节点
4. **命名引用**：关键节点用 `"as": "name"` 命名，后续 `"$name"` 引用
5. **合理延迟**：创建操作 1200-2000ms，修改操作 700-800ms

### Phase 4: 执行

```bash
# 先清理画布（可选）
node {skill_dir}/scripts/figma-mcp-client.js cleanup.json --channel <id>

# 分步执行
node {skill_dir}/scripts/figma-mcp-client.js step1.json --channel <id>
node {skill_dir}/scripts/figma-mcp-client.js step2.json --channel <id>
node {skill_dir}/scripts/figma-mcp-client.js step3.json --channel <id>
```

执行脚本会输出每条命令的成功/失败状态和捕获的 nodeId。

### Phase 5: 验证与调整

执行完成后检查 Figma 文件。注意：
- 节点是**平铺**在画布上的（绝对坐标），不会自动嵌套
- 如需调整，编写增量命令文件（修改 or 删除 + 重建）

## 常见问题

| 问题 | 解决 |
|------|------|
| `set_fill_color` 失败 | 检查 `nodeId` 是否正确传入，使用 `$LAST` 而非空值 |
| 命令超时 | 增加 `d` 延迟值，或减少单批命令数 |
| 节点创建在错误位置 | 坐标是画布绝对坐标，需要手动计算 |
| WebSocket 断连 | 检查端口 3055，必要时重启中继服务器和 Figma 插件 |
| 频道已过期 | 在 Figma 插件中重新连接获取新频道 ID |

## 参考文档

- [命令格式与工具 API](references/command-format.md)
- [MCP 连接指南与踩坑记录](references/mcp-connection.md)
- [设计模式与布局模板](references/design-patterns.md)
