---
name: commit-push-staged
description: 仅提交并推送已暂存（staged）的文件，未暂存改动保持原状不动。当用户说"提交并推送暂存文件"、"push staged files"、"提交暂存的"、"只提交 staged"、"commit and push staged" 等时使用此 skill。
---

# Commit & Push Staged Only

只提交暂存区（git index）中的文件，并推送到远端，**绝不**自动 `git add` 任何未暂存的改动。

## 使用场景

用户在工作区有多组改动，但只想发布其中部分（已经手工 `git add` 过的那些），其余改动暂留本地继续编辑。

---

## Step 1：核查暂存区

```bash
git status --porcelain
git diff --cached --stat
```

按 `git status --porcelain` 第一列（index 状态）判断：

- 第一列为 `M` / `A` / `D` / `R` / `C` → 已暂存
- 第一列为空格、第二列为 `M` / `D` / `?` → 未暂存（**本 skill 不处理**）

**判定规则：**

| 情况 | 处理 |
|------|------|
| 无任何暂存文件 | 告知用户"暂存区为空，没有可提交的内容"并停止。**不要**自动 `git add`。 |
| 有暂存文件，无未暂存改动 | 直接进入 Step 2 |
| 有暂存文件，也有未暂存改动 | 在提交前**主动告知**：未暂存改动 `<files>` 不会被本次提交 |

> ⚠️ **绝对禁止**在本 skill 中执行 `git add -A` / `git add .` / `git add <未暂存文件>`。
> 如果用户希望同时纳入未暂存改动，请引导其使用 `commit` skill 或显式 `git add` 后再来。

---

## Step 2：生成 commit message

读取 `git diff --cached`，按 **Conventional Commits** 生成 message：

```
<type>: <description>
```

### type 选择

| Type       | 适用情况                                  |
|------------|-------------------------------------------|
| `feat`     | 新增功能                                  |
| `fix`      | Bug 修复                                  |
| `refactor` | 重构（无行为变化）                        |
| `style`    | 仅样式 / 格式化 / lint                    |
| `perf`     | 性能优化                                  |
| `test`     | 测试相关                                  |
| `docs`     | 文档                                      |
| `chore`    | 构建、CI、依赖、工具链                    |
| `revert`   | 回滚                                      |

### message 规则

- description 用**中文**编写（用户偏好）
- 整条不超过 120 字符
- 结尾不加句号
- 聚焦用户可感知的变化，简洁明了
- 跟随用户当前对话的语言；用户全程中文则用中文

---

## Step 3：提交并推送（合并执行）

普通 commit + push 可以合并成一条命令（commit 不修改历史，push 被拒绝时无副作用）：

```bash
git commit -m "<message>" && git push
```

### 推送细节

先确认 upstream 状态：

```bash
git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null
```

- **无 upstream**（首次推送）：`git commit -m "<msg>" && git push -u origin <current-branch>`
- **upstream 指向同名远程分支**：`git commit -m "<msg>" && git push`
- **upstream 指向了 master 等错误分支**：`git commit -m "<msg>" && git push -u origin <current-branch>`

### 推送被拒绝（远端有更新）

```bash
git pull --rebase
git push
```

> ⚠️ **禁止** 对 main/master 执行 force push。
> 普通 feature 分支若必须强推，使用 `--force-with-lease` 而非 `--force`。

---

## Step 4：输出结果

按以下格式单行输出（替换 `{...}` 占位）：

```
已提交 {short_hash}：{commit message}
已推送到 origin/{branch}
```

**如果 Step 1 检测到有未暂存改动**，追加一行提示：

```
注意：未暂存改动 {files} 未一并提交，仍保留在工作区
```

如果有 MR/PR 链接（push 输出里通常会带），把链接也附在输出中。

---

## 禁止行为

- **禁止** `git add -A` / `git add .` / 自动暂存任何未暂存文件
- **禁止** `git commit -a`（会自动暂存所有已跟踪文件的改动）
- **禁止** 在 main/master 分支上直接提交（应先用 `git-branch` skill 新建分支）
- **禁止** amend + push 合并执行（amend 修改历史不可逆，必须拆分）
- **禁止** force push 到主干分支
