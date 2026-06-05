import yaml


def count_script_characters(script: dict) -> int:
    return len(extract_character_names(script))


def extract_character_names(script: dict) -> list[str]:
    characters = script.get("characters")
    if not isinstance(characters, list):
        return []

    names: list[str] = []
    seen_names: set[str] = set()
    for character in characters:
        name = ""
        if isinstance(character, dict):
            name = str(character.get("name", "")).strip()
        elif isinstance(character, str) and character.strip():
            name = character.strip()

        if name and name not in seen_names:
            names.append(name)
            seen_names.add(name)

    return names


def count_script_scenes(script: dict) -> int:
    chapters = script.get("chapters")
    if not isinstance(chapters, list):
        return 0

    scene_count = 0
    for chapter in chapters:
        if not isinstance(chapter, dict):
            continue
        scenes = chapter.get("scenes")
        if isinstance(scenes, list):
            scene_count += len(scenes)

    return scene_count


def extract_scene_summaries(script: dict, limit: int = 6) -> list[str]:
    chapters = script.get("chapters")
    if not isinstance(chapters, list):
        return []

    summaries: list[str] = []
    for chapter in chapters:
        if not isinstance(chapter, dict):
            continue
        scenes = chapter.get("scenes")
        if not isinstance(scenes, list):
            continue
        for scene in scenes:
            if not isinstance(scene, dict):
                continue
            summary = _format_scene_summary(scene)
            if summary:
                summaries.append(summary)
            if len(summaries) >= limit:
                return summaries

    return summaries


def _format_scene_summary(scene: dict) -> str:
    location = _clean_scene_part(scene.get("location", ""))
    time = _clean_scene_part(scene.get("time", ""))
    scene_id = str(scene.get("scene_id", "")).strip()

    if location and time:
        return f"{location} · {time}"
    if location:
        return location
    if time:
        return time
    return scene_id


def _clean_scene_part(value: object) -> str:
    text = str(value).strip()
    if text in {"待补充地点", "待补充时间"}:
        return ""
    return text


def validate_yaml_text(yaml_text: str) -> tuple[bool, str]:
    try:
        loaded = yaml.safe_load(yaml_text)
    except yaml.YAMLError as exc:
        return False, str(exc)

    if not isinstance(loaded, dict):
        return False, "YAML 顶层结构必须是对象"

    return True, ""
