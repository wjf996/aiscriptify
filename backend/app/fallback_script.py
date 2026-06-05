from app.chapter_parser import parse_chapters


def build_fallback_script(title: str, text: str, style: str) -> dict:
    chapters = parse_chapters(text)
    character_names = _guess_character_names(text)

    return {
        "title": title or "未命名小说",
        "script_type": style,
        "characters": [
            {"name": name, "description": "根据小说文本识别出的主要角色"}
            for name in character_names
        ],
        "chapters": [
            {
                "chapter_title": chapter.title,
                "summary": chapter.preview or "本章剧情待作者继续补充。",
                "scenes": [
                    {
                        "scene_id": f"scene_{chapter.index}",
                        "location": "待补充地点",
                        "time": "待补充时间",
                        "characters": character_names,
                        "action": chapter.preview or "根据本章内容整理动作描述。",
                        "dialogues": [
                            {
                                "character": character_names[0] if character_names else "角色",
                                "line": "这段对白可由作者继续打磨。",
                            }
                        ],
                    }
                ],
            }
            for chapter in chapters
        ],
    }


def _guess_character_names(text: str) -> list[str]:
    candidates = ["林夏", "周远", "张三", "李四", "王五"]
    names = [name for name in candidates if name in text]
    return names or ["角色"]
