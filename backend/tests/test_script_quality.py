import unittest

from app.script_quality import (
    count_script_characters,
    count_script_scenes,
    extract_character_names,
    extract_scene_summaries,
    validate_yaml_text,
)


class ScriptQualityTest(unittest.TestCase):
    def test_counts_characters_and_scenes(self) -> None:
        script = {
            "characters": [
                {"name": "林夏"},
                {"name": "周远"},
                {"name": "林夏"},
            ],
            "chapters": [
                {"scenes": [{"scene_id": "scene_1"}, {"scene_id": "scene_2"}]},
                {"scenes": [{"scene_id": "scene_3"}]},
            ],
        }

        self.assertEqual(count_script_characters(script), 2)
        self.assertEqual(count_script_scenes(script), 3)

    def test_extracts_unique_character_names_in_order(self) -> None:
        script = {
            "characters": [
                {"name": "林夏"},
                "周远",
                {"name": "林夏"},
                {"name": "沈舟"},
            ]
        }

        self.assertEqual(extract_character_names(script), ["林夏", "周远", "沈舟"])

    def test_extracts_scene_summaries_with_limit(self) -> None:
        script = {
            "chapters": [
                {
                    "scenes": [
                        {"scene_id": "scene_1", "location": "旧书店门口/店内", "time": "雨夜"},
                        {"scene_id": "scene_2", "location": "天台", "time": "夜晚"},
                    ]
                },
                {
                    "scenes": [
                        {"scene_id": "scene_3", "location": "待补充地点", "time": "待补充时间"},
                        {"scene_id": "scene_4", "location": "街角"},
                    ]
                },
            ]
        }

        self.assertEqual(
            extract_scene_summaries(script, limit=3),
            ["旧书店门口/店内 · 雨夜", "天台 · 夜晚", "scene_3"],
        )

    def test_validates_yaml_text(self) -> None:
        valid, error = validate_yaml_text("title: 测试\nchapters: []\n")

        self.assertTrue(valid)
        self.assertEqual(error, "")

    def test_rejects_invalid_yaml_text(self) -> None:
        valid, error = validate_yaml_text("title: 测试\n  chapters: []\n")

        self.assertFalse(valid)
        self.assertTrue(error)


if __name__ == "__main__":
    unittest.main()
