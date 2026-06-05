import re

from app.models import ChapterInfo

CHAPTER_TITLE_PATTERN = re.compile(
    r"^\s*(第[一二三四五六七八九十百千万零〇两\d]+[章节回幕集]|Chapter\s+\d+|CHAPTER\s+\d+|chapter\s+\d+)[^\n]*",
    re.MULTILINE,
)


def parse_chapters(text: str) -> list[ChapterInfo]:
    matches = list(CHAPTER_TITLE_PATTERN.finditer(text))
    if not matches:
        return []

    chapters: list[ChapterInfo] = []
    for index, match in enumerate(matches):
        start = match.end()
        end = matches[index + 1].start() if index + 1 < len(matches) else len(text)
        title = match.group(0).strip()
        body = text[start:end].strip()
        preview = _compact_preview(body)
        chapters.append(ChapterInfo(index=index + 1, title=title, preview=preview))

    return chapters


def _compact_preview(text: str, max_length: int = 80) -> str:
    compact_text = re.sub(r"\s+", " ", text).strip()
    if len(compact_text) <= max_length:
        return compact_text
    return f"{compact_text[:max_length]}..."
