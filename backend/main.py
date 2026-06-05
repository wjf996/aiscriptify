from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.chapter_parser import parse_chapters
from app.config import settings
from app.models import ChapterValidationRequest, ChapterValidationResponse

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
