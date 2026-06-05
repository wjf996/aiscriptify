# backend

后端计划使用 FastAPI 实现。

主要负责：

- 小说章节数量校验
- 调用 AI 接口生成剧本结构
- 将剧本结构转换为 YAML
- 返回前端所需的转换结果和错误提示

## 本地运行

```bash
pip install -r requirements.txt
uvicorn main:app --reload
```

启动后访问：

```text
http://127.0.0.1:8000/api/health
```

## DeepSeek 配置

后端通过 OpenAI 兼容接口调用 DeepSeek。请在 `backend/.env` 中配置：

```env
LLM_API_KEY=你的 DeepSeek API Key
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-v4-flash
```

其中 `LLM_MODEL` 可按需要切换为其他 DeepSeek 模型。
