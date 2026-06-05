import json

from fastapi import HTTPException
from openai import OpenAI, OpenAIError

from app.config import settings


def convert_novel_to_script(title: str, text: str, style: str) -> dict:
    if not settings.llm_api_key:
        raise HTTPException(status_code=500, detail="后端缺少 LLM_API_KEY，请先配置 DeepSeek API Key")

    client = OpenAI(api_key=settings.llm_api_key, base_url=settings.llm_base_url)

    messages = [
        {
            "role": "system",
            "content": (
                "你是一个小说改编剧本助手。请把多章节小说改编为结构化剧本初稿。"
                "必须只返回 JSON，不要返回 Markdown，不要添加解释文字。"
            ),
        },
        {
            "role": "user",
            "content": build_prompt(title=title, text=text, style=style),
        },
    ]

    try:
        try:
            response = client.chat.completions.create(
                model=settings.llm_model,
                messages=messages,
                temperature=0.4,
                response_format={"type": "json_object"},
            )
        except OpenAIError:
            response = client.chat.completions.create(
                model=settings.llm_model,
                messages=messages,
                temperature=0.4,
            )
    except OpenAIError as exc:
        raise HTTPException(status_code=502, detail=f"AI 接口调用失败：{exc}") from exc

    content = response.choices[0].message.content
    if not content:
        raise HTTPException(status_code=502, detail="AI 返回内容为空")

    try:
        return json.loads(content)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail="AI 返回内容不是有效 JSON") from exc


def build_prompt(title: str, text: str, style: str) -> str:
    return f"""
作品标题：{title or "未命名小说"}
剧本类型：{style}

请根据小说文本生成剧本初稿 JSON，结构必须包含：
- title: 作品标题
- script_type: 剧本类型
- characters: 角色数组，每项包含 name 和 description
- chapters: 章节数组，每项包含 chapter_title、summary、scenes
- scenes: 场景数组，每项包含 scene_id、location、time、characters、action、dialogues
- dialogues: 对白数组，每项包含 character 和 line

要求：
1. 保留原小说的章节脉络。
2. 将叙事内容整理为场景、动作描述和对白。
3. 输出应是可继续编辑和打磨的剧本初稿。
4. 只返回 JSON。

小说文本：
{text}
""".strip()
