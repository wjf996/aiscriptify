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
    location = _guess_location(preview)
    time = _guess_time(preview)
    emotion = _guess_emotion(preview)

    scene = {
        "scene_id": f"scene_{chapter_index}",
        "location": location,
        "time": time,
        "characters": character_names,
        "action": preview or "根据本章内容整理动作描述。",
        "dialogues": [
            {
                "character": character_names[0] if character_names else "角色",
                "emotion": emotion,
                "line": _build_dialogue_line(style),
            }
        ],
    }

    if style == "short_drama":
        scene["hook"] = _build_short_drama_hook(preview)
    elif style == "audio_drama":
        scene["narration"] = f"旁白：{preview}" if preview else "旁白：故事在这一刻出现新的转折。"
        scene["sound_effects"] = _guess_sound_effects(preview)
    else:
        scene["shots"] = [
            {
                "shot_id": "shot_1",
                "shot_type": "medium_shot",
                "camera": "平稳推进",
                "description": f"镜头跟随角色进入{location}，突出本章关键线索。",
            }
        ]

    return scene


def _guess_location(text: str) -> str:
    location_keywords = [
        "旧书店",
        "书店",
        "天台",
        "门口",
        "房间",
        "办公室",
        "会议室",
        "公园",
        "街角",
        "走廊",
        "车站",
    ]
    for keyword in location_keywords:
        if keyword in text:
            return keyword
    return "关键场景"


def _guess_time(text: str) -> str:
    time_keywords = ["雨夜", "深夜", "夜晚", "夜里", "清晨", "早晨", "黄昏", "午后", "白天"]
    for keyword in time_keywords:
        if keyword in text:
            return keyword
    if "雨" in text:
        return "雨中"
    return "本章时段"


def _guess_emotion(text: str) -> str:
    if any(keyword in text for keyword in ["突然", "发现", "真相", "秘密"]):
        return "震惊"
    if any(keyword in text for keyword in ["失踪", "烧焦", "雨夜", "残稿"]):
        return "紧张"
    if any(keyword in text for keyword in ["重逢", "回来", "遇见"]):
        return "惊讶"
    return "犹豫"


def _build_dialogue_line(style: str) -> str:
    if style == "short_drama":
        return "这件事不能就这样结束。"
    if style == "audio_drama":
        return "你听见了吗？事情已经变了。"
    return "我们必须把真相弄清楚。"


def _build_short_drama_hook(text: str) -> str:
    if "日记" in text:
        return "日记最后一页露出新的名字，真相被再次推翻。"
    if "秘密" in text or "真相" in text:
        return "一个被隐瞒的秘密浮出水面，迫使角色立刻做出选择。"
    return "本章结尾出现新的反转，推动观众继续追看。"


def _guess_sound_effects(text: str) -> list[str]:
    effects = []
    if "雨" in text:
        effects.append("雨声")
    if "门" in text:
        effects.append("木门开启声")
    if "天台" in text:
        effects.append("高处风声")
    if "日记" in text:
        effects.append("纸页翻动声")
    return effects or ["环境底噪", "脚步声"]
