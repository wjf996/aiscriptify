from pydantic import BaseModel, Field


class ChapterValidationRequest(BaseModel):
    title: str = Field(default="", max_length=120)
    text: str = Field(min_length=1)
    style: str = Field(default="screenplay")


class ChapterInfo(BaseModel):
    index: int
    title: str
    preview: str


class ChapterValidationResponse(BaseModel):
    chapter_count: int
    valid: bool
    chapters: list[ChapterInfo]
    message: str
