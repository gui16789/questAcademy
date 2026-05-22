# 动物侦探城 - GitHub Labels 初始化清单

## 1. 文档信息

| 项目 | 内容 |
| --- | --- |
| 文档名称 | 动物侦探城 - GitHub Labels 初始化清单 |
| 文档版本 | v0.1.0 |
| 文档状态 | 草稿 |
| 更新日期 | 2026-05-22 |
| 维护负责人 | 项目负责人 |

## 2. 文档目的

本文档用于初始化 GitHub Labels，配合 Issue、PR、Milestone 和 Project 看板管理。

## 3. Label 分类

### 3.1 type

```text
type:docs
type:feature
type:bug
type:content
type:test
type:release
type:research
```

### 3.2 area

```text
area:product
area:architecture
area:ui
area:frontend
area:backend
area:content
area:data
area:github
```

### 3.3 priority

```text
priority:P0
priority:P1
priority:P2
priority:P3
```

### 3.4 status

```text
status:blocked
status:needs-review
status:ready
```

## 4. 可选 gh label create 草案

以下命令仅作为草案，不自动执行。

```bash
gh label create "type:docs" --color "0366d6" --description "Documentation changes"
gh label create "type:feature" --color "0e8a16" --description "Feature work"
gh label create "type:bug" --color "d73a4a" --description "Bug fix"
gh label create "type:content" --color "fbca04" --description "Content package or learning assets"
gh label create "type:test" --color "5319e7" --description "Testing and QA"
gh label create "type:release" --color "0052cc" --description "Release management"
gh label create "type:research" --color "c5def5" --description "Research and validation"

gh label create "area:product" --color "1d76db" --description "Product scope and requirements"
gh label create "area:architecture" --color "5319e7" --description "Architecture and data model"
gh label create "area:ui" --color "f9d0c4" --description "UI and UX"
gh label create "area:frontend" --color "0e8a16" --description "Frontend implementation"
gh label create "area:backend" --color "006b75" --description "Backend implementation"
gh label create "area:content" --color "fbca04" --description "Learning content"
gh label create "area:data" --color "bfdadc" --description "Data and analytics"
gh label create "area:github" --color "ededed" --description "GitHub workflow"

gh label create "priority:P0" --color "b60205" --description "Blocks core flow or release"
gh label create "priority:P1" --color "d93f0b" --description "High priority"
gh label create "priority:P2" --color "fbca04" --description "Medium priority"
gh label create "priority:P3" --color "c2e0c6" --description "Low priority"

gh label create "status:blocked" --color "b60205" --description "Blocked"
gh label create "status:needs-review" --color "fbca04" --description "Needs review"
gh label create "status:ready" --color "0e8a16" --description "Ready to work"
```

## 5. 修订记录

| 版本 | 日期 | 说明 |
| --- | --- | --- |
| v0.1.0 | 2026-05-22 | 创建 GitHub Labels 初始化清单 |
