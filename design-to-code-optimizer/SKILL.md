---
name: design-to-code-optimizer
description: >-
  设计稿到代码的完整优化流程。在 Ardot 设计生成完成后，自动协调 UI/UX 审查 skills 和代码生成工具，
  确保设计质量和代码质量。触发场景：design to code、设计转代码、设计审查、优化设计输出、
  生成响应式代码、代码质量优化、设计稿导出、export design、generate code from design、
  审查设计质量、design review and code、D2C、设计到代码优化。
  当用户完成 Ardot 设计稿生成后需要审查和导出代码时，应使用此 skill。
triggerKeywords:
  - design to code
  - 设计转代码
  - 设计到代码
  - D2C
  - 导出代码
  - export code
  - 设计审查
  - design review
  - 优化设计
  - optimize design
  - 生成代码
  - generate code
  - code from design
  - 设计稿导出
  - 代码质量
  - 响应式
  - responsive
allowed-tools:
disable: false
---

# Design-to-Code Optimizer

从 Ardot 设计稿到高质量前端代码的完整优化流程。整合 Ardot MCP 设计工具、UI/UX 审查 skills 和代码生成服务。

**参考文档**（按需加载）：
- `references/workflow.md` — 完整分阶段工作流、各 skill 调用时机和参数

## 核心理念

设计到代码不是一步完成的——优秀的流程分为四个阶段：

```
设计完成 → 设计审查 → 设计优化 → 代码生成 + 质量检查
```

每个阶段都有对应的 skill 和工具来保证质量。

## 快速流程

### Phase 1: 设计审查（Design Review）

使用以下 skills 评估设计稿质量：

| Skill | 用途 | 调用方式 |
|-------|------|----------|
| `critique` | 设计批判与评分，评估视觉层次、信息架构、认知负载 | `/critique` |
| `web-design-guidelines` | 检查 Web 界面设计规范合规性 | `/web-design-guidelines` |
| `audit` | 技术质量检查：无障碍、性能、主题、响应式 | `/audit` |

**操作步骤**：
1. 调用 Ardot MCP `capture_screenshot` 获取设计截图
2. 调用 Ardot MCP `capture_layout` 获取布局结构
3. 运行 `critique` skill 获得设计评分和改进建议
4. 如果评分低于 7/10，进入 Phase 2 优化

### Phase 2: 设计优化（Design Polish）

根据审查结果，选择性使用优化 skills：

| 问题类型 | Skill | 用途 |
|----------|-------|------|
| 整体粗糙 | `polish` | 最终打磨：对齐、间距、一致性 |
| 排版混乱 | `arrange` | 改进布局、间距、视觉节奏 |
| 字体问题 | `typeset` | 优化字体选择、层级、大小、可读性 |
| 缺少色彩 | `colorize` | 添加策略性色彩 |
| 风格平淡 | `bolder` | 增强视觉冲击力 |
| 响应式差 | `adapt` | 适配不同屏幕尺寸和设备 |
| 过于复杂 | `distill` | 简化，去除不必要的复杂性 |
| 缺少动效 | `delight` | 添加愉悦感和微交互 |

**操作步骤**：
1. 根据 critique 反馈确定需要优化的方面
2. 运行对应的优化 skill
3. 使用 Ardot MCP `batch_edit` 应用优化建议到设计稿
4. `capture_screenshot` 验证优化效果

### Phase 3: 代码生成（Code Generation）

从优化后的设计生成前端代码：

**方式 A — 通过 Ardot MCP guidelines**：
1. 调用 `fetch_guidelines("code")` 获取代码生成规范
2. 调用 `fetch_guidelines("tailwind")` 获取 Tailwind 实现指南
3. 调用 `fetch_variables` 获取设计变量/token
4. 调用 `batch_read` 读取目标节点的完整结构
5. 根据 guidelines 手写高质量代码

**方式 B — 通过 DesignToCodeService**：
1. 选中目标节点
2. 调用 `exportNodeToHtml` 或 `exportSelectionToHtml`
3. 可选参数：
   - `separatedCss: true` — CSS 单独输出
   - `toTailwind: true` — 转换为 Tailwind 类
   - `exportVariables: true` — 导出设计变量

**代码优化 skills**：

| Skill | 用途 |
|-------|------|
| `frontend-design` | 前端设计最佳实践审查 |
| `tailwind-design-system` | Tailwind 设计系统规范 |
| `shadcn` | shadcn/ui 组件适配 |
| `ui-ux-pro-max` | 全面的 UI/UX 实现审查 |

### Phase 4: 代码质量检查（Quality Assurance）

| 检查项 | 工具/Skill |
|--------|-----------|
| ESLint 规范 | `eslint-commit-check` skill |
| 响应式验证 | `adapt` skill |
| 无障碍检查 | `audit` skill |
| 性能优化 | `optimize` skill |

## 执行模式选择

| 用户意图 | 推荐流程 |
|----------|----------|
| "导出设计稿为代码" | Phase 3 → Phase 4 |
| "审查并优化设计" | Phase 1 → Phase 2 |
| "设计转高质量代码" | Phase 1 → Phase 2 → Phase 3 → Phase 4 |
| "检查代码质量" | Phase 4 |
| "优化设计排版" | Phase 2（仅 arrange + typeset） |

## 与 ardot-design-assistant 的协作

本 skill 是 `ardot-design-assistant` 的下游流程：

```
ardot-design-assistant        design-to-code-optimizer
(设计生成)            →        (审查 → 优化 → 代码)
```

- `ardot-design-assistant` 负责创建和修改设计稿
- `design-to-code-optimizer` 负责审查设计质量并生成高质量代码
- 当设计优化需要修改设计稿时，通过 Ardot MCP `batch_edit` 直接修改

## 相关 Skills 快速参考

当完成以下任务时，**必须**考虑调用对应的 skills：

### 设计审查阶段
| 场景 | Skill | 命令 | 何时使用 |
|------|-------|------|----------|
| 审查设计质量 | `critique` | `/critique` | 设计完成后第一步 |
| Web 规范检查 | `web-design-guidelines` | `/web-design-guidelines` | Web 项目必查 |
| 技术审查 | `audit` | `/audit` | 关注无障碍/性能时 |

### 设计优化阶段
| 场景 | Skill | 命令 | 何时使用 |
|------|-------|------|----------|
| 打磨界面细节 | `polish` | `/polish` | critique 评分 < 8 |
| 优化排版布局 | `arrange` | `/arrange` | 布局/间距问题 |
| 优化字体 | `typeset` | `/typeset` | 字体层级不清 |
| 添加色彩 | `colorize` | `/colorize` | 色彩单调 |
| 增强视觉风格 | `bolder` | `/bolder` | 风格平淡 |
| 响应式适配 | `adapt` | `/adapt` | 多设备项目必查 |
| 简化设计 | `distill` | `/distill` | 设计过于复杂 |
| 增加愉悦感 | `delight` | `/delight` | 需要微交互 |

### 代码生成阶段
| 场景 | Skill | 命令 | 何时使用 |
|------|-------|------|----------|
| 前端设计审查 | `frontend-design` | `/frontend-design` | 生成代码后审查 |
| Tailwind 规范 | `tailwind-design-system` | `/tailwind-design-system` | 使用 Tailwind 时 |
| shadcn 组件 | `shadcn` | `/shadcn` | 需要组件库时 |
| UI/UX 专业评审 | `ui-ux-pro-max` | `/ui-ux-pro-max` | 全面审查 |
| React 组合模式 | `vercel-composition-patterns` | 参考此 skill | React 项目 |
| React 性能 | `react-best-practices` | 参考此 skill | React 项目 |

### 代码质量阶段
| 场景 | Skill | 命令 | 何时使用 |
|------|-------|------|----------|
| ESLint 检查 | `eslint-commit-check` | `/eslint-commit-check` | 代码生成后必查 |
| 性能优化 | `optimize` | `/optimize` | 关注性能时 |
| 生产就绪 | `harden` | `/harden` | 准备发布时 |

## 注意事项

- 审查 skills（critique, audit 等）需要截图输入，先用 `capture_screenshot` 获取
- 优化建议需要转化为具体的 Ardot MCP 操作才能应用到设计稿
- 代码生成优先使用 Tailwind，确保调用 `fetch_guidelines("tailwind")`
- 设计变量优先通过 `fetch_variables` 获取，映射为 CSS custom properties
