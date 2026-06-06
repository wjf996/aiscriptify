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
                    _build_fallback_scene(
                        chapter_index=chapter.index,
                        preview=chapter.preview,
                        character_names=character_names,
                        style=style,
                    )
                ],
            }
            for chapter in chapters
        ],
    }


def _guess_character_names(text: str) -> list[str]:
    candidates = ["林夏", "周远", "沈舟", "张三", "李四", "王五"]
    names = [name for name in candidates if name in text]
    return names or ["角色"]


def _build_fallback_scene(
    chapter_index: int,
    preview: str,
    character_names: list[str],
    style: str,
) -> dict:
    scene = {
        "scene_id": f"scene_{chapter_index}",
        "location": "待补充地点",
        "time": "待补充时间",
        "characters": character_names,
        "action": preview or "根据本章内容整理动作描述。",
        "dialogues": [
            {
                "character": character_names[0] if character_names else "角色",
                "emotion": "待补充情绪",
                "line": "这段对白可由作者继续打磨。",
            }
        ],
    }

    if style == "short_drama":
        scene["hook"] = "在本章结尾补充一个反转或悬念，推动用户继续阅读。"
    elif style == "audio_drama":
        scene["narration"] = "用旁白交代画面中无法听见的信息。"
        scene["sound_effects"] = ["待补充环境音", "待补充动作音效"]
    else:
        scene["shots"] = [
            {
                "shot_id": "shot_1",
                "shot_type": "medium_shot",
                "camera": "平稳推进",
                "description": "根据场景动作补充可拍摄的镜头描述。",
            }
        ]

    return scene
