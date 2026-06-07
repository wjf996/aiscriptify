# aiscriptify

aiscriptify 是一款 AI 小说转剧本工具，面向七牛云 XEngineer 暑期实训营第三批次作品挑战。

## 项目介绍

很多小说作者希望将自己的作品改编成剧本，但从小说叙事转换到剧本结构需要重新整理章节、角色、场景、动作和对白。aiscriptify 通过 AI 辅助，把 3 个章节以上的小说文本转换为结构化 YAML 剧本初稿，让作者可以继续编辑、校验、打磨和导出。

## 目标用户与使用场景

- 小说作者：快速获得可继续修改的剧本初稿。
- 编剧初学者：学习小说到剧本的结构拆解方式。
- 内容创作团队：把长文本故事整理成便于讨论和二次创作的 YAML 结构。

## 核心功能

- 支持粘贴或导入 `.txt` / `.md` 小说文本。
- 实时显示章节数、字数和输入是否满足 3 章要求。
- 调用 DeepSeek 将小说转换为结构化剧本 YAML。
- 支持影视剧、短剧、广播剧三种类型差异化生成。
- 展示章节数、角色数、场景数、角色名称和场景摘要。
- 支持 YAML 预览、编辑、校验、复制和下载。
- 提供 AI 打磨建议，并在 YAML 预览中高亮建议检查位置。
- 生成后自动收起小说输入区，让作者聚焦剧本结果。

## YAML Schema

本项目的剧本输出格式为 YAML。字段定义和设计原因见：

[docs/yaml-schema.md](docs/yaml-schema.md)

核心字段包括：

- `title`
- `script_type`
- `characters`
- `chapters`
- `scenes`
- `dialogues`

可选扩展字段包括：

- `dialogues[].emotion`
- `scenes[].shots`
- `scenes[].hook`
- `scenes[].sound_effects`
- `scenes[].narration`

## 技术栈

- 前端：React、Vite、TypeScript、Mantine
- 后端：FastAPI、Pydantic、PyYAML
- AI：DeepSeek API
- 数据格式：YAML
- 开发流程：GitHub Pull Request 分阶段开发

## 项目结构

```text
aiscriptify
├─ backend
│  ├─ app
│  ├─ tests
│  ├─ main.py
│  └─ requirements.txt
├─ frontend
│  ├─ src
│  ├─ package.json
│  └─ vite.config.ts
├─ docs
│  ├─ README.md
│  ├─ demo-script.md
│  └─ yaml-schema.md
└─ README.md
```

## 运行方式

### 1. 启动后端

```powershell
cd D:\work\aiscriptify\aiscriptify\backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

### 2. 配置 DeepSeek

在 `backend` 目录创建 `.env`：

```env
LLM_API_KEY=你的 DeepSeek API Key
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-v4-pro
LLM_PROXY_URL=
```

如果本地网络需要代理，可以按实际情况填写 `LLM_PROXY_URL`。如果可以直连 DeepSeek，保持为空。

### 3. 启动前端

```powershell
cd D:\work\aiscriptify\aiscriptify\frontend
npm install
npm run dev -- --host 127.0.0.1 --port 5173
```

访问：

```text
http://127.0.0.1:5173/
```

## 测试方式

### 后端测试

```powershell
cd D:\work\aiscriptify\aiscriptify\backend
python -m unittest discover -s tests
```

### 前端构建

```powershell
cd D:\work\aiscriptify\aiscriptify\frontend
npm run build
```

## 开发过程与 PR 记录

本项目按照“一次 PR 只做一件事”的方式分阶段开发，保证每次合并后的 `main` 分支都可运行。

- PR1：初始化项目结构和 README
- PR2：完成前端页面基础布局
- PR3：实现前端输入和 YAML 初稿交互
- PR4：实现后端章节校验和转换接口
- PR5：接入 DeepSeek 生成剧本 YAML
- PR6：完善错误提示和基础体验
- PR7：补充 YAML 校验、统计、角色和场景摘要
- PR8：优化长文本编辑体验
- PR9：视觉美化
- PR10：作者打磨建议
- PR11：小说文件导入
- PR12：YAML 代码预览
- PR13：输入质量实时检测
- PR14：生成过程状态反馈
- PR15：右侧工作区 Tabs 化
- PR16：打磨建议定位高亮
- PR17：生成后聚焦工作台布局
- PR18：剧本类型差异化生成
- PR19：最终文档与提交材料

## AI 辅助说明

本项目使用 AI 工具辅助需求拆解、功能规划、代码实现建议、问题排查和文档优化。项目选题理解、功能取舍、代码整合、运行测试、PR 提交和最终提交材料由本人完成。

项目中的 AI 生成能力用于辅助小说文本转剧本初稿。生成结果定位为可编辑草稿，作者仍需要根据实际作品继续修改、校验和打磨。

## 第三方依赖说明

- React / Vite / TypeScript：前端应用开发。
- Mantine：前端 UI 组件。
- Tabler Icons：图标。
- FastAPI：后端 API 服务。
- Pydantic：请求和响应数据模型。
- PyYAML：YAML 生成和校验。
- httpx：调用 DeepSeek API。

## Demo 视频

Demo 视频链接：[aiscriptify 演示视频](https://www.bilibili.com/video/BV1pLEJ6zEFj/)
讲解脚本见：

[docs/demo-script.md](docs/demo-script.md)

## 后续计划

- 增加更细的剧本完整度评分。
- 增加导出前确认和交付状态提示。
- 在 Schema 文档基础上补充更多示例。
- 支持更多剧本类型或更细的风格参数。
