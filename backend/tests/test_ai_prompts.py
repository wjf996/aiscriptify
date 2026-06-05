import unittest

from app.ai_client import build_prompt
from app.polish_suggestions import build_polish_prompt


class AiPromptTest(unittest.TestCase):
    def test_conversion_prompt_requires_chinese_values(self) -> None:
        prompt = build_prompt("雨夜归来", "第一章\n林夏回到旧书店。", "screenplay")

        self.assertIn("Simplified Chinese", prompt)
        self.assertIn("Do not translate Chinese character names", prompt)

    def test_polish_prompt_requires_chinese_suggestions(self) -> None:
        prompt = build_polish_prompt("title: Untitled\nchapters: []\n")

        self.assertIn("Simplified Chinese", prompt)
        self.assertIn("rewritten in Chinese", prompt)


if __name__ == "__main__":
    unittest.main()
