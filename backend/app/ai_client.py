import json
import re
import time

from fastapi import HTTPException
import httpx

from app.chapter_parser import parse_chapters
from app.config import settings


def convert_novel_to_script(title: str, text: str, style: str) -> dict:
    if not settings.llm_api_key:
        raise HTTPException(status_code=500, detail="后端缺少 LLM_API_KEY，请先配置 DeepSeek API Key")

    messages = [
        {
            "role": "system",
            "content": (
                "Return one compact valid JSON object only. Do not use Markdown, code fences, "
                "comments, explanations, or any text before or after the JSON object. "
                "Keep the answer short. Use Simplified Chinese for all user-facing values."
            ),
        },
        {
            "role": "user",
            "content": build_prompt(title=title, text=compact_novel_text(text), style=style),
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
                    "temperature": 0.2,
                    "max_tokens": 2000,
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

    data = response.json()
    content = data.get("choices", [{}])[0].get("message", {}).get("content")
    if not content:
        raise HTTPException(status_code=502, detail="AI 返回内容为空")

    try:
        return json.loads(extract_json_object(content))
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=502, detail="AI 返回内容不是有效 JSON") from exc


def extract_json_object(content: str) -> str:
    cleaned = content.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)

    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end == -1 or end <= start:
        return cleaned
    return cleaned[start : end + 1]


def compact_novel_text(text: str) -> str:
    chapters = parse_chapters(text)
    if not chapters:
        return text[:600]

    return "\n\n".join(f"{chapter.title}\n{chapter.preview}" for chapter in chapters[:6])


def build_style_guidance(style: str) -> str:
    if style == "short_drama":
        return """
Style guidance for short_drama:
- Write faster-paced scenes with clear conflict, reversal, and emotional hooks.
- Prefer adding dialogues[].emotion and at least one scenes[].hook.
- Use hook to describe the cliffhanger or reversal.
- Keep dialogue short, direct, and suitable for short-video drama rhythm.
""".strip()

    if style == "audio_drama":
        return """
Style guidance for audio_drama:
- Emphasize narration, sound effects, and dialogue that can be understood without visuals.
- Prefer adding at least one scenes[].narration and scenes[].sound_effects.
- Make action descriptions audible or explain them through narration.
""".strip()

    return """
Style guidance for screenplay:
- Emphasize visual action, blocking, and camera-friendly scene description.
- Prefer adding dialogues[].emotion and at least one scenes[].shots.
- Use shots for simple shot suggestions when useful.
""".strip()


def build_prompt(title: str, text: str, style: str) -> str:
    style_guidance = build_style_guidance(style)

    return f"""
Convert this 3+ chapter novel into a short editable screenplay draft.
Return one JSON object with these keys: title, script_type, characters, chapters.
Each chapter must have: chapter_title, summary, scenes.
Each scene must have: scene_id, location, time, characters, action, dialogues.
Use at most one scene and one dialogue per chapter.
Return valid JSON only. Do not include Markdown fences, comments, or explanatory text.
Optional extension fields are allowed when they fit the selected script type:
- dialogues[].emotion for facial expression or speaking emotion.
- scenes[].shots for screenplay shot suggestions.
- scenes[].hook for short drama cliffhangers or reversals.
- scenes[].sound_effects and scenes[].narration for audio drama.
For the selected script type, try to include its recommended extension fields at least once.
Important language rules:
- Keep JSON/YAML keys in English exactly as requested.
- All values that authors read must be Simplified Chinese.
- Do not translate Chinese character names into English or pinyin.
- location, time, action, summary, dialogue lines, and character names must be Chinese.
- Infer location, time, and emotion from the novel text whenever possible. Avoid placeholder values like 待补充地点, 待补充时间, or 待补充情绪.

Title: {title or "Untitled"}
Script type: {style}
{style_guidance}
Novel:
{text}
""".strip()
