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
