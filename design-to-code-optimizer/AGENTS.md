# Design-to-Code Optimizer — Multi-Agent Workflow

本文档定义了从设计稿到代码的完整多 Agent 协作流程。每个 Agent 有明确的角色、触发条件、使用的 skills 和输出。

## 工作流总览

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Agent 1        │     │  Agent 2        │     │  Agent 3        │     │  Agent 4        │
│  Design         │────▶│  Design         │────▶│  Code           │────▶│  Quality        │
│  Generator      │     │  Reviewer       │     │  Generator      │     │  Checker        │
└─────────────────┘     └─────────────────┘     └─────────────────┘     └─────────────────┘
   ardot-design-           critique               fetch_guidelines       eslint-commit-check
   assistant               polish                  batch_read             adapt
                           adapt                   frontend-design        audit
                           audit                   tailwind-design-       optimize
                           web-design-guidelines   system
```

---

## Agent 1: Design Generator

**角色**: 根据用户需求生成设计稿

**触发条件**:
- 用户请求创建/生成/设计页面、组件、布局
- 关键词: design, create page, 生成页面, 设计界面, 创建组件

**使用的 Skill**:
- `ardot-design-assistant` — 核心设计生成 skill

**使用的 Ardot MCP 工具**:
- `fetch_editor_state` → 获取画布状态
- `fetch_guidelines` → 获取设计规范
- `fetch_style_guide_tags` + `fetch_style_guide` → 获取风格指南
- `batch_edit` → 执行设计操作
- `capture_screenshot` → 验证结果

**输出**:
- 完成的 .ardot 设计稿
- 设计节点 ID 列表
- 截图验证通过

**完成后动作**:
→ 自动触发 Agent 2（设计审查），或向用户提供选项

---

## Agent 2: Design Reviewer

**角色**: 审查设计质量，提出优化建议并应用

**触发条件**:
- Agent 1 完成设计后自动触发
- 用户请求 "审查设计"、"检查设计质量"、"design review"
- 关键词: critique, review, 审查, 检查, polish

**使用的 Skills（按执行顺序）**:

### Step 1: 审查评估
| 优先级 | Skill | 用途 | 输入 |
|--------|-------|------|------|
| 必须 | `critique` | 设计质量评分（视觉层次、信息架构、认知负载） | 设计截图 |
| 必须 | `web-design-guidelines` | Web 设计规范合规检查 | 设计截图 |
| 推荐 | `audit` | 技术审查（无障碍、性能、主题、响应式） | 设计截图 |

### Step 2: 优化修复（根据审查结果选择性执行）
| 问题类型 | Skill | 操作 |
|----------|-------|------|
| 排版布局混乱 | `arrange` | 改进布局间距和视觉节奏 |
| 字体层级不清 | `typeset` | 优化字体选择和排版 |
| 色彩单调 | `colorize` | 添加策略性色彩 |
| 细节粗糙 | `polish` | 最终打磨对齐、间距、一致性 |
| 风格平淡 | `bolder` | 增强视觉冲击力 |
| 响应式差 | `adapt` | 多设备适配 |
| 过度设计 | `distill` | 简化去除复杂性 |
| 缺少愉悦感 | `delight` | 添加微交互和趣味性 |

### Step 3: 应用修复
- 将 skill 输出的优化建议翻译为 Ardot MCP `batch_edit` 操作
- 执行 `capture_screenshot` + `capture_layout` 验证

**输出**:
- 设计审查报告（评分 + 问题列表）
- 已应用的优化列表
- 优化后截图

**决策矩阵**:
| 审查评分 | 下一步 |
|----------|--------|
| ≥ 8/10，无 P0/P1 问题 | → Agent 3（代码生成） |
| 6-7/10，有 P1 问题 | → 执行 Step 2 修复，再次审查 |
| ≤ 5/10，有 P0 问题 | → 报告给用户，建议重新设计 |

---

## Agent 3: Code Generator

**角色**: 从设计稿生成高质量前端代码

**触发条件**:
- Agent 2 审查通过后自动触发
- 用户请求 "生成代码"、"导出代码"、"design to code"
- 关键词: generate code, export, 导出, 生成代码, D2C, tailwind

**使用的 Ardot MCP 工具**:
- `fetch_guidelines("code")` → 代码生成规范
- `fetch_guidelines("tailwind")` → Tailwind 实现指南
- `fetch_variables` → 设计变量（颜色、间距、字号）
- `batch_read(nodeId, readDepth: -1)` → 完整节点结构

**使用的 Skills**:
| 阶段 | Skill | 用途 |
|------|-------|------|
| 生成时 | `frontend-design` | 前端设计最佳实践 |
| 生成时 | `tailwind-design-system` | Tailwind 设计系统规范 |
| 组件化 | `shadcn` | shadcn/ui 组件适配 |
| 组件化 | `vercel-composition-patterns` | React 组合模式 |
| 审查时 | `ui-ux-pro-max` | 全面 UI/UX 实现审查 |
| 性能 | `react-best-practices` | React 性能最佳实践 |

**代码生成流程**:
1. 获取设计规范和变量
2. 读取完整节点树
3. 生成语义化 HTML + Tailwind CSS
4. 映射设计变量为 CSS custom properties
5. 使用 `frontend-design` 审查代码质量

**输出**:
- HTML/TSX 代码文件
- Tailwind 配置
- CSS 变量定义
- 组件结构

---

## Agent 4: Quality Checker

**角色**: 验证生成代码的质量

**触发条件**:
- Agent 3 完成代码生成后自动触发
- 用户请求 "检查代码质量"、"lint 检查"
- 关键词: quality check, lint, eslint, 代码质量

**使用的 Skills**:
| 检查维度 | Skill | 用途 |
|----------|-------|------|
| 代码规范 | `eslint-commit-check` | ESLint 静态检查 |
| 响应式 | `adapt` | 多设备适配验证 |
| 无障碍 | `audit` | a11y 检查 |
| 性能 | `optimize` | 性能诊断和优化 |
| 强化 | `harden` | 错误处理、边界情况、i18n |

**检查流程**:
1. 运行 ESLint 检查
2. 验证响应式设计（375px / 768px / 1440px）
3. 无障碍检查（对比度、键盘、语义化）
4. 性能检查（bundle 大小、渲染效率）
5. 如有问题，自动修复或报告

**输出**:
- 质量检查报告
- 已自动修复的问题列表
- 需要手动修复的问题列表

---

## 执行策略

### 全流程执行（推荐）

当用户说 "设计转代码" 或 "design to code"：

```
Agent 1 (Design) → Agent 2 (Review) → Agent 3 (Code) → Agent 4 (QA)
```

### 部分执行

| 用户意图 | 执行 |
|----------|------|
| "审查设计" | Agent 2 only |
| "导出代码" | Agent 3 → Agent 4 |
| "优化代码质量" | Agent 4 only |
| "设计并生成代码" | Agent 1 → Agent 3 → Agent 4 |
| "完整流程" | Agent 1 → Agent 2 → Agent 3 → Agent 4 |

### 并行执行（团队模式）

对于大型项目，Agent 2 和 Agent 3 可以部分并行：

```
Agent 1 ──┬──▶ Agent 2 (Review section A) ──┐
           │                                  ├──▶ Agent 4
           └──▶ Agent 3 (Code section B)  ──┘
```

---

## Agent 间通信协议

### 完成信号

每个 Agent 完成后发送的消息格式：

```
Agent 1 → Agent 2:
{
  "status": "design_complete",
  "nodeIds": ["abc123", "def456"],
  "fileId": "file_001",
  "screenshot": true
}

Agent 2 → Agent 3:
{
  "status": "review_passed",
  "score": 8.5,
  "optimizations_applied": ["spacing", "typography"],
  "nodeIds": ["abc123", "def456"]
}

Agent 3 → Agent 4:
{
  "status": "code_generated",
  "files": ["src/components/hero.tsx", "src/styles/tokens.css"],
  "framework": "tailwind"
}
```

### 回退信号

```
Agent 2 → Agent 1:
{
  "status": "review_failed",
  "score": 4,
  "critical_issues": ["layout broken", "text invisible"],
  "suggestion": "redesign hero section"
}
```

---

## 完成后自动询问

当任意 Agent 完成其阶段后，必须使用 `AskUserQuestion` 询问下一步：

**Agent 1 完成后**:
```
"设计生成完成！下一步操作："
1. 设计审查 (critique + audit) → 评估设计质量
2. 直接生成代码 → 跳过审查，直接 D2C
3. 完整流程 → 审查 + 优化 + 代码生成 + 质量检查
4. 完成 → 不需要进一步操作
```

**Agent 2 完成后**:
```
"设计审查完成！评分: X/10。下一步操作："
1. 应用优化建议 → 修复发现的问题
2. 生成代码 → 基于当前设计生成代码
3. 查看详细报告 → 展示完整审查结果
```

**Agent 3 完成后**:
```
"代码生成完成！下一步操作："
1. 代码质量检查 → ESLint + 响应式 + 无障碍
2. 查看生成的代码 → 展示代码文件
3. 完成 → 不需要进一步操作
```
