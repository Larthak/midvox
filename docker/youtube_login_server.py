"""On-demand Railway browser. Only the authenticated dashboard proxy can reach it."""

import asyncio
import base64
import json
import os
import signal
import sys
import tempfile
import time
import traceback
from pathlib import Path

try:
    from aiohttp import ClientSession, ClientTimeout, web
except ImportError as exc:  # pragma: no cover - deployment diagnostics
    raise SystemExit(f"[login] fatal: aiohttp is not installed: {exc}") from exc

COOKIE_FILE = Path(os.getenv("COOKIE_PATH", "/tmp/midvox-youtube-cookies.json"))
LOGIN_HOST = os.getenv("YT_LOGIN_HOST", "127.0.0.1")
LOGIN_PORT = int(os.getenv("YT_LOGIN_PORT", "8082"))
BROWSER_LOG_DIR = Path(os.getenv("LOGIN_BROWSER_LOG_DIR", "/tmp/midvox-login"))
try:
    BROWSER_START_TIMEOUT = max(10.0, float(os.getenv("LOGIN_BROWSER_START_TIMEOUT", "40")))
except ValueError:
    BROWSER_START_TIMEOUT = 40.0


class BrowserUnavailable(ValueError):
    """The browser must be reopened, rather than retrying a stale screenshot."""


def _login_browser_processes():
    """Find Chromium/Xvfb processes left behind by an earlier sidecar."""
    try:
        entries = list(Path("/proc").iterdir())
    except OSError:
        return
    displays = {f":{number}" for number in range(87, 97)}
    for entry in entries:
        if not entry.name.isdigit():
            continue
        pid = int(entry.name)
        if pid == os.getpid():
            continue
        try:
            raw = (entry / "cmdline").read_bytes()
        except OSError:
            continue
        fields = [part.decode("utf-8", "replace") for part in raw.split(b"\0") if part]
        if not fields:
            continue
        executable = Path(fields[0]).name
        if executable == "Xvfb" and displays.intersection(fields):
            yield pid
        elif executable == "chromium" and "-login-" in " ".join(fields) \
                and "/tmp/midvox-" in " ".join(fields):
            yield pid


def reap_orphan_browsers():
    """Kill leftover login browsers so they cannot hold memory or displays."""
    pids = list(_login_browser_processes())
    if not pids:
        return
    print(f"[login] stopping {len(pids)} leftover browser process(es)", flush=True)
    for pid in pids:
        try:
            os.kill(pid, signal.SIGTERM)
        except OSError:
            pass
    deadline = time.monotonic() + 3
    while time.monotonic() < deadline:
        if not any(Path(f"/proc/{pid}").exists() for pid in pids):
            return
        time.sleep(0.1)
    for pid in pids:
        if Path(f"/proc/{pid}").exists():
            try:
                os.kill(pid, signal.SIGKILL)
            except OSError:
                pass


def youtube_cookie_header(cookies):
    selected = {c["name"]: c["value"] for c in cookies
                if c.get("domain", "").lstrip(".") in ("youtube.com", "www.youtube.com")}
    if not any(name in selected for name in ("SID", "__Secure-1PSID", "__Secure-3PSID")):
        raise ValueError("Finish signing in to YouTube before saving the session.")
    return "; ".join(f"{name}={value}" for name, value in selected.items())


def youtube_browser_cookies(contents):
    headers = contents.get("youtube", [])
    if not isinstance(headers, list) or not headers or not isinstance(headers[0], str):
        return []
    cookies = []
    for part in headers[0].split(";"):
        name, separator, value = part.strip().partition("=")
        if separator and name:
            cookies.append({"name": name, "value": value, "domain": ".youtube.com",
                            "path": "/", "secure": True})
    return cookies


def _instagram_domain(cookie):
    domain = str(cookie.get("domain", "")).lstrip(".").lower()
    return domain == "instagram.com" or domain.endswith(".instagram.com")


def instagram_cookie_header(cookies):
    selected = {c["name"]: c["value"] for c in cookies if _instagram_domain(c)}
    if "sessionid" not in selected:
        raise ValueError("Finish signing in to Instagram before saving the session.")
    return "; ".join(f"{name}={value}" for name, value in selected.items())


def instagram_browser_cookies(contents):
    headers = contents.get("instagram", [])
    if not isinstance(headers, list) or not headers or not isinstance(headers[0], str):
        return []
    cookies = []
    for part in headers[0].split(";"):
        name, separator, value = part.strip().partition("=")
        if separator and name:
            cookies.append({"name": name, "value": value, "domain": ".instagram.com",
                            "path": "/", "secure": True})
    return cookies


class LoginBrowser:
    def __init__(self, kind="youtube"):
        self.kind = kind
        if kind == "instagram":
            self.display_base = 87
            self.url = "https://www.instagram.com/accounts/login/"
        elif kind == "discord":
            self.display_base = 88
            self.url = "https://discord.com/login"
        else:
            self.display_base = 89
            self.url = "https://www.youtube.com/account"
        self.display_name = None
        # Port zero lets Chromium choose a free port and record it in
        # DevToolsActivePort. Fixed ports collide with orphaned browsers after
        # a redeploy and make every later login attempt fail.
        self.debug_port = None
        self.process = self.display = self.profile = self.session = None
        self.log_handles = []
        self.socket = None
        self.sequence = 0
        self.account_token = None
        self.discord_requests = set()
        self.discord_headers = {}
        self.last_used = time.monotonic()
        self.lock = asyncio.Lock()

    async def command(self, method, params=None):
        if not self.socket or self.socket.closed:
            raise BrowserUnavailable("Browser disconnected. Reopen it; your saved session is safe.")
        self.sequence += 1
        ident = self.sequence
        await self.socket.send_json({"id": ident, "method": method, "params": params or {}})
        try:
            async with asyncio.timeout(10):
                async for message in self.socket:
                    data = json.loads(message.data)
                    if self.kind == "discord":
                        self.capture_account_header(data)
                    if data.get("method") == "Inspector.targetCrashed":
                        raise BrowserUnavailable("The browser ran out of resources. Reopen it; your saved session is safe.")
                    if data.get("id") == ident:
                        if "error" in data:
                            # Log only protocol metadata, never page content or credentials.
                            print(f"[{self.kind}-login] {method} failed (code {data['error'].get('code')})", flush=True)
                            raise BrowserUnavailable("Browser stopped responding. Reopen it; your saved session is safe.")
                        return data.get("result", {})
        except TimeoutError as exc:
            raise BrowserUnavailable("Browser stopped responding. Reopen it; your saved session is safe.") from exc
        raise BrowserUnavailable("Browser connection closed. Reopen the login browser.")

    def capture_account_header(self, event):
        """Keep only this owner's Discord API credential, privately in memory."""
        params = event.get("params", {})
        request_id = params.get("requestId")
        if event.get("method") == "Network.requestWillBeSent":
            request = params.get("request", {})
            if request.get("url", "").startswith("https://discord.com/api/"):
                self.discord_requests.add(request_id)
                self.discord_headers[request_id] = self.discord_headers.get(request_id, {}) | request.get("headers", {})
        elif event.get("method") == "Network.requestWillBeSentExtraInfo":
            self.discord_headers[request_id] = params.get("headers", {})
        if request_id in self.discord_requests:
            headers = self.discord_headers.get(request_id, {})
            token = next((v for k, v in headers.items() if k.lower() == "authorization"), None)
            if isinstance(token, str) and token:
                self.account_token = token
        if len(self.discord_headers) > 128:
            self.discord_headers.clear()
            self.discord_requests.clear()

    def login_status(self):
        message = "Open the login browser to manage your saved session."
        if self.kind == "discord":
            try:
                account = json.loads(Path("/tmp/midvox-discord-login.json").read_text(encoding="utf-8"))
                if isinstance(account, dict) and account.get("login_method") == "browser-v2":
                    message = f"Selected browser account: {account['username']} ({account['id']}). Sign in again here to change it."
                else:
                    message = "No selected browser login. The worker uses USER_TOKEN until you save a new login here."
            except (OSError, ValueError, KeyError, TypeError):
                message = "No selected browser login. Sign in and save to choose the bump account."
        elif self.kind == "instagram":
            try:
                contents = json.loads(COOKIE_FILE.read_text(encoding="utf-8"))
                saved = bool(instagram_browser_cookies(contents))
            except (OSError, ValueError, TypeError, AttributeError):
                saved = False
            message = (
                "An Instagram session is saved. Sign in again here to replace it."
                if saved else
                "No Instagram session saved. Sign in and save to enable Reel downloads."
            )
        return {"message": message, "running": bool(self.socket and not self.socket.closed)}

    async def stop(self):
        if self.session:
            await self.session.close()
        for process in (self.process, self.display):
            if process and process.returncode is None:
                process.terminate()
                try:
                    await asyncio.wait_for(process.wait(), 5)
                except TimeoutError:
                    process.kill()
                    await process.wait()
        if self.profile:
            self.profile.cleanup()
        for handle in self.log_handles:
            try:
                handle.close()
            except OSError:
                pass
        self.log_handles.clear()
        self.process = self.display = self.profile = self.session = self.socket = None
        self.display_name = None
        self.debug_port = None
        self.account_token = None
        self.discord_requests.clear()
        self.discord_headers.clear()

    @staticmethod
    def read_cookie_store():
        """Read the shared Cobalt cookie store without losing other services."""
        try:
            store = json.loads(COOKIE_FILE.read_text(encoding="utf-8"))
        except (OSError, ValueError):
            store = {}
        return store if isinstance(store, dict) else {}

    @classmethod
    def save_cookie_header(cls, kind, header):
        """Atomically replace one service's session in the shared store."""
        store = cls.read_cookie_store()
        store[kind] = [header]
        pending = COOKIE_FILE.with_suffix(".pending")
        pending.write_text(json.dumps(store), encoding="utf-8")
        pending.chmod(0o600)
        pending.replace(COOKIE_FILE)

    @staticmethod
    def restart_cobalt():
        pid_path = Path("/tmp/midvox-cobalt.pid")
        try:
            pid = int(pid_path.read_text())
            command = Path(f"/proc/{pid}/cmdline").read_bytes()
        except (OSError, ValueError):
            raise ValueError("Session saved, but Cobalt is not running to load it.")
        if b"src/cobalt.js" not in command:
            raise ValueError("Session saved, but Cobalt must be restarted to load it.")
        os.kill(pid, signal.SIGTERM)  # start.sh restarts only Cobalt.

    async def screenshot(self):
        # Chromium can briefly refuse capture during the first navigation.
        for attempt in range(3):
            try:
                # Xvfb has no reliable GPU compositor surface. Capture the view
                # directly so a loaded page does not fail with CDP -32000.
                return await self.command("Page.captureScreenshot", {
                    "format": "jpeg", "quality": 75, "fromSurface": False,
                })
            except BrowserUnavailable:
                raise
            except (ValueError, TimeoutError):
                if attempt == 2:
                    raise
                await asyncio.sleep(0.5)

    @staticmethod
    def display_lock_owner(number):
        try:
            return int(Path(f"/tmp/.X{number}-lock").read_text(encoding="utf-8").strip())
        except (OSError, ValueError):
            return None

    @classmethod
    def display_available(cls, number):
        """Reuse only display numbers whose previous Xvfb is really gone."""
        lock = Path(f"/tmp/.X{number}-lock")
        socket = Path(f"/tmp/.X11-unix/X{number}")
        if not lock.exists():
            return not socket.exists()
        owner = cls.display_lock_owner(number)
        if owner is None:
            return False
        try:
            os.kill(owner, 0)
        except ProcessLookupError:
            pass
        except PermissionError:
            return False
        else:
            return False
        # A crash can leave the lock and socket behind. Remove both only after
        # confirming the recorded Xvfb process no longer exists.
        for path in (lock, socket):
            try:
                path.unlink()
            except OSError:
                pass
        return not lock.exists() and not socket.exists()

    def open_browser_log(self, name):
        try:
            BROWSER_LOG_DIR.mkdir(parents=True, exist_ok=True)
            handle = open(BROWSER_LOG_DIR / f"{self.kind}-{name}.log", "wb", buffering=0)
        except OSError:
            return asyncio.subprocess.DEVNULL
        self.log_handles.append(handle)
        return handle

    def read_log_tail(self, name, limit=4):
        """Return a short, credential-free excerpt of a browser log."""
        try:
            with open(BROWSER_LOG_DIR / f"{self.kind}-{name}.log", "rb") as handle:
                handle.seek(0, os.SEEK_END)
                size = handle.tell()
                handle.seek(max(0, size - 8192))
                text = handle.read().decode("utf-8", "replace")
        except OSError:
            return ""
        lines = []
        for line in text.splitlines()[-limit:]:
            lowered = line.lower()
            if not line.strip() or any(word in lowered for word in (
                    "cookie", "authorization", "password", "token=")):
                continue
            lines.append(line.strip()[:220])
        return " | ".join(lines)

    def failure_detail(self, reason):
        print(f"[{self.kind}-login] browser start failed: {reason}", flush=True)
        excerpts = []
        for label, name in (("Xvfb", "xvfb"), ("Chromium", "chromium")):
            excerpt = self.read_log_tail(name)
            if excerpt:
                print(f"[{self.kind}-login] {label}: {excerpt}", flush=True)
                excerpts.append(f"{label}: {excerpt}")
        detail = f"The Railway login browser could not start ({reason})."
        if excerpts:
            detail = f"{detail} {' '.join(excerpts)}"
        return f"{detail[:700]} Check the [login] lines in the deployment log."

    def read_debug_port(self):
        try:
            contents = (Path(self.profile.name) / "DevToolsActivePort").read_text(encoding="utf-8")
            port = int(contents.splitlines()[0].strip())
        except (OSError, ValueError, IndexError):
            return None
        return port if 0 < port < 65536 else None

    @staticmethod
    def exit_description(process):
        code = process.returncode
        if code is None:
            return "is still running"
        if code < 0:
            hint = " (possibly out of memory)" if code == -9 else ""
            return f"was killed by signal {-code}{hint}"
        return f"exited with code {code}"

    async def start_display(self):
        failures = []
        for number in range(self.display_base, self.display_base + 10):
            if not self.display_available(number):
                failures.append(f":{number} is in use")
                continue
            log = self.open_browser_log("xvfb")
            try:
                process = await asyncio.create_subprocess_exec(
                    "Xvfb", f":{number}", "-screen", "0", "1100x800x24", "-nolisten", "tcp",
                    stdout=log, stderr=log,
                )
            except OSError as exc:
                await self.stop()
                raise ValueError(
                    "The Railway login browser could not start (Xvfb is missing: "
                    f"{exc.strerror or exc}). Check the deployment image."
                ) from exc
            for _ in range(30):
                if process.returncode is not None:
                    break
                if Path(f"/tmp/.X11-unix/X{number}").exists():
                    break
                await asyncio.sleep(0.1)
            if process.returncode is None:
                self.display_name = f":{number}"
                self.display = process
                return
            failures.append(f":{number} {self.exit_description(process)}")
            await process.wait()
        detail = ", ".join(failures[-3:]) or "no free display"
        await self.stop()
        raise ValueError(
            f"The Railway login browser could not start (Xvfb: {detail}). "
            "Check the [login] lines in the deployment log."
        )

    async def start(self):
        await self.stop()
        self.profile = tempfile.TemporaryDirectory(prefix=f"midvox-{self.kind}-login-")
        await self.start_display()
        args = ["chromium", "--no-sandbox", "--disable-dev-shm-usage", "--disable-gpu",
                "--no-first-run", "--no-default-browser-check", "--password-store=basic",
                "--disable-extensions", "--mute-audio", "--renderer-process-limit=1",
                "--js-flags=--max-old-space-size=256", "--disable-background-networking",
                "--disable-component-update", "--disable-default-apps",
                "--disable-breakpad", "--disable-crash-reporter",
                "--remote-debugging-address=127.0.0.1", "--remote-debugging-port=0",
                f"--user-data-dir={self.profile.name}", "--window-size=1100,800",
                "about:blank" if self.kind in ("youtube", "instagram") else self.url]
        if self.kind == "youtube" and os.getenv("COBALT_PROXY_URL"):
            args.insert(-1, f"--proxy-server={os.environ['COBALT_PROXY_URL']}")
        chromium_log = self.open_browser_log("chromium")
        try:
            self.process = await asyncio.create_subprocess_exec(
                *args, env=dict(os.environ, DISPLAY=self.display_name),
                stdout=chromium_log, stderr=chromium_log,
            )
        except OSError as exc:
            await self.stop()
            raise ValueError(
                "The Railway login browser could not start (Chromium is missing: "
                f"{exc.strerror or exc}). Check the deployment image."
            ) from exc
        self.session = ClientSession(timeout=ClientTimeout(total=8, connect=3))
        # Chromium can be slow on a shared vCPU. Bound the whole sequence so a
        # wedged browser cannot hold the dashboard request open indefinitely,
        # while still allowing more than the old fixed 20-second window.
        deadline = time.monotonic() + BROWSER_START_TIMEOUT
        reason = "the DevTools endpoint did not answer"
        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                reason = f"the DevTools endpoint did not answer within {BROWSER_START_TIMEOUT:.0f}s"
                break
            if self.display and self.display.returncode is not None:
                reason = f"Xvfb {self.exit_description(self.display)}"
                break
            if self.process.returncode is not None:
                reason = f"Chromium {self.exit_description(self.process)}"
                break
            if self.debug_port is None:
                self.debug_port = self.read_debug_port()
                if self.debug_port is None:
                    await asyncio.sleep(0.25)
                    continue
            try:
                async with asyncio.timeout(remaining):
                    async with self.session.get(
                        f"http://127.0.0.1:{self.debug_port}/json/list"
                    ) as response:
                        pages = await response.json()
                    page = next(p for p in pages if p.get("type") == "page")
                    self.socket = await self.session.ws_connect(page["webSocketDebuggerUrl"])
                    await self.command("Network.enable")
                    await self.command("Emulation.setDeviceMetricsOverride", {
                        "width": 1100, "height": 800, "deviceScaleFactor": 1, "mobile": False,
                    })
                    if self.kind == "youtube":
                        # Account management needs no video streams or feed thumbnails.
                        # Keep Google sign-in scripts, images and verification intact.
                        await self.command("Network.setBlockedURLs", {"urls": [
                            "*://*.googlevideo.com/*", "*://i.ytimg.com/*",
                        ]})
                    if self.kind in ("youtube", "instagram"):
                        try:
                            contents = json.loads(COOKIE_FILE.read_text(encoding="utf-8"))
                        except (OSError, ValueError, TypeError, AttributeError):
                            contents = {}
                        if self.kind == "youtube":
                            cookies = youtube_browser_cookies(contents)
                        else:
                            cookies = instagram_browser_cookies(contents)
                        if cookies:
                            await self.command("Network.setCookies", {"cookies": cookies})
                        await self.command("Page.navigate", {"url": self.url})
                    return
            except Exception as exc:
                reason = f"{type(exc).__name__} while attaching to Chromium"
                if self.socket is not None:
                    try:
                        await self.socket.close()
                    except Exception:
                        pass
                    self.socket = None
                await asyncio.sleep(0.5)
        detail = self.failure_detail(reason)
        await self.stop()
        raise ValueError(detail)

    async def handle(self, request):
        async with self.lock:
            self.last_used = time.monotonic()
            try:
                if request.method == "GET":
                    if not self.socket:
                        raise BrowserUnavailable("Open the login browser first.")
                    shot = await self.screenshot()
                    return web.Response(body=base64.b64decode(shot["data"]), content_type="image/jpeg",
                                        headers={"Cache-Control": "no-store"})
                data = await request.json()
                action = data.get("action")
                if action == "start":
                    await self.start()
                elif action == "stop":
                    await self.stop()
                elif action == "status":
                    return web.json_response(self.login_status())
                elif not self.socket:
                    raise BrowserUnavailable("Open the login browser first.")
                elif action == "click":
                    point = {"x": max(0, min(1099, float(data["x"]))),
                             "y": max(0, min(799, float(data["y"]))), "button": "left", "clickCount": 1}
                    await self.command("Input.dispatchMouseEvent", dict(point, type="mousePressed"))
                    await self.command("Input.dispatchMouseEvent", dict(point, type="mouseReleased"))
                elif action == "text":
                    await self.command("Input.insertText", {"text": str(data.get("text", ""))[:2048]})
                elif action == "key":
                    key = data.get("key")
                    modifiers = int(data.get("modifiers", 0)) & 10
                    code = {"Enter": 13, "Tab": 9, "Backspace": 8, "Escape": 27,
                            "Delete": 46, "ArrowLeft": 37, "ArrowUp": 38,
                            "ArrowRight": 39, "ArrowDown": 40, "Home": 36, "End": 35}.get(key)
                    if key == "a" and modifiers == 2:
                        code = 65
                    if not code:
                        raise ValueError("Unsupported key")
                    for kind in ("keyDown", "keyUp"):
                        await self.command("Input.dispatchKeyEvent", {"type": kind, "key": key,
                                           "windowsVirtualKeyCode": code, "modifiers": modifiers})
                elif action in ("youtube", "discord", "instagram"):
                    if action != self.kind:
                        raise ValueError("Wrong login service")
                    await self.command("Page.navigate", {"url": self.url})
                elif action == "scroll":
                    await self.command("Input.dispatchMouseEvent", {"type": "mouseWheel", "x": 550,
                                       "y": 400, "deltaX": 0, "deltaY": int(data.get("delta", 400))})
                elif action == "save" and self.kind == "discord":
                    # The owner signs in directly on Discord. Keep the resulting
                    # credential server-side; never return it to the dashboard.
                    await self.command("Network.getAllCookies")  # Drain pending login events.
                    token = self.account_token
                    stored = {} if token else await self.command("DOMStorage.getDOMStorageItems", {
                        "storageId": {"securityOrigin": "https://discord.com", "isLocalStorage": True},
                    })
                    entries = dict(stored.get("entries", []))
                    token = token or json.loads(entries.get("token", "null"))
                    if not token:
                        tokens = json.loads(entries.get("tokens", "{}"))
                        if isinstance(tokens, dict) and len(tokens) == 1:
                            token = next(iter(tokens.values()))
                    if not isinstance(token, str) or not token:
                        raise ValueError("Finish logging in to Discord before saving the session.")
                    async with self.session.get("https://discord.com/api/v10/users/@me",
                        headers={"Authorization": token, "User-Agent": "Mozilla/5.0"}) as response:
                        if response.status != 200:
                            raise ValueError("Discord could not validate this login. Complete verification and try again.")
                        account = await response.json()
                    if account.get("bot"):
                        raise ValueError("Sign in with the account you want to use for bumping.")
                    contents = json.dumps({"token": token, "id": account["id"], "username": account["username"], "login_method": "browser-v2"})
                    from youtube_session_store import transfer
                    path = Path("/tmp/midvox-discord-login.json")
                    pending = path.with_suffix(".pending")
                    pending.write_text(contents, encoding="utf-8")
                    pending.chmod(0o600)
                    pending.replace(path)
                    backed_up = await asyncio.to_thread(transfer, kind="discord")
                    if not backed_up:
                        raise ValueError("Login saved locally, but encrypted backup is unavailable. Check MongoDB configuration.")
                    pid_file = Path("/tmp/midvox-bump-worker.pid")
                    if pid_file.exists():
                        pid = int(pid_file.read_text())
                        try:
                            if b"bump_sidecar.py" in Path(f"/proc/{pid}/cmdline").read_bytes():
                                os.kill(pid, signal.SIGTERM)
                        except ProcessLookupError:
                            pass
                    await self.stop()
                    return web.json_response({"message": f"Saved Discord account {account['username']} ({account['id']}) and encrypted it in MongoDB. Bump will use this login instead of USER_TOKEN within 60 seconds."})
                elif action == "save":
                    cookies = (await self.command("Network.getAllCookies"))["cookies"]
                    if self.kind == "instagram":
                        header = instagram_cookie_header(cookies)
                        label = "Instagram"
                    else:
                        header = youtube_cookie_header(cookies)
                        label = "YouTube"
                    self.save_cookie_header(self.kind, header)
                    try:
                        from youtube_session_store import transfer
                        backed_up = await asyncio.to_thread(transfer, kind=self.kind)
                    except Exception:
                        backed_up = False
                    if not backed_up:
                        raise ValueError("Session saved in this container, but the encrypted MongoDB backup failed. Keep this browser open and retry Save session after checking the database connection.")
                    self.restart_cobalt()
                    await self.stop()
                    return web.json_response({"message": f"{label} session saved and encrypted in MongoDB. It restores after redeploys or hosting changes when you keep the same database, NEXTAUTH_SECRET, and primary OWNER_IDS entry. Cobalt is restarting."})
                else:
                    raise ValueError("Unsupported action")
                return web.json_response(self.login_status())
            except BrowserUnavailable as exc:
                await self.stop()
                return web.json_response({"detail": str(exc), "reopen": True}, status=409)
            except Exception as exc:
                # Never return Chromium messages, cookies, or credentials.
                message = str(exc) if isinstance(exc, ValueError) else "Browser action failed. Reopen the login browser."
                return web.json_response({"detail": message}, status=400)

    async def reap(self):
        while True:
            await asyncio.sleep(60)
            if time.monotonic() - self.last_used > 1800:
                async with self.lock:
                    await self.stop()


async def main():
    # A previous sidecar may have been OOM-killed before it could stop its
    # browser. Clear those processes before accepting any login request.
    await asyncio.to_thread(reap_orphan_browsers)
    browsers = {
        "/browser": LoginBrowser("youtube"),
        "/discord-browser": LoginBrowser("discord"),
        "/instagram-browser": LoginBrowser("instagram"),
    }
    login_lock = asyncio.Lock()

    async def handle_login(request):
        selected = browsers.get(request.path)
        if selected is None:
            raise web.HTTPNotFound()
        # Only "start" needs cross-service coordination. Holding the global lock
        # for status and screenshot requests let one stuck browser make every
        # login page look unavailable.
        if request.method == "POST":
            try:
                action = (await request.json()).get("action")
            except (ValueError, AttributeError):
                action = None
            if action == "start":
                async with login_lock:
                    for other in browsers.values():
                        if other is not selected:
                            async with other.lock:
                                await other.stop()
        return await selected.handle(request)

    async def health(request):
        # start.sh and the dashboard use this to distinguish a live sidecar
        # from a process that exited before binding its port.
        return web.json_response({
            "status": "ok", "service": "owner-login", "pid": os.getpid(),
        })

    app = web.Application(client_max_size=8192)
    app.router.add_get("/healthz", health)
    for path in browsers:
        app.router.add_route("*", path, handle_login)
    runner = web.AppRunner(app, access_log=None)
    await runner.setup()
    try:
        await web.TCPSite(runner, LOGIN_HOST, LOGIN_PORT).start()
    except OSError as exc:
        await runner.cleanup()
        raise RuntimeError(
            f"cannot listen on {LOGIN_HOST}:{LOGIN_PORT}: {exc}"
        ) from exc
    print(f"[login] listening on http://{LOGIN_HOST}:{LOGIN_PORT}", flush=True)
    reapers = [asyncio.create_task(browser.reap()) for browser in browsers.values()]
    stopped = asyncio.Event()
    for sig in (signal.SIGTERM, signal.SIGINT):
        try:
            asyncio.get_running_loop().add_signal_handler(sig, stopped.set)
        except NotImplementedError:  # Windows development only
            signal.signal(sig, lambda *_: stopped.set())
    try:
        await stopped.wait()
    finally:
        for reaper in reapers:
            reaper.cancel()
        for browser in browsers.values():
            await browser.stop()
        await runner.cleanup()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except Exception:
        print("[login] fatal: the owner login sidecar could not start:", file=sys.stderr, flush=True)
        traceback.print_exc()
        sys.exit(1)
