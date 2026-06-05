from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from fastapi import HTTPException

from app.ai_client import convert_novel_to_script
from app.chapter_parser import parse_chapters
from app.config import settings
from app.fallback_script import build_fallback_script
from app.models import (
    ChapterValidationRequest,
    ChapterValidationResponse,
    ScriptConversionRequest,
    ScriptConversionResponse,
)
from app.yaml_builder import build_script_yaml

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/chapters/validate")
def validate_chapters(request: ChapterValidationRequest) -> ChapterValidationResponse:
    chapters = parse_chapters(request.text)
    chapter_count = len(chapters)
    valid = chapter_count >= 3
    message = "章节校验通过" if valid else "请至少输入 3 个章节的小说文本"

    return ChapterValidationResponse(
        chapter_count=chapter_count,
        valid=valid,
        chapters=chapters,
        message=message,
    )


@app.post("/api/convert")
def convert_script(request: ScriptConversionRequest) -> ScriptConversionResponse:
    chapters = parse_chapters(request.text)
    chapter_count = len(chapters)
    if chapter_count < 3:
        return ScriptConversionResponse(
            chapter_count=chapter_count,
            script={},
            yaml="",
            warnings=["请至少输入 3 个章节的小说文本"],
        )

    warnings: list[str] = []
    try:
        script = convert_novel_to_script(title=request.title, text=request.text, style=request.style)
    except HTTPException as exc:
        script = build_fallback_script(title=request.title, text=request.text, style=request.style)
        warnings.append(f"AI 调用失败，已生成规则兜底剧本草稿：{exc.detail}")

    script_yaml = build_script_yaml(script)
    return ScriptConversionResponse(
        chapter_count=chapter_count,
        script=script,
        yaml=script_yaml,
        warnings=warnings,
    )
