---
name: oci-deploy
description: >-
  Orange CI（工蜂 CI）静态站点 COS+CDN 部署方案指导。当用户需要为静态站点项目配置 OCI 流水线、
  搭建 COS 对象存储部署方案、配置七彩石（Rainbow）密钥管理、设计版本化归档策略、
  排查 CI 部署报错（如 403 Access Denied、tccli not found、pip PEP668 错误）时使用。
  触发关键词："OCI 部署"、"工蜂 CI"、"Orange CI"、"COS 部署"、"CDN 刷新"、
  "七彩石配置"、"coscmd"、"tccli"、"流水线部署"、"CI/CD 配置"。
---

# OCI（工蜂 CI）静态站点 COS+CDN 部署方案

## 适用场景

为 VitePress / 其他静态站点项目在工蜂 CI（Orange CI）平台上搭建
COS 对象存储 + CDN 的完整 CI/CD 部署流水线。

---

## 架构概览

```
工蜂 CI（Orange CI）
  │
  ├── .orange-ci.yml          ← 入口，include .ci/deploy.yml
  └── .ci/deploy.yml          ← 主配置：jobs / stages / pipelines

密钥管理：七彩石（Rainbow OCI Plugin）
  └── ci_env 配置项（KV 格式）
        COS_SECRET_ID / COS_SECRET_KEY
        COS_BUCKET / COS_REGION / COS_ENDPOINT
        COS_URL_PREFIX / COS_PATH

工具镜像：
  - node:20                               ← 构建
  - orangeciplugins/tencentyun-coscmd     ← COS 上传
  - python:3.11-slim                      ← CDN 刷新（tccli）
  - mirrors.tencent.com/plugins/rainbow-oci-plugin  ← 七彩石拉取
```

---

## 标准 Pipeline 设计

### 触发规则

| 事件 | Pipeline | 动作 |
|------|----------|------|
| MR 创建/源分支 push | MR 构建验证 | 仅构建，不部署 |
| MR 合并到 master | 自动部署测试环境 | 构建 → 上传测试桶 → 版本归档 → CDN 刷新 |
| API 手动触发 | 发布生产环境 | 构建 → 上传生产桶（--delete）→ CDN 刷新 |

### 测试 vs 生产部署策略

| | 测试桶 | 生产桶 |
|-|--------|--------|
| 根路径 `/` | 当前待发布版本（不 --delete） | 当前版本（--delete 全量覆盖） |
| 版本归档 | `/versions/YYYYMMDD-{commitId}/` 永久保留 | 无 |
| CDN 刷新 | 需要（刷新根路径缓存） | 需要 |

---

## 完整配置示例

### `.orange-ci.yml`（入口）

```yaml
include:
  - .ci/deploy.yml
```

### `.ci/deploy.yml`

```yaml
# ============================================================
# 七彩石拉取密钥（公共 Stage）
# ENV_RAINBOW_GROUP / ENV_RAINBOW_NAME 在各 pipeline env 中指定
# ============================================================
.stage-get-env:
  - name: 拉取 ci_env 配置文件
    image: mirrors.tencent.com/plugins/rainbow-oci-plugin:latest
    settings:
      appID: ${ENV_RAINBOW_APPID}
      group: ${ENV_RAINBOW_GROUP}
      envName: ${ENV_RAINBOW_NAME}
      groupConfigType: kv
      type: key
      key: ci_env
      target: ./
  - name: 输出 env 至流水线构建变量
    type: orange-ci:read-file
    options:
      filePath: ci_env
    exports:
      COS_SECRET_ID: COS_SECRET_ID
      COS_SECRET_KEY: COS_SECRET_KEY
      COS_BUCKET: COS_BUCKET
      COS_REGION: COS_REGION
      COS_URL_PREFIX: COS_URL_PREFIX
      COS_ENDPOINT: COS_ENDPOINT
      COS_PATH: COS_PATH

# ============================================================
# 公共 Job 片段
# ============================================================

.job-build-test: &job-build-test
  name: 构建（测试环境）
  image: node:20
  commands:
    - npm install
    - npm run build:test

.job-build-prod: &job-build-prod
  name: 构建（生产环境）
  image: node:20
  commands:
    - npm install
    - npm run build:prod

# 上传根路径（不 --delete，保留历史归档目录）
.job-cos-upload-test: &job-cos-upload-test
  name: 上传静态文件到测试 COS 根路径
  image: orangeciplugins/tencentyun-coscmd:latest
  commands:
    - coscmd config -a ${COS_SECRET_ID} -s ${COS_SECRET_KEY} -b ${COS_BUCKET} -e ${COS_ENDPOINT} --do-not-use-ssl
    - coscmd upload -r .vitepress/dist/ /

# 版本归档（日期+commitId，永久保留）
.job-cos-upload-test-version: &job-cos-upload-test-version
  name: 上传版本归档到测试 COS
  image: orangeciplugins/tencentyun-coscmd:latest
  commands:
    - coscmd config -a ${COS_SECRET_ID} -s ${COS_SECRET_KEY} -b ${COS_BUCKET} -e ${COS_ENDPOINT} --do-not-use-ssl
    - VERSION_DIR="versions/$(date +%Y%m%d)-${ORANGE_COMMIT_SHORT}"
    - coscmd upload -r .vitepress/dist/ /${VERSION_DIR}/

# 生产桶全量覆盖
.job-cos-upload-prod: &job-cos-upload-prod
  name: 上传静态文件到生产 COS
  image: orangeciplugins/tencentyun-coscmd:latest
  commands:
    - coscmd config -a ${COS_SECRET_ID} -s ${COS_SECRET_KEY} -b ${COS_BUCKET} -e ${COS_ENDPOINT} --do-not-use-ssl
    - coscmd upload -r .vitepress/dist/ / --delete

# CDN 刷新（python:3.11-slim 避免 PEP668 问题）
.job-cdn-refresh: &job-cdn-refresh
  name: 刷新 CDN 缓存
  image: python:3.11-slim
  commands:
    - pip install tccli -q
    - tccli configure set secretId ${COS_SECRET_ID} secretKey ${COS_SECRET_KEY} region ${COS_REGION}
    - tccli cdn PurgePathCache --Paths "[\"${COS_URL_PREFIX}/\"]" --FlushType flush

# ============================================================
# Stage 组合（jobs 数组共享 workspace）
# ============================================================

.stage-deploy-test:
  - name: 部署到测试环境
    jobs:
      - *job-build-test
      - *job-cos-upload-test
      - *job-cos-upload-test-version
      - *job-cdn-refresh

.stage-deploy-prod:
  - name: 部署到生产环境
    jobs:
      - *job-build-prod
      - *job-cos-upload-prod
      - *job-cdn-refresh

# ============================================================
# Pipeline 入口
# ============================================================

master:
  merge_request:
    - name: MR 构建验证
      imports:
        - https://git.woa.com/tencent-design/secret/blob/master/config/ci.yml
      env:
        ENV_RAINBOW_GROUP: <your-test-rainbow-group>
        ENV_RAINBOW_NAME: Dev
      stages:
        - !reference [.stage-get-env]
        - name: 构建验证
          jobs:
            - *job-build-test

  merged:
    - name: 自动部署测试环境
      imports:
        - https://git.woa.com/tencent-design/secret/blob/master/config/ci.yml
      env:
        ENV_RAINBOW_GROUP: <your-test-rainbow-group>
        ENV_RAINBOW_NAME: Dev
      stages:
        - !reference [.stage-get-env]
        - !reference [.stage-deploy-test]

$:
  api_trigger_deploy_production:
    - name: 发布生产环境
      imports:
        - https://git.woa.com/tencent-design/secret/blob/master/config/ci.yml
      env:
        ENV_RAINBOW_GROUP: <your-prod-rainbow-group>
        ENV_RAINBOW_NAME: Dev
      stages:
        - !reference [.stage-get-env]
        - !reference [.stage-deploy-prod]
```

---

## 关键设计决策与踩坑记录

### 1. 七彩石（Rainbow）密钥组配置

**问题**：`imports: secret/config/ci.yml` 会注入 cocraft 项目自己的
`ENV_RAINBOW_GROUP`，导致拉取密钥时报 `ErrVersionNotFound (707)`。

**解法**：在每个 pipeline 的 `env` 块中**显式覆盖** Rainbow 变量：

```yaml
env:
  ENV_RAINBOW_GROUP: dev_ardot-docs-test   # 指定本项目的七彩石 group
  ENV_RAINBOW_NAME: Dev
```

不同环境使用不同 group（测试用 test group，生产用 prod group）。

---

### 2. jobs 数组共享 workspace

**问题**：构建（node:20）和上传（coscmd 镜像）是不同容器，
跨 stage 的不同 job 无法共享文件。

**解法**：将构建和上传放在同一 stage 的 `jobs` 数组中：

```yaml
- name: 部署阶段
  jobs:
    - *job-build-test       # node:20
    - *job-cos-upload-test  # coscmd 镜像
```

`jobs` 数组内的所有 job 共享同一个 workspace volume，即使镜像不同。

---

### 3. tccli: not found（CDN 刷新）

**问题**：`orangeciplugins/tencentyun-coscmd:latest` 基于 Debian bookworm，
Python 为 externally-managed 环境（PEP 668），`pip install tccli` 失败，
即使加 `--break-system-packages` 也因 PATH 问题导致 `tccli: not found`。

**解法**：CDN 刷新独立成一个 job，使用 `python:3.11-slim` 镜像：

```yaml
.job-cdn-refresh: &job-cdn-refresh
  name: 刷新 CDN 缓存
  image: python:3.11-slim      # ← 干净的 Python 环境
  commands:
    - pip install tccli -q
    - tccli configure set ...
    - tccli cdn PurgePathCache ...
```

与 coscmd job 同在 `jobs` 数组，共享 workspace，变量均可访问。

---

### 4. YAML anchor 与 `!reference` 的区别

| 用法 | 场景 |
|------|------|
| `&anchor` / `*anchor` | 引用单个 job 对象 |
| `!reference [.stage-xxx]` | 引用 stage 数组（多个 step） |
| `<<: *anchor`（YAML merge key） | **OCI 不支持**，禁止使用 |

---

### 5. 版本化归档不需要刷新 CDN 的原因

版本归档路径 `/versions/YYYYMMDD-{commitId}/` 每次都是新 URL，
CDN 没有旧缓存，直接命中 COS 源站，无需刷新。
只有根路径 `/` 覆盖写才需要刷新 CDN。

---

## 常见报错速查

| 报错 | 原因 | 解法 |
|------|------|------|
| `ErrVersionNotFound (707)` | 七彩石 group 错误 | 在 pipeline env 中显式指定 `ENV_RAINBOW_GROUP` |
| `403 Access Denied` | COS 子账号无写权限 | 在 CAM 控制台为子账号添加 COS 写权限 |
| `cannot stat '.vitepress/dist/'` | 构建产物不在上传容器 | 将构建和上传放入同一 stage 的 `jobs` 数组 |
| `pip3: not found` | 镜像无 Python | 切换到含 Python 的镜像，或用 `apt-get install python3-pip` |
| `externally-managed-environment` | PEP 668 限制 | 换用 `python:3.11-slim` 独立 job |
| `tccli: not found` | coscmd 镜像安装 tccli 后 PATH 问题 | 用 `python:3.11-slim` 独立 job |

---

## 七彩石 ci_env 配置项参考

在七彩石对应 group 的 `ci_env` KV 中配置以下字段（每行一个 `KEY=VALUE`）：

```
COS_SECRET_ID=AKIDxxxx
COS_SECRET_KEY=xxxx
COS_BUCKET=your-bucket-1234567890
COS_REGION=ap-guangzhou
COS_ENDPOINT=cos.ap-guangzhou.myqcloud.com
COS_URL_PREFIX=https://your-cdn-domain.com
COS_PATH=
```

> `COS_PATH` 静态站点部署到根路径时留空即可。
