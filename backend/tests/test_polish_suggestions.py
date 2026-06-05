import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from app.polish_suggestions import build_fallback_polish_suggestions
from main import app


class PolishSuggestionsTest(unittest.TestCase):
    def test_builds_fallback_suggestions(self) -> None:
        suggestions = build_fallback_polish_suggestions("title: 测试\nchapters: []\n")

        self.assertEqual(len(suggestions), 4)
        self.assertEqual(suggestions[0]["category"], "角色动机")
        self.assertTrue(suggestions[0]["suggestion"])

    def test_polish_endpoint_returns_suggestions(self) -> None:
        with patch(
            "main.generate_polish_suggestions",
            return_value=(
                [{"category": "角色动机", "suggestion": "补充主角目标。"}],
                "fallback",
                ["使用规则兜底建议"],
            ),
        ):
            response = TestClient(app).post(
                "/api/polish/suggestions",
                json={"yaml": "title: 测试\nchapters: []\n"},
            )

        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["source"], "fallback")
        self.assertEqual(data["suggestions"][0]["category"], "角色动机")
        self.assertEqual(data["warnings"], ["使用规则兜底建议"])


if __name__ == "__main__":
    unittest.main()
