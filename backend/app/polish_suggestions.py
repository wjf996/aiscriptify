import json
import time

from fastapi import HTTPException
import httpx

from app.ai_client import extract_json_object
from app.config import settings


def generate_polish_suggestions(yaml_text: str) -> tuple[list[dict[str, str]], str, list[str]]:
    warnings: list[str] = []
    try:
        suggestions = request_ai_polish_suggestions(yaml_text)
        return suggestions, "ai", warnings
    except HTTPException as exc:
        warnings.append(f"AI 打磨建议生成失败，已使用规则兜底建议：{exc.detail}")
        return build_fallback_polish_suggestions(yaml_text), "fallback", warnings


def request_ai_polish_suggestions(yaml_text: str) -> list[dict[str, str]]:
    if not settings.llm_api_key:
        raise HTTPException(status_code=500, detail="后端缺少 LLM_API_KEY，请先配置 DeepSeek API Key")

    messages = [
        {
            "role": "system",
            "content": "Return compact valid JSON only. Do not use Markdown. Use Simplified Chinese.",
        },
        {
            "role": "user",
            "content": build_polish_prompt(yaml_text),
        },
    ]

    last_error: httpx.HTTPError | None = None
    for attempt in range(3):
        try:
            response = httpx.post(
                f"{settings.llm_base_url.rstrip('/')}/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.llm_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": settings.llm_model,
                    "messages": messages,
                    "temperature": 0.3,
                    "max_tokens": 1200,
                },
                proxy=settings.llm_proxy_url or None,
                timeout=90,
            )
            break
        except httpx.HTTPError as exc:
            last_error = exc
            if attempt < 2:
                time.sleep(1)
    else:
        raise HTTPException(status_code=502, detail=f"AI 接口连接失败：{last_error}") from last_error

    if response.status_code >= 400:
        raise HTTPException(status_code=502, detail=f"AI 接口返回错误：{response.text[:300]}")

    content = response.json().get("choices", [{}])[0].get("message", {}).get("content")
    if not content:
        raise HTTPException(status_code=502, detail="AI 返回内容为空")

    try:
        data = json.loads(extract_json_object(content))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail="AI 返回内容不是有效 JSON") from exc

    suggestions = data.get("suggestions")
    if not isinstance(suggestions, list) or not suggestions:
        raise HTTPException(status_code=502, detail="AI 返回的建议结构不完整")

    normalized = [_normalize_suggestion(item) for item in suggestions]
    return [item for item in normalized if item["category"] and item["suggestion"]][:6]


def build_polish_prompt(yaml_text: str) -> str:
    return f"""
You are an assistant for novel-to-screenplay adaptation.
Analyze this screenplay YAML draft and return 4 concise polish suggestions.
Return JSON object only:
{{
  "suggestions": [
    {{"category": "角色动机", "suggestion": "..."}},
    {{"category": "场景冲突", "suggestion": "..."}},
    {{"category": "对白语气", "suggestion": "..."}},
    {{"category": "节奏结构", "suggestion": "..."}}
  ]
}}
Do not rewrite the YAML. Suggestions must be practical for the author to edit manually.
Use Simplified Chinese for every category and suggestion.
If the YAML draft contains English-translated names, locations, summaries, or dialogue, point out that they should be rewritten in Chinese.

YAML draft:
{yaml_text[:5000]}
""".strip()


def build_fallback_polish_suggestions(yaml_text: str) -> list[dict[str, str]]:
    has_dialogue = "dialogues:" in yaml_text or "line:" in yaml_text or "speaker:" in yaml_text
    dialogue_tip = (
        "为每个主要角色设计不同说话习惯，避免所有对白语气过于相似。"
        if has_dialogue
        else "当前剧本对白信息较少，可以为关键场景补充角色对白，增强戏剧张力。"
    )

    return [
        {
            "category": "角色动机",
            "suggestion": "检查主角在每一章中的目标是否清楚，并补充角色为什么必须采取行动。",
        },
        {
            "category": "场景冲突",
            "suggestion": "为每个场景补充阻碍、误会或选择压力，让场景不只是叙事过渡。",
        },
        {
            "category": "对白语气",
            "suggestion": dialogue_tip,
        },
        {
            "category": "节奏结构",
            "suggestion": "检查每章是否都有推进剧情的信息，结尾可以加入悬念或转折，方便继续改编。",
        },
    ]


def _normalize_suggestion(value: object) -> dict[str, str]:
    if not isinstance(value, dict):
        return {"category": "", "suggestion": ""}

    return {
        "category": str(value.get("category", "")).strip(),
        "suggestion": str(value.get("suggestion", "")).strip(),
    }
