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
# 1. 同步远端 master
git fetch origin master

# 2. 基于远端 master 创建分支（--no-track 防止自动追踪 origin/master）
git checkout -b <branch-name> --no-track origin/master
```

> ⚠️ **必须使用 `--no-track`**：不加此参数时，Git 会自动将 `origin/master`
> 设为新分支的 upstream，导致后续 `git push` 出现歧义。
> upstream 应在首次推送时通过 `git push -u` 设置为远程同名分支。
>
> **此步骤无需用户确认，直接执行即可**（包括 fetch 和 checkout）。

完成后告知用户：
> 分支 `<branch-name>` 已基于最新 `origin/master` 创建

---

### Step 3（可选）：推送到远端

**当用户明确要求"提交并推送"、"push"等时，直接推送，无需询问确认。**

```bash
# 有变更时先提交，再推送
git add <files>
git commit -m "<message>"
git push --force-with-lease -u origin <branch-name>
```

> 使用 `--force-with-lease` 而非 `--force`，避免意外覆盖他人推送的代码。

仅在用户未明确提及推送、且上下文中无推送意图时，才询问是否立即推送。

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

### 核心原则

**feature 分支的 upstream 必须指向远程同名分支，而非 master。**

> ⚠️ **禁止 amend + push 合并为链式命令执行！**
>
> `git commit --amend` 会修改本地 Git 历史（不可逆），如果与 `&& git push` 合并：
> 1. shell 先执行完 amend（历史已修改）
> 2. 再执行 push（用户此时才能审批）
> 3. 用户拒绝 push → amend 已生效无法回滚
>
> **必须拆分为两条独立调用：**
> ```bash
> # 步骤1：amend（本地操作）
> git add <files> && git commit --amend -m "msg"
> # 步骤2：push（单独审批，requires_approval: true）
> git push --force-with-lease
> ```
>
> **普通 commit + push 可以合并**（commit 不修改历史，拒绝后无副作用）。
> 但 **amend + push 必须拆分**。

### 推送流程

```bash
# 检查是否已有 upstream
UPSTREAM=$(git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null)
```

**情况 A：无 upstream** — 首次推送，设置追踪

```bash
git push -u origin <current-branch>
```

**情况 B：upstream 指向同名远程分支**（如 `origin/feature/xxx`）— 直接推送

```bash
git push
```

**情况 C：upstream 指向了错误分支**（如 `origin/master`）— 需要修正

这种情况常见于创建分支时未加 `--no-track`，Git 自动将 `origin/master` 设为 upstream。
此时用 `-u` 重新设置正确的 upstream：

```bash
git push -u origin <current-branch>
```

### 推送被拒绝（远端有更新）

```bash
git pull --rebase origin <branch-name>
git push
```

---

## 使用 worktree 新建分支

```bash
git fetch origin master
GIT_LFS_SKIP_SMUDGE=1 git worktree add ../cocraft-<suffix> -b <branch-name> --no-track origin/master
```

worktree 场景同样询问分支名（走 Step 1 流程），suffix 默认取分支名去掉前缀部分（如 `feature/user-login` → suffix 为 `user-login`）。

---

## Rebase 规范

### 标准流程（完整 5 步，缺一不可）

#### Step 1：确认当前所在分支

```bash
git branch --show-current
git status
```

> ⚠️ **必须确认当前分支是目标分支**，避免在错误分支上执行 rebase。
> 如有未提交的变更，先提交或 stash（见下方"有未暂存变更"章节）。

#### Step 2：同步远端当前分支最新代码

```bash
# 拉取远端同名分支的最新代码，基于最新本地状态再 rebase master
CURRENT_BRANCH=$(git branch --show-current)
git fetch origin $CURRENT_BRANCH
git rebase origin/$CURRENT_BRANCH
```

> **为什么要先同步当前分支？**
> 如果远端分支有其他人的提交（或自己在其他设备的提交），
> 直接 rebase master 会导致这些提交丢失或产生重复提交。
> 必须先把本地分支与远端同名分支对齐，再同步 master。

#### Step 3：同步远端 master 最新代码

```bash
git fetch origin master
```

#### Step 4：Rebase 前快照（防止文件静默丢失）

```bash
MERGE_BASE=$(git merge-base HEAD origin/master)
git diff --name-status $MERGE_BASE HEAD > /tmp/rebase_before_files.txt
echo "Rebase 前变更文件数: $(wc -l < /tmp/rebase_before_files.txt)"
cat /tmp/rebase_before_files.txt
```

#### Step 5：执行 Rebase

```bash
git rebase origin/master
```

---

### ⚠️ Rebase 后必做：完整性验证

**rebase 完成后，立即执行验证，确保没有文件被静默丢失：**

```bash
# 1. 重新计算 merge-base（已更新）
NEW_MERGE_BASE=$(git merge-base HEAD origin/master)
git diff --name-status $NEW_MERGE_BASE HEAD > /tmp/rebase_after_files.txt

# 2. 对比前后文件列表
echo "=== Rebase 前变更文件 ==="
cat /tmp/rebase_before_files.txt

echo "=== Rebase 后变更文件 ==="
cat /tmp/rebase_after_files.txt

# 3. 找出丢失的文件（rebase 前有，rebase 后没有）
echo "=== 疑似丢失的文件 ==="
diff /tmp/rebase_before_files.txt /tmp/rebase_after_files.txt | grep "^<"
```

> 🚨 **如果发现有文件丢失**，立即停止，参考"Rebase 冲突文件丢失恢复"章节处理。

### Rebase 冲突处理规范

发生冲突时，**禁止在冲突解决后立即 `git rebase --continue`**，必须先核查：

```bash
# 查看冲突文件列表
git status | grep "both modified\|deleted by"

# 解决冲突后，核查 staged 文件是否完整（对比预期清单）
git diff --cached --name-only

# 确认无遗漏后再继续
git rebase --continue
```

**最常见的静默丢失场景：**
- 冲突解决时只 `git add` 了部分文件
- 使用 IDE 的 "Accept Theirs/Ours" 按钮时，某些文件被意外 reset
- 合并工具只展示了文本冲突文件，忽略了二进制或其他类型文件的变更

### 有未暂存变更时先 stash

```bash
git stash
# 再按标准流程 Step 1～5 执行
git rebase origin/master
git stash pop
```

---

## 禁止行为

- 禁止基于本地旧分支直接 `checkout -b`（本地 master 可能落后远端）
- 禁止跳过 `git fetch` 步骤
- 禁止对 main/master 执行 force push
- 禁止 `checkout -b <branch> origin/master` 不加 `--no-track`（会导致 upstream 错误指向 master）
- **禁止在 rebase 后不做文件完整性验证直接推送**（可能静默丢失文件修改）
- **禁止冲突解决时使用 `git add .` 替代逐文件确认**（会掩盖遗漏文件的问题）
