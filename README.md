# CodeBuddy Skills Collection

我的 [CodeBuddy](https://www.codebuddy.ai) Agent Skills 合集，涵盖设计生成、前端最佳实践、Git 工作流、CI/CD 部署等多个领域。

## 📦 Skills 列表

| Skill | 说明 | 触发词示例 |
|-------|------|-----------|
| **[design-mcp](./design-mcp/)** | 通过 TalkToFigma MCP 在 Figma 中生成设计稿 | `Figma 生成设计`、`Figma MCP`、`design generation` |
| **[find-skills](./find-skills/)** | 发现和安装开源 Agent Skills | `find a skill for X`、`is there a skill that can...` |
| **[frontend-best-practices](./frontend-best-practices/)** | 前端编码最佳实践（事件监听、生命周期管理等） | `addEventListener`、`事件监听`、`内存泄漏`、`useEffect cleanup` |
| **[git-branch](./git-branch/)** | Git 分支管理规范工作流 | `新建分支`、`推送分支`、`rebase master` |
| **[oci-deploy](./oci-deploy/)** | Orange CI 静态站点 COS+CDN 部署方案 | `OCI 部署`、`工蜂 CI`、`COS 部署` |
| **[pagx](./pagx/)** | PAGX 文件生成与优化 | `create PAGX`、`optimize .pagx`、`pagx CLI` |

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
├── oci-deploy/           # OCI 部署方案
│   └── SKILL.md
└── pagx/                 # PAGX 生成与优化
    ├── SKILL.md
    └── references/
```

## 📝 Skill 规范

每个 skill 目录包含：

- **`SKILL.md`**（必需）：Skill 定义文件，包含 frontmatter 元数据和详细指令
- **`references/`**（可选）：参考文档，供 AI 在需要时查阅
- **`scripts/`**（可选）：辅助脚本，可被 AI 调用执行
- **`assets/`**（可选）：静态资源文件

## License

MIT
