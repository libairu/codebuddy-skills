# 命令文件格式

命令文件是一个 JSON 数组，每个元素表示一个 MCP 工具调用。

## 基本格式

```json
[
  {
    "name": "create_frame",
    "arguments": { "name": "MyFrame", "x": 0, "y": 0, "width": 1440, "height": 800 },
    "as": "mainFrame",
    "d": 2000
  },
  {
    "name": "set_fill_color",
    "arguments": { "nodeId": "$LAST", "r": 0.1, "g": 0.1, "b": 0.2, "a": 1 },
    "d": 800
  }
]
```

## 字段说明

| 字段 | 必填 | 说明 |
|------|------|------|
| `name` | ✅ | MCP 工具名称 |
| `arguments` | ✅ | 工具参数（与 MCP inputSchema 对应） |
| `as` | ❌ | 为创建的节点命名，后续可通过 `$name` 引用其 nodeId |
| `d` | ❌ | 执行后延迟(ms)，默认 800。创建操作建议 1200-2000，属性修改建议 700-800 |

## 节点引用

- `$LAST`：引用**上一个**创建操作返回的 nodeId
- `$<name>`：引用 `"as": "<name>"` 命名的节点 nodeId

引用只能用于值为字符串的参数字段，典型用于 `nodeId` 参数。

## 延迟建议

| 操作类型 | 建议延迟 (ms) |
|----------|---------------|
| `create_frame` | 2000-2500 |
| `create_rectangle` | 1200-1500 |
| `create_text` | 1000-1500 |
| `set_fill_color` | 700-800 |
| `set_corner_radius` | 700-800 |
| `delete_node` | 800-1000 |
| `join_channel` | 2000 |

过短的延迟可能导致 WebSocket 消息拥塞，操作被丢弃或乱序。

## 颜色格式

所有颜色参数使用 0~1 的浮点数 RGBA：

```json
{ "r": 0.4, "g": 0.2, "b": 0.85, "a": 1 }
```

常用颜色速查：

| 颜色 | R | G | B |
|------|---|---|---|
| 纯白 | 1 | 1 | 1 |
| 纯黑 | 0 | 0 | 0 |
| 深灰文字 | 0.1 | 0.1 | 0.15 |
| 中灰文字 | 0.45 | 0.45 | 0.5 |
| 浅灰文字 | 0.65 | 0.65 | 0.72 |
| 紫色主色 | 0.4 | 0.2 | 0.85 |
| 浅紫背景 | 0.95 | 0.92 | 1 |
| 深色背景 | 0.13 | 0.13 | 0.2 |

# TalkToFigma MCP 工具参考

## 创建类工具（返回 nodeId）

### create_frame
创建矩形容器框架。
```
必填: name, x, y, width, height
可选: fillColor:{r,g,b,a}
```
- `fillColor` 可以在创建时直接设置背景色，避免后续 `set_fill_color` 的 nodeId 依赖

### create_rectangle
创建矩形。
```
必填: x, y, width, height
可选: name
```
- ⚠️ 不支持创建时设颜色和圆角，必须用 `set_fill_color` + `set_corner_radius` 后设

### create_text
创建文本节点。
```
必填: text, x, y
可选: fontSize, fontWeight, fontColor:{r,g,b}
```
- `fontColor` 可以在创建时直接设置文字颜色

### create_ellipse
❌ **不存在此工具**。如需圆形，用 `create_rectangle` + `set_corner_radius`(radius=宽度/2) 模拟。

## 修改类工具（需要 nodeId）

### set_fill_color
设置节点填充色。
```
必填: nodeId, r, g, b, a
```

### set_corner_radius
设置圆角。
```
必填: nodeId, radius
```

### delete_node
删除节点。
```
必填: nodeId
```

## 查询类工具

### get_document_info
获取当前文档信息和根节点结构。
```
无参数
```

### get_node_info
获取指定节点详情。
```
必填: nodeId
```

## 连接类工具

### join_channel
加入 WebSocket 频道。
```
必填: channel
```

## NodeId 返回格式

创建类工具返回的 `content[0].text` 格式：
```
Created rectangle "{"id":"6:112","name":"Btn","type":"RECTANGLE","x":100,"y":100,"width":140,"height":44}"
```

注意：引号内是一个**嵌套的 JSON 字符串**，需要二次解析：
1. 先用正则 `/"(\{[^"]*"id"[^"]*\})"/ ` 提取嵌套 JSON 字符串
2. 再 `JSON.parse()` 解析得到 `id` 字段
