# 动物侦探城 - 数据模型与内容 Schema - v0.1.0

## 1. 文档信息

| 项目 | 内容 |
| --- | --- |
| 文档名称 | 动物侦探城 - 数据模型与内容 Schema |
| 文档版本 | v0.1.0 |
| 文档状态 | 草稿 |
| 适用阶段 | v0.2.0 内容抽取、v1.0.0 前端工程化、v2.0.0 后端数据化 |
| 更新日期 | 2026-05-22 |
| 维护负责人 | 技术负责人 + 产品负责人 + 教研负责人 |

## 2. 文档目的

本文档定义《动物侦探城》的核心数据模型和内容 Schema，用于支撑：

- 教材版本切换。
- 知识点、能力点、易错点结构化维护。
- 内容工厂生产题目、知识卡、线索、Boss 和复习规则。
- 游戏流程从知识体系自动编排。
- 学习数据回溯到教材、知识点、能力点和错因。
- 从静态 MVP 逐步演进到内容包、前端工程、后端和内容后台。

本文档是后续内容包、技术实现、内容工厂流程和 PRD 的底层契约。

## 3. 已确认关键决策

| 编号 | 决策 | 说明 |
| --- | --- | --- |
| D1 | 知识体系采用 `Subject -> TextbookVersion -> Grade -> Semester -> Unit -> Lesson -> KnowledgePoint -> Skill -> Misconception` | 支持从教材到诊断的完整链路 |
| D2 | 教材节点与通用知识点分离 | 支持不同教材映射到同一通用知识点 |
| D3 | v0.x / v1.x 使用 JSON 内容包 | 先结构化内容，不立即上数据库后台 |
| D4 | 题目必须绑定到 Skill 和 Misconception | 支持错题诊断和复习推荐 |
| D5 | Boss 独立建模 | Boss 是综合验证任务，不是普通题目的最后一题 |
| D6 | 分阶段演进 | v0.2 抽 JSON，v1.0 工程化，v2.0 接后端，v3.0 上后台 |

## 4. Schema 设计原则

### 4.1 分离原则

必须分离以下概念：

```text
教材目录 != 知识图谱
知识点 != 游戏关卡
题目资产 != 学习记录
内容配置 != 前端渲染
Boss 任务 != 普通题目列表
```

### 4.2 可追溯原则

每个学习行为都应该能回溯到：

```text
教材版本
年级
学期
单元
课时 / 主题
知识点
能力点
易错点
内容版本
游戏案件
游戏关卡
```

### 4.3 可迁移原则

所有核心数据对象必须带版本：

```text
schemaVersion
contentVersion
dataVersion
```

原因：

- 内容会被教研修订。
- 学习记录需要知道用户答的是哪一版题。
- 后续本地数据需要迁移到后端。
- 不同教材版本需要共存。

### 4.4 最小可用原则

v0.2.0 不追求完整后台，但 JSON Schema 必须按长期结构设计。可以先空字段或默认字段，但不能把长期必须区分的维度混在一起。

## 5. 顶层内容包 ContentPackage

### 5.1 内容包定义

内容包是某个教材、年级、学期、单元或案件的结构化内容集合。

一个内容包至少包含：

```text
manifest
textbook
knowledgeMap
cases
levels
questions
knowledgeCards
clues
bossTasks
badges
reviewRules
```

### 5.2 目录建议

```text
content/
  math/
    bsd/
      grade-2/
        semester-2/
          unit-1-division/
            manifest.json
            textbook.json
            knowledge-map.json
            cases/
              carrot-badge-case.json
            questions/
              level-1.json
              level-2.json
              level-3.json
              level-4.json
              boss.json
            cards/
              knowledge-cards.json
            clues.json
            badges.json
            review-rules.json
```

### 5.3 manifest Schema

```json
{
  "schemaVersion": "0.1.0",
  "contentPackageId": "math.bsd.g2.s2.unit-1-division",
  "contentVersion": "0.1.0",
  "status": "draft",
  "subjectId": "math",
  "textbookVersionId": "bsd",
  "gradeId": "grade-2",
  "semesterId": "semester-2",
  "unitId": "unit-1-division",
  "title": "北师大版二年级下册第一单元：除法",
  "defaultCaseId": "case-carrot-badge",
  "locale": "zh-CN",
  "createdAt": "2026-05-22T00:00:00.000Z",
  "updatedAt": "2026-05-22T00:00:00.000Z",
  "review": {
    "contentReviewer": "",
    "teachingReviewer": "",
    "readabilityReviewer": "",
    "approvedAt": ""
  }
}
```

## 6. 教材体系 Schema

### 6.1 Subject 学科

```json
{
  "subjectId": "math",
  "name": "数学",
  "stage": "primary",
  "status": "active"
}
```

### 6.2 TextbookVersion 教材版本

```json
{
  "textbookVersionId": "bsd",
  "subjectId": "math",
  "name": "北师大版",
  "publisher": "北京师范大学出版社",
  "status": "active"
}
```

### 6.3 Unit 单元

```json
{
  "unitId": "unit-1-division",
  "subjectId": "math",
  "textbookVersionId": "bsd",
  "gradeId": "grade-2",
  "semesterId": "semester-2",
  "order": 1,
  "name": "第一单元：除法",
  "learningGoals": [
    "理解平均分",
    "理解除法算式含义",
    "理解有余数除法",
    "理解余数小于除数"
  ]
}
```

### 6.4 CurriculumNode 教材节点

教材节点表示教材中的课时、主题或活动。

```json
{
  "curriculumNodeId": "bsd.g2.s2.unit1.lesson-remainder-rule",
  "subjectId": "math",
  "textbookVersionId": "bsd",
  "gradeId": "grade-2",
  "semesterId": "semester-2",
  "unitId": "unit-1-division",
  "lessonId": "lesson-remainder-rule",
  "name": "余数规则",
  "order": 4,
  "mapsToKnowledgePointIds": [
    "math.division.remainder-rule"
  ],
  "source": {
    "book": "北师大版小学数学二年级下册",
    "pageRange": "",
    "note": ""
  }
}
```

## 7. 知识图谱 Schema

### 7.1 KnowledgePoint 通用知识点

通用知识点不绑定某一本教材。不同教材节点可以映射到同一个通用知识点。

```json
{
  "knowledgePointId": "math.division.remainder-rule",
  "subjectId": "math",
  "domainId": "number-and-algebra",
  "name": "余数小于除数",
  "shortName": "余数规则",
  "definition": "在有余数除法中，余数必须小于除数。",
  "learningGoal": "能判断一个有余数除法算式中的余数是否合理。",
  "gradeBand": "primary-lower",
  "prerequisiteIds": [
    "math.division.average-sharing",
    "math.division.with-remainder"
  ],
  "skillIds": [
    "skill.remainder.compare-with-divisor",
    "skill.remainder.correct-invalid-result"
  ],
  "misconceptionIds": [
    "mis.remainder.equal-divisor",
    "mis.remainder.greater-than-divisor"
  ],
  "status": "active",
  "version": "0.1.0"
}
```

### 7.2 Skill 能力点

能力点是诊断的最小推荐粒度。

```json
{
  "skillId": "skill.remainder.compare-with-divisor",
  "knowledgePointId": "math.division.remainder-rule",
  "name": "比较余数和除数大小",
  "learningGoal": "能判断余数是否小于除数。",
  "difficultyBand": "basic",
  "questionPatternIds": [
    "pattern.judge-remainder-valid",
    "pattern.choose-invalid-remainder"
  ],
  "misconceptionIds": [
    "mis.remainder.equal-divisor",
    "mis.remainder.greater-than-divisor"
  ]
}
```

### 7.3 Misconception 易错点

```json
{
  "misconceptionId": "mis.remainder.greater-than-divisor",
  "knowledgePointId": "math.division.remainder-rule",
  "skillId": "skill.remainder.compare-with-divisor",
  "name": "认为余数可以大于除数",
  "description": "孩子没有意识到余数大于或等于除数时还能继续分一组。",
  "diagnosisHint": "检查孩子是否理解余数表示剩下不够再分一组的数量。",
  "remediationStrategyId": "review.remainder-rule-basic"
}
```

### 7.4 QuestionPattern 题型模式

```json
{
  "questionPatternId": "pattern.judge-remainder-valid",
  "knowledgePointId": "math.division.remainder-rule",
  "skillId": "skill.remainder.compare-with-divisor",
  "name": "判断余数是否合理",
  "supportedQuestionTypes": ["judge", "single"],
  "difficultyBand": "basic",
  "template": "判断 {dividend} ÷ {divisor} = {quotient} 余 {remainder} 是否合理。"
}
```

## 8. 游戏编排 Schema

### 8.1 Case 案件

```json
{
  "caseId": "case-carrot-badge",
  "contentPackageId": "math.bsd.g2.s2.unit-1-division",
  "name": "徽章失踪案",
  "subjectId": "math",
  "unitId": "unit-1-division",
  "targetKnowledgePointIds": [
    "math.division.average-sharing",
    "math.division.expression",
    "math.division.with-remainder",
    "math.division.remainder-rule"
  ],
  "story": {
    "summary": "动物侦探学院的胡萝卜徽章数量对不上，小侦探需要用除法知识找出真相。",
    "setting": "动物侦探学院",
    "mentorCharacterId": "char-deer-captain"
  },
  "levelIds": [
    "level-average-sharing",
    "level-division-expression",
    "level-with-remainder",
    "level-remainder-rule"
  ],
  "bossTaskId": "boss-carrot-badge-final",
  "badgeRewardIds": [
    "badge-case-closer"
  ],
  "unlockRule": {
    "type": "available_by_default"
  }
}
```

### 8.2 Level 关卡

```json
{
  "levelId": "level-remainder-rule",
  "caseId": "case-carrot-badge",
  "order": 4,
  "name": "可疑的说法",
  "place": "熊老师办公室",
  "knowledgePointId": "math.division.remainder-rule",
  "skillIds": [
    "skill.remainder.compare-with-divisor"
  ],
  "questionGroupId": "qg-level-remainder-rule-basic",
  "passRule": {
    "type": "min_correct",
    "minCorrect": 3,
    "total": 4
  },
  "reward": {
    "clueId": "clue-remainder-rule",
    "knowledgeCardIds": [
      "card-remainder-rule"
    ]
  },
  "unlockRule": {
    "type": "previous_level_passed"
  }
}
```

### 8.3 Clue 线索

```json
{
  "clueId": "clue-remainder-rule",
  "caseId": "case-carrot-badge",
  "levelId": "level-remainder-rule",
  "knowledgePointId": "math.division.remainder-rule",
  "title": "余数不合理的说法",
  "text": "狐狸配送员说的余数太大，不符合除法规则。",
  "unlockCondition": {
    "type": "level_passed",
    "levelId": "level-remainder-rule"
  }
}
```

## 9. 题目 Schema

### 9.1 Question 题目

每道题必须同时绑定教材维度、知识维度和游戏维度。

```json
{
  "questionId": "q-remainder-rule-001",
  "contentVersion": "0.1.0",
  "subjectId": "math",
  "textbookVersionId": "bsd",
  "gradeId": "grade-2",
  "semesterId": "semester-2",
  "unitId": "unit-1-division",
  "lessonId": "lesson-remainder-rule",
  "curriculumNodeId": "bsd.g2.s2.unit1.lesson-remainder-rule",
  "knowledgePointId": "math.division.remainder-rule",
  "skillId": "skill.remainder.compare-with-divisor",
  "misconceptionId": "mis.remainder.greater-than-divisor",
  "questionPatternId": "pattern.judge-remainder-valid",
  "caseId": "case-carrot-badge",
  "levelId": "level-remainder-rule",
  "questionType": "judge",
  "difficultyBand": "basic",
  "stem": "26 ÷ 6 = 3 余 8，这个算式合理。",
  "options": ["对", "错"],
  "answer": "错",
  "explanation": "余数 8 比除数 6 大，还能继续分，所以不合理。",
  "wrongHint": "这条线索还不够清楚，我们先放进悬案馆，稍后再调查。",
  "tags": ["除法", "余数", "判断"],
  "status": "draft"
}
```

### 9.2 QuestionType 枚举

v0.1.0 支持：

```text
single 单选
judge 判断
fill 填空
```

后续可扩展：

```text
multi 多选
sort 排序
match 连线
drag 拖拽
step 多步骤
```

### 9.3 DifficultyBand 枚举

```text
intro 引入
basic 基础
practice 巩固
application 应用
challenge 挑战
integrated 综合
```

MVP 可以先使用：

```text
basic
application
integrated
```

## 10. KnowledgeCard 知识卡 Schema

知识卡是线索库的核心资产，必须绑定知识点和能力点。

```json
{
  "knowledgeCardId": "card-remainder-rule",
  "contentVersion": "0.1.0",
  "knowledgePointId": "math.division.remainder-rule",
  "skillIds": [
    "skill.remainder.compare-with-divisor"
  ],
  "title": "余数规则线索卡",
  "summary": "余数一定要比除数小。",
  "example": "23 ÷ 6 = 3 余 5 可以，余 6 就不可以。",
  "method": "算完后检查余数，余数不能等于或大于除数。",
  "commonMistake": "余数太大时没有继续再分一份。",
  "reviewPrompt": "看到余数时，先和除数比一比。",
  "relatedQuestionPatternIds": [
    "pattern.judge-remainder-valid"
  ],
  "status": "draft"
}
```

## 11. BossTask Schema

### 11.1 Boss 独立建模

Boss 是综合验证任务，不是普通题目列表的最后几题。

```json
{
  "bossTaskId": "boss-carrot-badge-final",
  "caseId": "case-carrot-badge",
  "name": "胡萝卜徽章最终推理",
  "targetKnowledgePointIds": [
    "math.division.average-sharing",
    "math.division.with-remainder",
    "math.division.remainder-rule",
    "math.division.word-problem"
  ],
  "targetSkillIds": [
    "skill.average-sharing.calculate-each-share",
    "skill.remainder.calculate",
    "skill.remainder.compare-with-divisor",
    "skill.word-problem.interpret-remainder"
  ],
  "targetMisconceptionIds": [
    "mis.remainder.greater-than-divisor",
    "mis.word-problem.use-remainder-wrong"
  ],
  "scenario": "学院原来有 35 枚胡萝卜徽章，每队分 6 枚。需要判断能分给几个完整小队，还剩几枚，以及狐狸配送员的说法是否合理。",
  "steps": [
    {
      "stepId": "boss-step-1",
      "questionId": "boss-q-carrot-001",
      "skillIds": ["skill.remainder.calculate"]
    },
    {
      "stepId": "boss-step-2",
      "questionId": "boss-q-carrot-002",
      "skillIds": ["skill.word-problem.interpret-remainder"]
    }
  ],
  "passRule": {
    "type": "all_required",
    "requiredCorrectStepIds": ["boss-step-1", "boss-step-2"]
  },
  "failureReviewRoute": {
    "type": "by_skill",
    "fallbackKnowledgeCardIds": [
      "card-with-remainder",
      "card-remainder-rule"
    ]
  }
}
```

### 11.2 BossAttempt 学习数据

```json
{
  "bossAttemptId": "attempt-001",
  "userId": "user-001",
  "bossTaskId": "boss-carrot-badge-final",
  "caseId": "case-carrot-badge",
  "startedAt": "2026-05-22T00:00:00.000Z",
  "finishedAt": "2026-05-22T00:10:00.000Z",
  "isPassed": false,
  "stepResults": [
    {
      "stepId": "boss-step-1",
      "questionId": "boss-q-carrot-001",
      "isCorrect": true
    },
    {
      "stepId": "boss-step-2",
      "questionId": "boss-q-carrot-002",
      "isCorrect": false,
      "diagnosedSkillId": "skill.word-problem.interpret-remainder",
      "diagnosedMisconceptionId": "mis.word-problem.use-remainder-wrong"
    }
  ]
}
```

## 12. ReviewRule 复习规则 Schema

复习规则用于把错题、知识卡、题型和补救策略连接起来。

```json
{
  "reviewRuleId": "review.remainder-rule-basic",
  "knowledgePointId": "math.division.remainder-rule",
  "skillId": "skill.remainder.compare-with-divisor",
  "misconceptionId": "mis.remainder.greater-than-divisor",
  "trigger": {
    "type": "wrong_answer",
    "minWrongCount": 1
  },
  "actions": [
    {
      "type": "show_knowledge_card",
      "knowledgeCardId": "card-remainder-rule"
    },
    {
      "type": "recommend_question_pattern",
      "questionPatternId": "pattern.judge-remainder-valid",
      "count": 3
    }
  ]
}
```

## 13. 学习数据 Schema

### 13.1 UserProfile

```json
{
  "userId": "user-001",
  "nickname": "小侦探",
  "avatar": "fox",
  "createdAt": "2026-05-22T00:00:00.000Z",
  "lastLoginAt": "2026-05-22T00:00:00.000Z",
  "dataVersion": "0.1.0"
}
```

### 13.2 Progress

```json
{
  "userId": "user-001",
  "contentPackageId": "math.bsd.g2.s2.unit-1-division",
  "caseId": "case-carrot-badge",
  "currentLevelId": "level-remainder-rule",
  "passedLevelIds": [
    "level-average-sharing",
    "level-division-expression",
    "level-with-remainder"
  ],
  "unlockedClueIds": [
    "clue-average-sharing",
    "clue-division-expression",
    "clue-with-remainder"
  ],
  "unlockedKnowledgeCardIds": [
    "card-average-sharing",
    "card-division-expression",
    "card-with-remainder"
  ],
  "bossUnlocked": false,
  "caseClosed": false,
  "lastStudyAt": "2026-05-22T00:00:00.000Z"
}
```

### 13.3 AnswerRecord

答题记录必须保留教材、知识、游戏和内容版本映射。

```json
{
  "answerRecordId": "answer-001",
  "userId": "user-001",
  "sessionId": "session-001",
  "questionId": "q-remainder-rule-001",
  "questionVersion": "0.1.0",
  "contentPackageId": "math.bsd.g2.s2.unit-1-division",
  "caseId": "case-carrot-badge",
  "levelId": "level-remainder-rule",
  "subjectId": "math",
  "textbookVersionId": "bsd",
  "unitId": "unit-1-division",
  "knowledgePointId": "math.division.remainder-rule",
  "skillId": "skill.remainder.compare-with-divisor",
  "misconceptionId": "mis.remainder.greater-than-divisor",
  "userAnswer": "对",
  "correctAnswer": "错",
  "isCorrect": false,
  "attemptIndex": 1,
  "answeredAt": "2026-05-22T00:00:00.000Z",
  "timeSpentSeconds": 18
}
```

### 13.4 WrongRecord

```json
{
  "wrongRecordId": "wrong-001",
  "userId": "user-001",
  "questionId": "q-remainder-rule-001",
  "questionVersion": "0.1.0",
  "knowledgePointId": "math.division.remainder-rule",
  "skillId": "skill.remainder.compare-with-divisor",
  "misconceptionId": "mis.remainder.greater-than-divisor",
  "wrongCount": 1,
  "lastWrongAnswer": "对",
  "correctAnswer": "错",
  "status": "open",
  "createdAt": "2026-05-22T00:00:00.000Z",
  "lastWrongAt": "2026-05-22T00:00:00.000Z",
  "solvedAt": ""
}
```

状态枚举：

```text
open 未侦破
reviewing 复习中
solved 已侦破
archived 已归档
```

### 13.5 MasteryState

```json
{
  "userId": "user-001",
  "knowledgePointId": "math.division.remainder-rule",
  "skillId": "skill.remainder.compare-with-divisor",
  "state": "needs_review",
  "correctCount": 2,
  "wrongCount": 1,
  "recentAccuracy": 0.67,
  "lastPracticedAt": "2026-05-22T00:00:00.000Z",
  "evidence": {
    "answerRecordIds": ["answer-001"],
    "wrongRecordIds": ["wrong-001"],
    "bossAttemptIds": []
  }
}
```

状态枚举：

```text
not_started 未开始
learning 学习中
unstable 不稳定
mastered 已掌握
needs_review 需要复习
```

## 14. Badge 勋章 Schema

```json
{
  "badgeId": "badge-case-closer",
  "name": "破案小能手",
  "description": "完成 Boss 并成功结案。",
  "icon": "badge-detective-gold",
  "triggerRule": {
    "type": "case_closed",
    "caseId": "case-carrot-badge"
  },
  "isRepeatable": false
}
```

BadgeRecord：

```json
{
  "badgeRecordId": "badge-record-001",
  "userId": "user-001",
  "badgeId": "badge-case-closer",
  "caseId": "case-carrot-badge",
  "earnedAt": "2026-05-22T00:00:00.000Z",
  "reason": "完成 Boss 并结案"
}
```

## 15. 内容状态与审核字段

所有内容资产建议统一包含：

```json
{
  "status": "draft",
  "createdBy": "",
  "createdAt": "",
  "updatedBy": "",
  "updatedAt": "",
  "review": {
    "contentReviewStatus": "pending",
    "teachingReviewStatus": "pending",
    "readabilityReviewStatus": "pending",
    "approvedBy": "",
    "approvedAt": ""
  }
}
```

状态枚举：

```text
draft 草稿
content_review 内容审核
teaching_review 教研审核
readability_review 儿童可读性审核
approved 已通过
published 已发布
archived 已归档
```

## 16. ID 命名规范

### 16.1 通用规则

- 使用小写英文、数字和短横线。
- 通用知识点可以使用点分层。
- 教材节点包含教材、年级、学期、单元信息。
- 游戏对象使用明确前缀。

### 16.2 示例

```text
subjectId: math
textbookVersionId: bsd
unitId: unit-1-division
curriculumNodeId: bsd.g2.s2.unit1.lesson-remainder-rule
knowledgePointId: math.division.remainder-rule
skillId: skill.remainder.compare-with-divisor
misconceptionId: mis.remainder.greater-than-divisor
caseId: case-carrot-badge
levelId: level-remainder-rule
questionId: q-remainder-rule-001
bossTaskId: boss-carrot-badge-final
knowledgeCardId: card-remainder-rule
```

## 17. v0.2.0 最小落地范围

v0.2.0 不需要一次性实现全部 Schema，但必须先落地以下内容：

```text
manifest.json
textbook.json
knowledge-map.json
case JSON
level JSON
question JSON
knowledge-card JSON
clue JSON
badge JSON
review-rule JSON
```

代码层面至少做到：

- 内容从 `app.js` 抽出。
- 题目补齐教材、知识点、能力点、易错点字段。
- 关卡和知识卡通过 ID 关联。
- Boss 使用独立配置。
- 本地学习记录保留 `contentPackageId` 和 `contentVersion`。

## 18. 后续待细化

以下内容在后续文档中继续展开：

1. JSON Schema 校验文件。
2. 内容包样例。
3. 内容生产流程。
4. 内容审核流程。
5. 前端工程读取内容包的 runtime API。
6. 本地数据迁移策略。
7. 后端数据库表结构。

## 19. 修订记录

| 版本 | 日期 | 说明 |
| --- | --- | --- |
| v0.1.0 | 2026-05-22 | 创建数据模型与内容 Schema 草稿 |
