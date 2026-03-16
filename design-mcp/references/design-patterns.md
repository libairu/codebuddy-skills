# 设计命令组织模式

## 核心原则

### 1. 分批执行，每批 30-45 条

单批命令过多会导致：
- WebSocket 消息积压
- 超时失败率增加
- 出错后难以定位问题

推荐按页面区域拆分：
```
step1-nav-hero.json     (~34 条)  ← 导航栏 + Hero 区域
step2-stats-portfolio.json (~44 条)  ← 统计栏 + 作品集
step3-about-footer.json   (~44 条)  ← 关于 + 页脚
```

### 2. 优先使用内联颜色参数

避免 nodeId 依赖链，减少命令数量：

```json
// ✅ 好：create_frame 内联 fillColor，1 条命令
{"name":"create_frame","arguments":{"name":"Nav","x":0,"y":0,"width":1440,"height":80,"fillColor":{"r":1,"g":1,"b":1,"a":1}}}

// ❌ 差：需要 3 条命令
{"name":"create_frame","arguments":{"name":"Nav","x":0,"y":0,"width":1440,"height":80}}
{"name":"set_fill_color","arguments":{"nodeId":"$LAST","r":1,"g":1,"b":1,"a":1}}
```

各工具内联能力：
| 工具 | 颜色 | 圆角 |
|------|------|------|
| `create_frame` | ✅ `fillColor` | ❌ |
| `create_text` | ✅ `fontColor` | - |
| `create_rectangle` | ❌ | ❌ |

`create_rectangle` 必须用 `$LAST` + `set_fill_color` / `set_corner_radius`。

### 3. 创建-修改紧挨

rectangle 的典型三连：

```json
{"name":"create_rectangle","arguments":{"name":"Btn","x":100,"y":100,"width":140,"height":44},"d":1500},
{"name":"set_corner_radius","arguments":{"nodeId":"$LAST","radius":22},"d":800},
{"name":"set_fill_color","arguments":{"nodeId":"$LAST","r":0.13,"g":0.13,"b":0.2,"a":1},"d":800}
```

### 4. 命名关键节点

后续需要引用的节点用 `"as"` 命名：

```json
{"name":"create_frame","arguments":{"name":"Nav","x":0,"y":0,"width":1440,"height":80},"as":"nav","d":2000}
// ... 后续可用 "$nav" 引用
```

### 5. 清理先行

在创建设计前，先清理画布上的旧节点：
1. 调用 `get_document_info` 获取所有子节点
2. 对每个子节点调用 `delete_node`
3. 确认画布干净后再开始创建

## 常见 UI 模式命令模板

### 导航栏 (Navigation Bar)

```json
[
  {"name":"create_frame","arguments":{"name":"Nav","x":0,"y":0,"width":1440,"height":80,"fillColor":{"r":1,"g":1,"b":1,"a":1}},"d":2000},
  {"name":"create_text","arguments":{"text":"LOGO","x":80,"y":24,"fontSize":24,"fontWeight":700,"fontColor":{"r":0.1,"g":0.1,"b":0.15}},"d":1500},
  {"name":"create_text","arguments":{"text":"Link1","x":800,"y":28,"fontSize":16,"fontWeight":500,"fontColor":{"r":0.35,"g":0.35,"b":0.4}},"d":1200},
  {"name":"create_rectangle","arguments":{"name":"CTABtn","x":1220,"y":18,"width":140,"height":44},"d":1500},
  {"name":"set_corner_radius","arguments":{"nodeId":"$LAST","radius":22},"d":800},
  {"name":"set_fill_color","arguments":{"nodeId":"$LAST","r":0.13,"g":0.13,"b":0.2,"a":1},"d":800},
  {"name":"create_text","arguments":{"text":"CTA","x":1270,"y":28,"fontSize":15,"fontWeight":600,"fontColor":{"r":1,"g":1,"b":1}},"d":1200}
]
```

### 圆角标签 (Pill Tag)

```json
[
  {"name":"create_rectangle","arguments":{"name":"Tag","x":100,"y":100,"width":120,"height":36},"d":1200},
  {"name":"set_corner_radius","arguments":{"nodeId":"$LAST","radius":18},"d":700},
  {"name":"set_fill_color","arguments":{"nodeId":"$LAST","r":0.95,"g":0.92,"b":1,"a":1},"d":700},
  {"name":"create_text","arguments":{"text":"Label","x":116,"y":108,"fontSize":13,"fontWeight":500,"fontColor":{"r":0.4,"g":0.2,"b":0.85}},"d":1000}
]
```

### 卡片 (Card with Image)

```json
[
  {"name":"create_frame","arguments":{"name":"Card","x":80,"y":200,"width":620,"height":460,"fillColor":{"r":1,"g":1,"b":1,"a":1}},"d":2000},
  {"name":"set_corner_radius","arguments":{"nodeId":"$LAST","radius":16},"d":800},
  {"name":"create_rectangle","arguments":{"name":"CardImage","x":100,"y":220,"width":580,"height":320},"d":1500},
  {"name":"set_corner_radius","arguments":{"nodeId":"$LAST","radius":12},"d":800},
  {"name":"set_fill_color","arguments":{"nodeId":"$LAST","r":0.95,"g":0.93,"b":1,"a":1},"d":800},
  {"name":"create_text","arguments":{"text":"Card Title","x":104,"y":565,"fontSize":22,"fontWeight":600,"fontColor":{"r":0.1,"g":0.1,"b":0.15}},"d":1200},
  {"name":"create_text","arguments":{"text":"Subtitle","x":104,"y":600,"fontSize":15,"fontWeight":400,"fontColor":{"r":0.5,"g":0.5,"b":0.55}},"d":1200}
]
```

### 统计栏 (Stats Bar)

```json
[
  {"name":"create_frame","arguments":{"name":"Stats","x":0,"y":800,"width":1440,"height":120,"fillColor":{"r":0.13,"g":0.13,"b":0.2,"a":1}},"d":2000},
  {"name":"create_text","arguments":{"text":"100+","x":160,"y":830,"fontSize":32,"fontWeight":700,"fontColor":{"r":1,"g":1,"b":1}},"d":1200},
  {"name":"create_text","arguments":{"text":"Description","x":160,"y":870,"fontSize":14,"fontWeight":400,"fontColor":{"r":0.65,"g":0.65,"b":0.72}},"d":1200}
]
```

## 布局规范

### 桌面端（1440px）

| 属性 | 值 |
|------|------|
| 画布宽度 | 1440px |
| 左右边距 | 80px |
| 内容区域 | 1280px |
| 两栏间距 | 40px |
| 两栏宽度 | 各 620px |
| 导航栏高度 | 80px |

### 排版层级

| 级别 | fontSize | fontWeight |
|------|----------|------------|
| 超大标题 | 72 | 700 |
| 大标题 | 48 | 700 |
| 中标题 | 44 | 700 |
| 小标题 | 22-24 | 600 |
| 正文 | 16-18 | 400 |
| 辅助文字 | 14 | 400-500 |
| 标签文字 | 13 | 500 |

## 注意事项

1. **节点是平铺的**：通过 MCP 创建的节点默认平铺在画布上，不会自动嵌套到父 frame 中。坐标是相对于画布原点的绝对坐标。
2. **不支持自动布局**：无法设置 Auto Layout，需要手动计算每个元素的绝对位置。
3. **文本不自动换行**：每行文字需要单独的 `create_text` 命令。
4. **无 move_node 到父级**：创建后无法移动节点到其他 frame 内部。
