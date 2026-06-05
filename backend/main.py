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
    PolishSuggestionRequest,
    PolishSuggestionResponse,
    ScriptConversionRequest,
    ScriptConversionResponse,
    YamlValidationRequest,
    YamlValidationResponse,
)
from app.polish_suggestions import generate_polish_suggestions
from app.script_quality import (
    count_script_characters,
    count_script_scenes,
    extract_character_names,
    extract_scene_summaries,
    validate_yaml_text,
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
            character_count=0,
            scene_count=0,
            character_names=[],
            scene_summaries=[],
            script={},
            yaml="",
            yaml_valid=False,
            yaml_error="小说文本章节数不足，暂未生成 YAML",
            warnings=["请至少输入 3 个章节的小说文本"],
        )

    warnings: list[str] = []
    try:
        script = convert_novel_to_script(title=request.title, text=request.text, style=request.style)
    except HTTPException as exc:
        script = build_fallback_script(title=request.title, text=request.text, style=request.style)
        warnings.append(f"AI 暂时不可用，已生成规则兜底草稿。你仍然可以继续编辑、校验和导出 YAML。原因：{exc.detail}")

    script_yaml = build_script_yaml(script)
    yaml_valid, yaml_error = validate_yaml_text(script_yaml)
    return ScriptConversionResponse(
        chapter_count=chapter_count,
        character_count=count_script_characters(script),
        scene_count=count_script_scenes(script),
        character_names=extract_character_names(script),
        scene_summaries=extract_scene_summaries(script),
        script=script,
        yaml=script_yaml,
        yaml_valid=yaml_valid,
        yaml_error=yaml_error,
        warnings=warnings,
    )


@app.post("/api/yaml/validate")
def validate_yaml(request: YamlValidationRequest) -> YamlValidationResponse:
    yaml_valid, yaml_error = validate_yaml_text(request.yaml)
    return YamlValidationResponse(
        valid=yaml_valid,
        message="YAML 校验通过" if yaml_valid else yaml_error,
    )


@app.post("/api/polish/suggestions")
def polish_suggestions(request: PolishSuggestionRequest) -> PolishSuggestionResponse:
    suggestions, source, warnings = generate_polish_suggestions(request.yaml)
    return PolishSuggestionResponse(
        suggestions=suggestions,
        source=source,
        warnings=warnings,
    )
