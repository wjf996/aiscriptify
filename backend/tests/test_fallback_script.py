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

    def test_audio_drama_fallback_adds_audio_fields(self) -> None:
        script = build_fallback_script("雨夜残稿", "第一章 雨夜归来\n林夏回到旧书店。", "audio_drama")

        scene = script["chapters"][0]["scenes"][0]
        self.assertEqual(script["script_type"], "audio_drama")
        self.assertIn("narration", scene)
        self.assertIn("sound_effects", scene)


if __name__ == "__main__":
    unittest.main()
