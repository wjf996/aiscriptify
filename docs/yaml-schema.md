# 剧本 YAML Schema

本文档定义 aiscriptify 输出的剧本 YAML 结构，并说明该 Schema 的设计原因。

## 设计目标

aiscriptify 的输出不是最终成片剧本，而是给小说作者继续编辑和打磨的结构化初稿。因此 Schema 需要同时满足：

- 可读：作者能快速理解每个字段含义。
- 可编辑：普通文本编辑器即可修改。
- 可扩展：不同剧本类型可以加入不同专业字段。
- 可校验：后端和前端可以对基础结构做检查。
- 适合 AI 生成：字段不能过度复杂，避免模型输出不稳定。

## 顶层结构

```yaml
title: 雨夜残稿
script_type: screenplay
characters:
  - name: 林夏
    description: 回到旧书店寻找真相的小说作者。
chapters:
  - chapter_title: 第一章 雨夜归来
    summary: 林夏在雨夜回到旧书店，发现失踪三年的周远坐在柜台后。
    scenes:
      - scene_id: scene_1
        location: 旧书店门口及店内
        time: 雨夜
        characters:
          - 林夏
          - 周远
        action: 林夏推门进入旧书店，看见周远手中拿着一本烧焦的日记。
        dialogues:
          - speaker: 林夏
            emotion: 惊讶
            line: 你什么时候回来的？
```

## 字段定义

### `title`

- 类型：string
- 必填：是
- 含义：剧本标题。

设计原因：标题是作者识别作品和导出文件名的基础字段。

### `script_type`

- 类型：string
- 必填：是
- 可选值：`screenplay`、`short_drama`、`audio_drama`
- 含义：剧本类型。

设计原因：不同剧本类型对内容侧重点不同。影视剧偏画面和镜头，短剧偏节奏和反转，广播剧偏旁白和音效。

### `characters`

- 类型：array
- 必填：是
- 含义：全剧主要角色列表。

推荐结构：

```yaml
characters:
  - name: 林夏
    description: 回到旧书店寻找真相的小说作者。
```

设计原因：角色是剧本改编的核心信息。将角色放在顶层，方便作者快速检查人物是否遗漏。

### `chapters`

- 类型：array
- 必填：是
- 含义：由小说章节转换出的剧本章节。

推荐结构：

```yaml
chapters:
  - chapter_title: 第一章 雨夜归来
    summary: 本章剧情摘要。
    scenes: []
```

设计原因：题目要求处理 3 个章节以上的小说文本，因此 Schema 保留章节层级，方便作者对照原小说结构继续修改。

### `chapter_title`

- 类型：string
- 必填：是
- 含义：章节标题。

设计原因：保留章节标题可以让作者快速定位原文对应内容。

### `summary`

- 类型：string
- 必填：建议填写
- 含义：章节剧情摘要。

设计原因：摘要帮助作者快速理解每章转换结果，也方便后续打磨剧情节奏。

### `scenes`

- 类型：array
- 必填：是
- 含义：章节内的场景列表。

推荐结构：

```yaml
scenes:
  - scene_id: scene_1
    location: 旧书店
    time: 雨夜
    characters:
      - 林夏
      - 周远
    action: 林夏推门进入旧书店。
    dialogues: []
```

设计原因：剧本以场景为基本组织单位。小说的心理描写和叙事段落需要转换为地点、时间、动作和对白。

### `scene_id`

- 类型：string
- 必填：是
- 含义：场景标识。

设计原因：场景标识方便后续做定位、编辑、打磨建议和导出。

### `location`

- 类型：string
- 必填：建议填写
- 含义：场景发生地点。

设计原因：地点是影视化和广播剧改编的重要信息，也能帮助作者检查场景是否清晰。

### `time`

- 类型：string
- 必填：建议填写
- 含义：场景发生时间。

设计原因：时间信息有助于建立氛围和连续性。

### `action`

- 类型：string
- 必填：建议填写
- 含义：场景动作或画面描述。

设计原因：小说中的叙事需要转化为可表演、可拍摄或可听见的动作描述。

### `dialogues`

- 类型：array
- 必填：建议填写
- 含义：场景对白列表。

推荐结构：

```yaml
dialogues:
  - speaker: 林夏
    emotion: 惊讶
    line: 你什么时候回来的？
```

设计原因：对白是剧本区别于小说的重要部分。`speaker` 标识说话人，`line` 存储台词，`emotion` 为可选字段，用于提示表演状态。

## 可选扩展字段

### `dialogues[].emotion`

- 类型：string
- 适用类型：影视剧、短剧、广播剧
- 含义：角色说话时的神情或情绪。

设计原因：神情和情绪可以帮助作者进一步打磨台词表演状态，但不是每句台词都必须填写。

### `scenes[].shots`

- 类型：array
- 适用类型：影视剧
- 含义：镜头或分镜建议。

示例：

```yaml
shots:
  - shot_id: shot_1
    shot_type: close_up
    camera: 推近
    description: 林夏看见烧焦日记，神情僵住。
```

设计原因：影视剧需要画面调度。将分镜作为可选扩展字段，可以增强专业感，同时避免基础 Schema 过重。

### `scenes[].hook`

- 类型：string
- 适用类型：短剧
- 含义：场景或章节结尾的反转、悬念或情绪钩子。

设计原因：短剧更强调节奏和连续观看动力，`hook` 可以帮助作者检查每段剧情是否有推进力。

### `scenes[].sound_effects`

- 类型：array
- 适用类型：广播剧
- 含义：音效提示。

示例：

```yaml
sound_effects:
  - 雨声
  - 木门被推开的吱呀声
```

设计原因：广播剧主要依靠声音传递场景信息，音效可以补足缺少画面的表达。

### `scenes[].narration`

- 类型：string
- 适用类型：广播剧
- 含义：旁白。

设计原因：广播剧需要通过旁白解释视觉信息、心理状态或场景转换。

## 为什么字段名使用英文

本项目保留英文 YAML 字段名，例如 `title`、`characters`、`scenes`、`dialogues`，原因如下：

- 英文字段更适合程序解析和后续扩展。
- 与常见 JSON / YAML API 命名习惯一致。
- 可以减少中文字段在不同编码环境下的兼容风险。
- 页面和文档提供中文解释，作者仍然可以理解字段含义。

因此，本项目采用“英文字段名 + 中文内容值 + 中文文档说明”的设计。

## 完整示例

```yaml
title: 雨夜残稿
script_type: screenplay
characters:
  - name: 林夏
    description: 回到旧书店寻找真相的小说作者。
  - name: 周远
    description: 失踪三年后重新出现的旧友。
chapters:
  - chapter_title: 第一章 雨夜归来
    summary: 林夏在雨夜回到旧书店，发现周远正在翻看烧焦的日记。
    scenes:
      - scene_id: scene_1
        location: 旧书店
        time: 雨夜
        characters:
          - 林夏
          - 周远
        action: 林夏推开门，雨水顺着衣角落下，周远从柜台后抬起头。
        shots:
          - shot_id: shot_1
            shot_type: close_up
            camera: 推近
            description: 镜头靠近烧焦日记的边缘。
        dialogues:
          - speaker: 林夏
            emotion: 惊讶
            line: 你什么时候回来的？
```
