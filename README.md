# 动物侦探城：徽章失踪案

面向小学二年级下册除法单元的学习闯关应用。v1.0.0 已从静态 MVP 升级为 React + TypeScript + Vite 工程，并保留当前“徽章失踪案”的完整学习闭环。

## 当前版本

| 项目 | 版本 |
| --- | --- |
| 产品版本 | v1.0.0 |
| 内容包 | `math.bsd.g2.s2.unit-1-division@0.1.0` |
| 前端工程 | `apps/web` |
| 内容 Schema | `packages/content-schema` |
| 内容 Runtime | `packages/content-runtime` |
| 游戏规则引擎 | `packages/game-core` |

产品版本和 Git tag 保持一致；内容包使用独立版本号。

## 本地启动

```bash
npm install
npm run dev
```

默认访问：

```text
http://127.0.0.1:5173
```

## 已包含体验

- 开始页：昵称输入，默认昵称为“小侦探”。
- 地图页：案件、悬案馆、线索库、勋章馆入口。
- 案件详情：背景、目标、进度和继续调查。
- 普通关卡：4 个知识点关卡，每关 4 题，答对 3 题通过。
- Boss 挑战：集齐 4 条线索后解锁，2 道综合题。
- 结案页：展示真相、学习总结和奖励。
- 悬案馆：自动记录错题，可重新作答并标记已侦破。
- 线索库：通关后解锁知识卡。
- 勋章馆：自动发放 5 类勋章。
- 学习记录：使用 `localStorage` 保存，v1.0.0 兼容 v0.2.0 本地数据迁移。

## 常用命令

```bash
npm run check
npm run test
npm run validate:content
npm run build
npm run test:regression
```

`npm run test:regression` 会启动本地 Vite 服务并使用本机 Chrome headless 跑完整浏览器回归。若 Chrome 不在默认路径，可设置 `CHROME_PATH`。

## 主要目录

- `apps/web`：React 学生端应用。
- `packages/content-schema`：内容包 TypeScript 类型。
- `packages/content-runtime`：内容包加载和查询。
- `packages/game-core`：判分、解锁、错题、勋章等纯规则。
- `content/`：教材、知识图谱、案件、题目、知识卡、线索和勋章内容包。
- `scripts/validate-content.mjs`：内容包结构和引用校验脚本。
- `scripts/regression-smoke.mjs`：v1.0.0 浏览器回归脚本。
- `docs/`：产品、架构、GitHub 流程、测试和发布文档。

## 协作规范

- `CONTRIBUTING.md`：分支、提交、PR、文档和内容协作规范。
- `docs/README.md`：文档中心入口。
- `docs/GITHUB_WORKFLOW.md`：GitHub Issue、PR、Review 和发布流程。
- `docs/CODE_AND_CONTENT_CONVENTIONS.md`：代码、内容、题目、存储和测试规范。
