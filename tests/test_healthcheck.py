import unittest

from tools.healthcheck import validate_config


class ValidateConfigTests(unittest.TestCase):
    def test_accepts_valid_config(self) -> None:
        cfg = {
            "web_app_url": "https://script.google.com/macros/s/deployment-id/exec",
            "tag_map": {
                "todo": "TODO",
                "misc": "Miscellany",
            },
        }
        self.assertEqual(validate_config(cfg), [])

    def test_rejects_missing_web_app_url(self) -> None:
        cfg = {"tag_map": {"todo": "TODO"}}
        errors = validate_config(cfg)
        self.assertTrue(any("web_app_url is missing" in error for error in errors))

    def test_rejects_placeholder_web_app_url(self) -> None:
        cfg = {
            "web_app_url": "https://script.google.com/macros/s/<YOUR_DEPLOYMENT_ID>/exec",
            "tag_map": {"todo": "TODO"},
        }
        errors = validate_config(cfg)
        self.assertTrue(any("placeholder text" in error for error in errors))

    def test_rejects_invalid_tag_map_entries(self) -> None:
        cfg = {
            "web_app_url": "https://script.google.com/macros/s/deployment-id/exec",
            "tag_map": {"bad:key": "", "": "Ideas"},
        }
        errors = validate_config(cfg)
        self.assertGreaterEqual(len(errors), 2)


if __name__ == "__main__":
    unittest.main()
