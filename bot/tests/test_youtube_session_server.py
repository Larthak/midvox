import importlib.util
import json
import subprocess
import unittest
from pathlib import Path
from unittest.mock import patch


SOURCE = Path(__file__).resolve().parents[2] / "docker/youtube_session_server.py"
SPEC = importlib.util.spec_from_file_location("youtube_session_server_test", SOURCE)
SERVER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(SERVER)


class YouTubeSessionServerTests(unittest.TestCase):
    def setUp(self):
        SERVER._cached.clear()

    def test_explicit_content_binding_is_used_for_yt_dlp(self):
        completed = subprocess.CompletedProcess(
            [], 0, stdout=json.dumps({"poToken": "token"})
        )
        with patch.object(SERVER, "_visitor_data") as visitor, \
             patch.object(SERVER.subprocess, "run", return_value=completed) as run:
            result = SERVER._generate("video-id", "")
        visitor.assert_not_called()
        command = run.call_args.args[0]
        self.assertEqual(command[command.index("--content-binding") + 1], "video-id")
        self.assertEqual(result["contentBinding"], "video-id")
        self.assertEqual(result["poToken"], "token")

    def test_empty_binding_fetches_the_default_visitor_data(self):
        completed = subprocess.CompletedProcess(
            [], 0, stdout=json.dumps({"po_token": "token"})
        )
        with patch.object(SERVER, "_visitor_data", return_value="visitor") as visitor, \
             patch.object(SERVER.subprocess, "run", return_value=completed):
            result = SERVER._generate("", "")
        visitor.assert_called_once_with("")
        self.assertEqual(result["visitor_data"], "visitor")

    def test_tokens_are_cached_per_content_binding(self):
        now = int(SERVER.time.time())

        def generate(binding, proxy):
            return {"poToken": binding or "default", "updated": now}

        with patch.object(SERVER, "_generate", side_effect=generate) as mint:
            first = SERVER.session("video-a", "", force=True)
            again = SERVER.session("video-a", "")
            other = SERVER.session("video-b", "")
        self.assertIs(first, again)
        self.assertNotEqual(first, other)
        self.assertEqual(mint.call_count, 2)

    def test_force_bypasses_the_cached_token(self):
        now = int(SERVER.time.time())
        with patch.object(SERVER, "_generate", side_effect=[
            {"poToken": "one", "updated": now},
            {"poToken": "two", "updated": now},
        ]) as mint:
            first = SERVER.session("video", "", force=True)
            second = SERVER.session("video", "", force=True)
        self.assertEqual(first["poToken"], "one")
        self.assertEqual(second["poToken"], "two")
        self.assertEqual(mint.call_count, 2)


if __name__ == "__main__":
    unittest.main()
