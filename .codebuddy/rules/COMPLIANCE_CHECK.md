---
description: 敏感信息与合规排查规则。每次执行 git commit / git push 或编写新内容时必须自动触发此规则，确保仓库不包含任何公司内部敏感信息。
globs: "**/*.md,**/*.skill,**/*.sh,**/*.json,**/*.yml,**/*.yaml,**/*.ts,**/*.js,**/*.txt"
alwaysApply: true
---

# 敏感信息与合规排查规则

> **优先级：最高** — 本规则在每次提交（commit）、推送（push）或编写/修改文件时 **必须自动执行**。

## 适用场景

- 执行 `git commit` 或 `git push` 之前
- 创建或修改任何文件时
- 代码审查（Code Review）时

## 必须排查的敏感信息类别

### 1. 公司内部域名与地址

以下域名/地址 **禁止** 出现在仓库中：

| 类别 | 禁止内容示例 |
|------|-------------|
| 内部 Git | `git.woa.com`、`git.code.oa.com`、`github.com/Tencent` (私有仓库) |
| 内部镜像 | `mirrors.tencent.com`、`mirrors.cloud.tencent.com` |
| 内部 CI/CD | `orange-ci`、`oci.woa.com`、`coding.net` (私有) |
| 内部平台 | `tapd.cn`、`km.woa.com`、`iwiki.woa.com`、`cloudstudio.net` (内部) |
| 内部 API | `*.woa.com`、`*.oa.com`、`*.tencentyun.com` (内部服务) |

### 2. 公司内部包与工具

| 类别 | 禁止内容示例 |
|------|-------------|
| NPM 包 | `@tencent/*`、`@tencentcloud/*`（内部私有包） |
| 内部工具 | `trpc`、`taf`、`tsf`（非公开版本） |
| 内部插件 | `orangeciplugins/*`、`tencentyun-*` |

### 3. 凭据与密钥

| 类别 | 禁止内容 |
|------|---------|
| 真实密钥 | 任何真实的 `SECRET_KEY`、`ACCESS_KEY`、`API_KEY`、`TOKEN` 值 |
| 邮箱 | `*@tencent.com`、`*@qq.com` (员工个人邮箱) |
| 内网 IP | `10.x.x.x`、`172.16-31.x.x`、`9.x.x.x`（腾讯内网段） |
| 证书/私钥 | `*.pem`、`*.key`、`*.p12` 文件或其内容 |

### 4. 公司组织信息

| 类别 | 禁止内容 |
|------|---------|
| 团队名称 | 具体的部门名称、团队代号、项目内部代号 |
| 员工信息 | 员工姓名、工号、企业微信 ID |
| 业务信息 | 内部业务架构、内部系统名称 |

## 排查流程（每次提交前必须执行）

### Step 1: 自动扫描

对所有待提交文件执行以下正则匹配：

```bash
# 必须扫描的模式列表
PATTERNS=(
  'woa\.com'
  'oa\.com'
  'tencent\.com'
  'tencentyun'
  '@tencent/'
  'tapd\.cn'
  'orange-ci'
  'git\.code\.oa'
  'mirrors\.tencent'
  'SECRET_KEY=\S+'      # 真实密钥值（非变量引用）
  'ACCESS_KEY=\S+'
  'API_KEY=\S+'
  'TOKEN=\S+'
  '@tencent\.com'
  '@qq\.com'
  '\b10\.\d+\.\d+\.\d+'
  '\b9\.\d+\.\d+\.\d+'
)
```

### Step 2: 逐条审查

对每一处匹配项：
1. **确认是否为敏感信息**（排除误报，如公开文档链接 `cloud.tencent.com` 公开 API 可视情况放行）
2. **敏感信息必须移除或替换**：
   - 内部域名 → 替换为通用示例（如 `example.com`）
   - 内部包名 → 替换为等效的公开包（如 `@angular/core`）
   - 真实密钥 → 替换为占位符（如 `your-api-key-here`）
   - 员工邮箱 → 替换为示例邮箱（如 `user@example.com`）

### Step 3: 确认放行

仅当以下条件 **全部满足** 时才允许提交：
- [ ] 所有扫描模式均无匹配，或匹配项已确认为安全（如公开云服务文档链接）
- [ ] 不包含任何真实凭据/密钥
- [ ] 不包含任何员工个人信息
- [ ] 不包含任何内部系统/平台的非公开地址

## 违规处理

- **阻断提交**：发现敏感信息时 **禁止** 执行 commit/push，必须先清理
- **告知用户**：明确列出发现的敏感信息位置和内容，给出替换建议
- **记录审计**：在 commit message 中注明已通过合规检查

## 豁免白名单

以下内容可以出现在仓库中（无需清理）：

- `cloud.tencent.com` 公开文档链接（腾讯云公开 API 文档）
- 公开开源项目引用（如 `github.com/nicepkg/gpt-runner`）
- 通用技术术语（如 "COS"、"CDN" 等缩写本身）
- 变量名模板（如 `${COS_SECRET_KEY}`，仅引用变量而非实际值）
