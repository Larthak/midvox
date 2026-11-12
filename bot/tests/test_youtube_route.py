"""Verify the yt-dlp options used for the YouTube Shorts route."""
import ast
import os
import sys
import tempfile
import time
import types
import unittest
from pathlib import Path
from unittest.mock import patch

from media_quality import source_cap

SOURCE = Path(__file__).resolve().parents[1] / "cogs/commands/insta_downloader.py"
TREE = ast.parse(SOURCE.read_text(encoding="utf-8"))
COG = next(
    node for node in TREE.body
    if isinstance(node, ast.ClassDef) and node.name == "InstaDownloader"
)
METHOD = next(
    node for node in COG.body
    if isinstance(node, ast.FunctionDef) and node.name == "_ytdlp_download"
)


class FakeYoutubeDL:
    calls = []

    def __init__(self, options):
        self.options = options
        FakeYoutubeDL.calls.append(options)

    def __enter__(self):
        return self

    def __exit__(self, *_args):
        return False


class YouTubeRouteTests(unittest.TestCase):
    def setUp(self):
        FakeYoutubeDL.calls = []
        self.fake_ytdlp = types.SimpleNamespace(YoutubeDL=FakeYoutubeDL)
        self.previous = sys.modules.get("yt_dlp")
        sys.modules["yt_dlp"] = self.fake_ytdlp
        self.folder = tempfile.TemporaryDirectory()
        self.path = os.path.join(self.folder.name, "short.mp4")
        with open(self.path, "wb") as media:
            media.write(b"x" * 2048)

    def tearDown(self):
        if self.previous is None:
            sys.modules.pop("yt_dlp", None)
        else:
            sys.modules["yt_dlp"] = self.previous
        self.folder.cleanup()

    def download(self):
        namespace = {
            "os": os,
            "tempfile": tempfile,
            "time": time,
            "youtube_cookie_file": lambda: None,
            "instagram_cookie_file": lambda: None,
            "instagram_credentials": lambda: (None, None),
            "download_youtube_video": lambda *_a, **_k: self.path,
            "download_fitting_video": lambda *_a, **_k: None,
            "is_valid_video": lambda _path: True,
            "source_cap": source_cap,
        }
        exec(
            compile(ast.Module(body=[METHOD], type_ignores=[]), str(SOURCE), "exec"),
            namespace,
        )
        return namespace["_ytdlp_download"](
            object(), "https://youtube.com/shorts/abc", 9_500_000, "youtube",
        )

    def test_first_attempt_uses_local_pot_server_and_node(self):
        with patch.dict(os.environ, {
            "YOUTUBE_SESSION_SERVER": "http://127.0.0.1:8081/",
            "MEDIA_SOURCE_MAX_BYTES": "104857600",
        }):
            result = self.download()
        self.assertEqual(result, (self.path, None))
        first = FakeYoutubeDL.calls[0]
        self.assertEqual(first["js_runtimes"], {"node": {}})
        self.assertEqual(
            first["extractor_args"]["youtubepot-bgutilhttp"]["base_url"],
            ["http://127.0.0.1:8081"],
        )
        clients = first["extractor_args"]["youtube"]["player_client"]
        self.assertIn("web", clients)
        self.assertIn("mweb", clients)
        self.assertIn("tv", clients)
        self.assertIn("avc1", first["format"])
        self.assertEqual(first["max_filesize"], 104857600)
        self.assertTrue(first["overwrites"])


if __name__ == "__main__":
    unittest.main()
