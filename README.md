# 动物侦探城：数学二下路线

面向小学二年级下册数学的学习闯关应用。当前 React + TypeScript + Vite 工程已接入内容包 registry、按内容包隔离的学习记录、内容校验、浏览器回归，以及北师大版数学二年级下册完整单元路线草案。

## 当前版本

| 项目 | 版本 |
| --- | --- |
| 产品版本 | v1.3.0 draft |
| 内容包 | `math.bsd.g2.s2.unit-1-division@0.1.0` 至 `math.bsd.g2.s2.unit-8-data-records@0.1.0` |
| 前端工程 | `apps/web` |
| 内容 Schema | `packages/content-schema` |
| 内容 Runtime | `packages/content-runtime` |
| 游戏规则引擎 | `packages/game-core` |

产品版本和 Git tag 保持一致；内容包使用独立版本号。新增内容包当前为 AI draft，进入 `approved` 或 `published` 前需要完成人工内容审核、教研审核和儿童可读性审核。

## 本地启动

```bash
npm install
npm run dev
```

默认访问：

```text
http://127.0.0.1:5173
```

指定 bundled 内容包访问：

```text
http://127.0.0.1:5173?contentPackageId=math.bsd.g2.s2.unit-1-division
```

数学路线当前注册：

```text
math.bsd.g2.s2.unit-1-division
math.bsd.g2.s2.unit-2-direction-position
math.bsd.g2.s2.unit-3-large-numbers
math.bsd.g2.s2.unit-4-measurement
math.bsd.g2.s2.unit-5-addition-subtraction
math.bsd.g2.s2.unit-6-shapes
math.bsd.g2.s2.unit-7-time
math.bsd.g2.s2.unit-8-data-records
```

## 已包含体验

- 开始页：昵称输入，默认昵称为“小侦探”。
- 地图页：学科切换、数学单元路线、案件、悬案馆、线索库、勋章馆入口。
- 案件详情：背景、目标、进度和继续调查。
- 普通关卡：4 个知识点关卡，每关 4 题，答对 3 题通过。
- Boss 挑战：集齐 4 条线索后解锁，2 道综合题。
- 结案页：展示真相、学习总结和奖励。
- 悬案馆：自动记录错题，可重新作答并标记已侦破。
- 线索库：通关后解锁知识卡。
- 勋章馆：自动发放 5 类勋章。
- 内容包 registry：当前默认内容包和数学路线来自 `content/registry.json`。
- 学习记录：使用 `localStorage` 保存，按 `questAcademy:progress:{contentPackageId}` 隔离，并保留旧数据迁移入口。

## 常用命令

```bash
npm run check
npm run test
npm run validate:content
npm run validate:content -- --package math.bsd.g2.s2.unit-1-division
npm run validate:content -- --all
npm run report:coverage -- --all
npm run --silent report:coverage -- --all --json
npm run build
npm run test:regression
npm run test:regression -- --package math.bsd.g2.s2.unit-1-division
npm run test:regression -- --all
```

`npm run test:regression` 会启动本地 Vite 服务并使用本机 Chrome headless 跑完整浏览器回归。默认回归 registry 默认内容包；`--package` 可指定内容包；`--all` 会回归 registry 内全部内容包。若 Chrome 不在默认路径，可设置 `CHROME_PATH`。

`npm run report:coverage` 会按 coverage plan 输出内容包真实覆盖率，普通诊断题、Boss 题和 reserve 题分开统计。数学二下覆盖计划见 `content/coverage-plans/math/bsd/grade-2/semester-2.json`，指标说明和补题流程见 `docs/数学知识覆盖率体系.md`。

## 主要目录

- `apps/web`：React 学生端应用。
- `packages/content-schema`：内容包 TypeScript 类型。
- `packages/content-runtime`：内容包加载和查询。
- `packages/game-core`：判分、解锁、错题、勋章等纯规则。
- `content/`：教材、知识图谱、案件、题目、知识卡、线索和勋章内容包。
- `content/registry.json`：内容包注册表。
- `scripts/validate-content.mjs`：内容包 registry、结构和引用校验脚本。
- `scripts/report-coverage.mjs`：知识覆盖率报告脚本，支持 `--all`、`--package` 和 `--json`。
- `scripts/regression-smoke.mjs`：浏览器回归脚本，支持按内容包运行。
- `docs/`：产品、架构、GitHub 流程、测试和发布文档。

## 协作规范

- `CONTRIBUTING.md`：分支、提交、PR、文档和内容协作规范。
- `docs/README.md`：文档中心入口。
- `docs/GITHUB_WORKFLOW.md`：GitHub Issue、PR、Review 和发布流程。
- `docs/CODE_AND_CONTENT_CONVENTIONS.md`：代码、内容、题目、存储和测试规范。
