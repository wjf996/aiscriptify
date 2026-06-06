import unittest

from app.fallback_script import build_fallback_script


class FallbackScriptTest(unittest.TestCase):
    def test_screenplay_fallback_adds_shots(self) -> None:
        script = build_fallback_script("雨夜残稿", "第一章 雨夜归来\n林夏回到旧书店。", "screenplay")

        scene = script["chapters"][0]["scenes"][0]
        self.assertEqual(script["script_type"], "screenplay")
        self.assertIn("shots", scene)
        self.assertIn("emotion", scene["dialogues"][0])

    def test_short_drama_fallback_adds_hook(self) -> None:
        script = build_fallback_script("雨夜残稿", "第一章 雨夜归来\n林夏回到旧书店。", "short_drama")

        scene = script["chapters"][0]["scenes"][0]
        self.assertEqual(script["script_type"], "short_drama")
        self.assertIn("hook", scene)

    def test_fallback_infers_location_time_and_emotion(self) -> None:
        script = build_fallback_script(
            "雨夜残稿",
            "第一章 雨夜归来\n林夏在雨夜回到旧书店，发现一本烧焦的日记。",
            "short_drama",
        )

        scene = script["chapters"][0]["scenes"][0]
        dialogue = scene["dialogues"][0]
        self.assertEqual(scene["location"], "旧书店")
        self.assertEqual(scene["time"], "雨夜")
        self.assertNotIn("待补充", dialogue["emotion"])
        self.assertNotIn("待补充", scene["hook"])

    def test_audio_drama_fallback_adds_audio_fields(self) -> None:
        script = build_fallback_script("雨夜残稿", "第一章 雨夜归来\n林夏回到旧书店。", "audio_drama")

        scene = script["chapters"][0]["scenes"][0]
        self.assertEqual(script["script_type"], "audio_drama")
        self.assertIn("narration", scene)
        self.assertIn("sound_effects", scene)

    def test_audio_drama_fallback_infers_sound_effects(self) -> None:
        script = build_fallback_script(
            "雨夜残稿",
            "第一章 雨夜归来\n雨夜里，林夏推开旧书店的门，翻开烧焦的日记。",
            "audio_drama",
        )

        scene = script["chapters"][0]["scenes"][0]
        self.assertIn("雨声", scene["sound_effects"])
        self.assertIn("木门开启声", scene["sound_effects"])
        self.assertIn("纸页翻动声", scene["sound_effects"])


if __name__ == "__main__":
    unittest.main()
