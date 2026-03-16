---
name: git-branch
description: Git 分支管理规范工作流。当用户需要新建分支、推送分支到远端、或进行分支 rebase 时使用。触发关键词："新建分支"、"创建分支"、"checkout 分支"、"推送分支"、"push 分支"、"push to remote"、"create branch"、"new branch"、"worktree"、"rebase master"。确保新建分支始终基于最新的远端 master，推送时自动设置远端追踪分支。
---

# Git Branch 管理规范

## 新建分支工作流

### Step 1：确定分支名

**情况 A：用户已明确提供分支名**（如 "新建分支 feature/login"）
- 直接使用该名称，跳至 Step 2

**情况 B：用户提供了描述但未给出分支名**（如 "新建一个修复登录 bug 的分支"）
- 根据描述自动生成候选分支名，规则见下方"分支命名规范"
- 用 AskUserQuestion 工具呈现候选名，**同时提供手动输入选项**：

```
问题：请选择或输入分支名
选项：
  - <自动生成的候选名 1>（推荐）
  - <自动生成的候选名 2>
  - 手动输入（Other）
```

**情况 C：用户未提供任何信息**（如 "新建分支"）
- 用 AskUserQuestion 工具询问分支用途/描述，再生成候选名后走情况 B

---

### Step 2：同步远端并创建分支

```bash
# 1. 同步远端 master（禁止跳过此步骤）
git fetch origin master

# 2. 基于远端 master 创建分支（无需切换到本地 master）
git checkout -b <branch-name> origin/master
```

完成后告知用户：
> 分支 `<branch-name>` 已基于最新 `origin/master` 创建

---

### Step 3（可选）：询问是否立即推送到远端

```
问题：是否立即推送到远端？
选项：
  - 是，立即推送（git push -u origin <branch-name>）
  - 否，稍后手动推送
```

若用户选择立即推送，执行：

```bash
git push -u origin <branch-name>
```

---

## 分支命名规范

根据描述生成分支名时遵循以下规则：

| 类型 | 前缀 | 示例 |
|------|------|------|
| 新功能 | `feature/` | `feature/user-login` |
| Bug 修复 | `fix/` | `fix/login-crash` |
| 性能优化 | `perf/` | `perf/render-optimization` |
| 重构 | `refactor/` | `refactor/auth-module` |
| 文档 | `docs/` | `docs/api-guide` |
| 测试 | `test/` | `test/unit-auth` |

命名约束：
- 全小写，单词间用 `-` 分隔（kebab-case）
- 不超过 50 个字符
- 不含空格、中文、特殊符号（`.` `@` `#` 等除外）
- 中文描述转为对应英文关键词

示例转换：
- "修复登录页面崩溃" → `fix/login-page-crash`
- "添加用户头像上传功能" → `feature/user-avatar-upload`
- "优化首页渲染性能" → `perf/home-render-performance`

---

## 推送分支到远端

```bash
# 检查是否已有 upstream
git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null

# 无 upstream：首次推送，自动创建远端分支并设置追踪
git push -u origin <current-branch>

# 有 upstream：直接推送
git push
```

若推送被拒绝（远端有更新）：

```bash
git pull --rebase origin <branch-name>
git push
```

---

## 使用 worktree 新建分支

```bash
git fetch origin master
GIT_LFS_SKIP_SMUDGE=1 git worktree add ../cocraft-<suffix> -b <branch-name> origin/master
```

worktree 场景同样询问分支名（走 Step 1 流程），suffix 默认取分支名去掉前缀部分（如 `feature/user-login` → suffix 为 `user-login`）。

---

## Rebase 规范

本地分支落后远端 master 时：

```bash
git fetch origin master
git rebase origin/master
```

有未暂存变更时先 stash：

```bash
git stash
git rebase origin/master
git stash pop
```

---

## 禁止行为

- 禁止基于本地旧分支直接 `checkout -b`（本地 master 可能落后远端）
- 禁止跳过 `git fetch` 步骤
- 禁止对 main/master 执行 force push
