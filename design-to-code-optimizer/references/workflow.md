# Design-to-Code 完整工作流参考

## Phase 1: 设计审查 — 详细步骤

### 1.1 获取设计状态

```
Ardot MCP 调用顺序：
1. fetch_editor_state → 获取当前画布、选中节点
2. capture_screenshot(nodeId) → 获取目标设计截图
3. capture_layout(nodeId) → 获取布局结构树
```

### 1.2 运行 critique skill

`critique` skill 会从以下维度评估设计：

- **视觉层次** (Visual Hierarchy) — 信息重要性是否通过大小、颜色、对比度正确传达
- **信息架构** (Information Architecture) — 内容组织是否合理
- **情感共鸣** (Emotional Resonance) — 设计是否传达正确的情感
- **认知负载** (Cognitive Load) — 用户是否容易理解和操作
- **整体质量** — 综合评分 (1-10)

**如何传递设计信息给 critique**：
- 提供 `capture_screenshot` 返回的截图
- 附加 `capture_layout` 返回的布局结构作为上下文
- 说明设计目标和受众

### 1.3 运行 audit skill

`audit` 执行技术质量检查，生成带评分的报告：

- **无障碍** (Accessibility) — 对比度、键盘导航、屏幕阅读器
- **性能** (Performance) — 渲染复杂度、图片优化
- **主题** (Theming) — 设计变量使用、暗色模式兼容
- **响应式** (Responsive) — 断点适配、触摸目标
- **反模式** (Anti-patterns) — 常见 UI 错误

输出包含 P0-P3 严重等级和可执行的修复计划。

### 1.4 决策矩阵

| critique 评分 | audit 结果 | 下一步 |
|---------------|-----------|--------|
| ≥ 8/10 且无 P0 | 全部通过 | 直接进入 Phase 3 代码生成 |
| 7/10 或有 P1 | 少量警告 | Phase 2 轻度优化 |
| ≤ 6/10 或有 P0 | 存在错误 | Phase 2 深度优化 |

---

## Phase 2: 设计优化 — 详细步骤

### 2.1 Skill 选择策略

根据 Phase 1 的审查反馈，按优先级选择 skills：

**优先级 1 — 结构性问题**（必须先修复）：
- `arrange` — 布局混乱、间距不一致、对齐问题
- `adapt` — 不支持响应式、触摸目标过小

**优先级 2 — 视觉质量**：
- `typeset` — 字体层级不清、可读性差
- `colorize` — 色彩单调、缺乏视觉引导
- `polish` — 细节粗糙、不一致

**优先级 3 — 增强体验**（可选）：
- `bolder` — 设计过于保守、缺乏个性
- `delight` — 缺少微交互、愉悦感
- `distill` — 设计过于复杂、信息过载

### 2.2 将优化建议转化为 Ardot 操作

skills 的输出是优化建议文本。需要将其转化为 Ardot MCP 操作：

**间距优化示例**：
```
critique 建议: "卡片之间的间距不一致，建议统一为 24px"

→ Ardot 操作:
batch_edit operations:
U("cardContainer", {gap: 24, padding: 24})
```

**排版优化示例**：
```
typeset 建议: "标题和正文的字号对比不够，建议标题 32px → 40px"

→ Ardot 操作:
batch_edit operations:
U("headingText", {fontSize: 40, fontWeight: "700"})
```

**色彩优化示例**：
```
colorize 建议: "CTA 按钮需要更高对比度的颜色"

→ Ardot 操作:
batch_edit operations:
U("ctaButton", {fill: "#6C5CE7"})
U("ctaButton;labelText", {fill: "#FFFFFF"})
```

### 2.3 验证循环

每次 batch_edit 后：
1. `capture_screenshot` — 视觉验证
2. `capture_layout` — 结构验证
3. 如有问题，继续修复
4. 确认无误后进入 Phase 3

---

## Phase 3: 代码生成 — 详细步骤

### 3.1 准备工作

```
Ardot MCP 调用：
1. fetch_guidelines("code") → 获取代码生成通用规范
2. fetch_guidelines("tailwind") → 获取 Tailwind 实现指南
3. fetch_variables → 获取设计变量（颜色、间距、字号等）
4. batch_read(nodeId, readDepth: -1) → 读取完整节点树
```

### 3.2 设计变量映射

将 Ardot 设计变量转换为 CSS custom properties 或 Tailwind 配置：

**CSS Custom Properties**：
```css
:root {
  /* 从 fetch_variables 获取 */
  --color-primary: #6C5CE7;
  --color-background: #1A1A2E;
  --spacing-sm: 8px;
  --spacing-md: 16px;
  --spacing-lg: 24px;
  --font-size-heading: 40px;
  --font-size-body: 16px;
}
```

**Tailwind 配置**：
```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        background: 'var(--color-background)',
      },
      spacing: {
        sm: 'var(--spacing-sm)',
        md: 'var(--spacing-md)',
        lg: 'var(--spacing-lg)',
      },
    },
  },
};
```

### 3.3 代码生成策略

**方式 A：手写高质量代码**（推荐用于复杂设计）

1. 分析 `batch_read` 返回的节点树
2. 按照 `fetch_guidelines("code")` 的规范编写
3. 使用语义化 HTML 标签
4. 应用 Tailwind 类（参考 guidelines）
5. 使用 `frontend-design` skill 审查代码

**方式 B：自动导出 + 优化**（适用于快速原型）

1. 使用 DesignToCodeService 导出：
   ```typescript
   exportNodeToHtml(nodeId, {
     toTailwind: true,
     exportVariables: true,
     separatedCss: true
   })
   ```
2. 审查导出代码，手动优化
3. 使用 `tailwind-design-system` skill 检查 Tailwind 规范

### 3.4 代码优化 Skills 使用时机

| Skill | 使用时机 | 输入 |
|-------|----------|------|
| `frontend-design` | 生成代码后审查前端设计质量 | 生成的代码文件 |
| `tailwind-design-system` | 验证 Tailwind 类使用规范 | Tailwind 代码 |
| `shadcn` | 需要使用 shadcn/ui 组件时 | 组件需求描述 |
| `ui-ux-pro-max` | 全面审查 UI 实现质量 | 完整页面代码 |
| `vercel-composition-patterns` | React 组件结构优化 | React 组件代码 |
| `react-best-practices` | React 性能最佳实践 | React 代码 |

---

## Phase 4: 代码质量检查 — 详细步骤

### 4.1 静态检查

```bash
# ESLint 检查（使用 eslint-commit-check skill）
npx eslint --no-warn-ignored <generated-files>

# TypeScript 类型检查
npx tsc --noEmit <generated-files>
```

### 4.2 响应式验证

使用 `adapt` skill 检查：
- 移动端 (375px) 布局是否正常
- 平板 (768px) 布局适配
- 桌面端 (1440px) 是否充分利用空间
- 触摸目标是否 ≥ 44px

### 4.3 无障碍检查

使用 `audit` skill 检查：
- 颜色对比度 ≥ 4.5:1（正文）/ ≥ 3:1（大文本）
- 所有图片有 alt 属性
- 表单元素有 label 关联
- 键盘可访问
- 语义化 HTML

### 4.4 性能检查

使用 `optimize` skill 检查：
- 图片是否使用合适格式和大小
- CSS 是否有冗余
- 组件是否过度渲染
- Bundle 大小是否合理

---

## 团队模式（复杂项目）

对于大型项目，可以使用 Agent Team 并行处理：

```
Main Agent (Lead)
├── Agent A: 设计审查 (critique + audit)
├── Agent B: 代码生成 (Section 1)
├── Agent C: 代码生成 (Section 2)
└── Agent D: 代码质量检查
```

### 分工策略

| Agent 角色 | 负责阶段 | 使用的 Skills |
|-----------|----------|--------------|
| Design Reviewer | Phase 1 | critique, audit, web-design-guidelines |
| Design Optimizer | Phase 2 | polish, arrange, typeset, adapt |
| Code Generator | Phase 3 | frontend-design, tailwind-design-system |
| QA Engineer | Phase 4 | eslint-commit-check, optimize, audit |

---

## 常见问题

### Q: 哪些 skills 需要截图输入？
A: `critique`, `audit`, `web-design-guidelines` 需要视觉输入。先用 Ardot MCP `capture_screenshot` 获取。

### Q: 优化建议如何应用到设计稿？
A: 将 skill 输出的优化建议翻译为 Ardot MCP `batch_edit` 操作。参考 Phase 2.2 的示例。

### Q: 代码生成用方式 A 还是方式 B？
A: 正式项目用方式 A（手写），质量更高。快速原型或验证用方式 B（自动导出）。

### Q: 如何确保设计和代码的一致性？
A: 通过 `fetch_variables` 获取设计变量，映射为 CSS custom properties 或 Tailwind 配置，确保代码使用同一套变量系统。
