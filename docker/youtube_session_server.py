"""Low-memory Cobalt and yt-dlp session adapter for the local BotGuard provider."""

import html
import json
import os
import re
import subprocess
import threading
import time
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


HOST = os.getenv("YT_SESSION_HOST", "127.0.0.1")
PORT = int(os.getenv("YT_SESSION_PORT", "8081"))
PROXY = os.getenv("COBALT_PROXY_URL", "").strip()
TOKEN_TTL = max(30, int(os.getenv("YT_SESSION_TTL", "240")))
# Keep this major version in sync with bgutil-ytdlp-pot-provider in
# bot/requirements.txt. The plugin refuses a server with a different major.
PLUGIN_VERSION = os.getenv("YT_SESSION_PLUGIN_VERSION", "2.0.2")
USER_AGENT = (
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
    "AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36"
)

_cached = {}
_lock = threading.Lock()


def _youtube_opener(proxy=""):
    handlers = []
    if proxy:
        handlers.append(urllib.request.ProxyHandler({"http": proxy, "https": proxy}))
    return urllib.request.build_opener(*handlers)


def _visitor_data(proxy=""):
    request = urllib.request.Request(
        "https://www.youtube.com/",
        headers={"User-Agent": USER_AGENT, "Accept-Language": "en-US,en;q=0.9"},
    )
    page = _youtube_opener(proxy).open(request, timeout=25).read().decode("utf-8", "replace")
    for pattern in (r'"VISITOR_DATA":"([^"]+)"', r'"visitorData":"([^"]+)"'):
        match = re.search(pattern, page)
        if match:
            return html.unescape(json.loads(f'"{match.group(1)}"'))
    raise RuntimeError("YouTube response did not contain visitor data")


def _generate(binding="", proxy=PROXY):
    content_binding = (binding or "").strip() or _visitor_data(proxy)
    command = ["bgutil-pot", "--content-binding", content_binding]
    if proxy:
        command.extend(["--proxy", proxy])
    completed = subprocess.run(
        command,
        check=True,
        capture_output=True,
        text=True,
        timeout=90,
        env={
            key: value for key, value in os.environ.items()
            if key.upper() not in {
                "HTTP_PROXY", "HTTPS_PROXY", "ALL_PROXY", "NO_PROXY",
                "GLOBAL_AGENT_HTTP_PROXY",
            }
        },
    )
    result = json.loads(completed.stdout)
    token = result.get("poToken") or result.get("po_token")
    if not token:
        raise RuntimeError("BotGuard provider returned no PoToken")
    return {
        "poToken": token,
        "contentBinding": content_binding,
        "potoken": token,
        "visitor_data": content_binding,
        "updated": int(time.time()),
    }


def session(binding="", proxy=PROXY, force=False):
    """Return a token for Cobalt (default binding) or yt-dlp (explicit binding)."""
    binding_key = (binding or "").strip()
    proxy_key = (proxy or "").strip()
    # Tokens are bound to both the content and the egress IP that minted them.
    # Keeping the proxy in the key prevents a WARP-minted token from being
    # reused for a direct yt-dlp request (or the reverse).
    key = (binding_key, proxy_key)
    now = time.time()
    with _lock:
        cached = _cached.get(key)
        if not force and cached and now - cached["updated"] < TOKEN_TTL:
            return cached
        value = _generate(binding_key, proxy_key)
        _cached[key] = value
        current = time.time()
        for stale in [item for item, entry in _cached.items()
                      if current - entry["updated"] >= TOKEN_TTL]:
            _cached.pop(stale, None)
        print(
            "[yt-session] refreshed YouTube session token"
            + (" for yt-dlp" if binding_key else ""),
            flush=True,
        )
        return value


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *_args):
        return

    def _json(self, status, value):
        body = json.dumps(value).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def _body(self):
        try:
            length = int(self.headers.get("Content-Length", "0"))
        except (TypeError, ValueError):
            return {}
        if length <= 0 or length > 64 * 1024:
            return {}
        try:
            value = json.loads(self.rfile.read(length))
        except (UnicodeDecodeError, ValueError):
            return {}
        return value if isinstance(value, dict) else {}

    def do_GET(self):
        if self.path == "/health":
            self._json(200 if _cached else 503, {"ready": bool(_cached)})
        elif self.path == "/ping":
            # Used by bgutil-ytdlp-pot-provider to verify the server version.
            self._json(200, {"version": PLUGIN_VERSION})
        elif self.path == "/token":
            self._serve(False)
        elif self.path == "/update":
            self._serve(True)
        else:
            self._json(404, {"error": "not_found"})

    def do_POST(self):
        if self.path == "/get_pot":
            self._serve_from_request(False)
        elif self.path == "/update":
            self._serve_from_request(True)
        else:
            self._json(404, {"error": "not_found"})

    def _serve_from_request(self, force):
        data = self._body()
        binding = data.get("content_binding") or ""
        if not isinstance(binding, str):
            binding = ""
        # yt-dlp explicitly sends a null proxy when it wants a direct request.
        # Cobalt sends no body, so it inherits the sidecar's configured proxy.
        proxy = data["proxy"] if "proxy" in data else PROXY
        if not isinstance(proxy, str):
            proxy = ""
        self._serve(force or bool(data.get("bypass_cache")), binding, proxy)

    def _serve(self, force, binding="", proxy=PROXY):
        try:
            self._json(200, session(binding, proxy, force))
        except BrokenPipeError:
            # A short health-check timeout can disconnect while the one-shot
            # minter is still finishing. The generated token remains cached.
            return
        except Exception as error:
            print(f"[yt-session] generation failed: {type(error).__name__}", flush=True)
            try:
                self._json(503, {"error": "session_generation_failed"})
            except BrokenPipeError:
                pass


def _warmup():
    try:
        session()
    except Exception as error:
        print(f"[yt-session] initial generation failed: {type(error).__name__}", flush=True)


if __name__ == "__main__":
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    print(f"[yt-session] listening on http://{HOST}:{PORT}", flush=True)
    threading.Thread(target=_warmup, daemon=True).start()
    server.serve_forever()
