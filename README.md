# CodeBuddy Skills Collection

我的 [CodeBuddy](https://www.codebuddy.ai) Agent Skills 合集，涵盖设计生成、前端最佳实践、Git 工作流、CI/CD 部署等多个领域。

## 📦 Skills 列表

| Skill | 说明 | 触发词示例 |
|-------|------|-----------|
| **[commit](./commit/)** | 仅在本地创建 commit，不推送 | `commit`、`本地提交`、`只提交不推送` |
| **[commit-push-staged](./commit-push-staged/)** | 仅提交并推送已暂存的文件 | `提交暂存的`、`push staged files`、`只提交 staged` |
| **[commit-split](./commit-split/)** | 按领域拆分多个 commit 后统一推送 | `拆 commit`、`分领域提交`、`提交多个 commit` |
| **[design-mcp](./design-mcp/)** | 通过 TalkToFigma MCP 在 Figma 中生成设计稿 | `Figma 生成设计`、`Figma MCP`、`design generation` |
| **[find-skills](./find-skills/)** | 发现和安装开源 Agent Skills | `find a skill for X`、`is there a skill that can...` |
| **[frontend-best-practices](./frontend-best-practices/)** | 前端编码最佳实践（事件监听、生命周期管理等） | `addEventListener`、`事件监听`、`内存泄漏`、`useEffect cleanup` |
| **[git-branch](./git-branch/)** | Git 分支管理规范工作流 | `新建分支`、`推送分支`、`rebase master` |
| **[pagx](./pagx/)** | PAGX 文件生成与优化 | `create PAGX`、`optimize .pagx`、`pagx CLI` |
| **[preflight-mcp](./preflight-mcp/)** | 执行 MCP 任务前的轻量健康检查 | `MCP`、`设计落码`、`导出资源`、`preflight` |
| **[ship](./ship/)** | 从建分支到推送与输出 MR/PR 的完整交付流程 | `ship`、`提交并推送`、`给我 MR 链接` |

## 🚀 安装使用

### 方式一：手动复制

将任意 skill 目录复制到你的 CodeBuddy skills 目录：

```bash
# 复制单个 skill
cp -r design-mcp ~/.codebuddy/skills/

# 复制全部 skills
cp -r */ ~/.codebuddy/skills/
```

### 方式二：通过 find-skills 安装

在 CodeBuddy 对话中使用 `find-skills` skill 来发现和安装 skills。

## 📁 目录结构

```
codebuddy-skills/
├── commit/               # 本地 commit
│   └── SKILL.md
├── commit-push-staged/   # 仅提交并推送已暂存文件
│   └── SKILL.md
├── commit-split/         # 按领域拆分多个 commit
│   └── SKILL.md
├── design-mcp/           # Figma MCP 设计生成
│   ├── SKILL.md
│   ├── references/       # 参考文档
│   └── scripts/          # 辅助脚本
├── find-skills/          # Skill 发现与安装
│   └── SKILL.md
├── frontend-best-practices/  # 前端最佳实践
│   ├── SKILL.md
│   ├── assets/
│   ├── references/
│   └── scripts/
├── git-branch/           # Git 分支管理
│   └── SKILL.md
├── pagx/                 # PAGX 生成与优化
│   ├── SKILL.md
│   └── references/
├── preflight-mcp/        # MCP 起手健康检查
│   └── SKILL.md
└── ship/                 # 完整交付流水线
    └── SKILL.md
```

## 📝 Skill 规范

每个 skill 目录包含：

- **`SKILL.md`**（必需）：Skill 定义文件，包含 frontmatter 元数据和详细指令
- **`references/`**（可选）：参考文档，供 AI 在需要时查阅
- **`scripts/`**（可选）：辅助脚本，可被 AI 调用执行
- **`assets/`**（可选）：静态资源文件

## License

MIT
