"""Helpers shared by AutoMod listeners and the dashboard API."""

from __future__ import annotations

AUTOMOD_EVENTS = (
    "Anti spam",
    "Anti caps",
    "Anti link",
    "Anti invites",
    "Anti emoji spam",
    "Anti mass mention",
)

PUNISHMENTS = ("delete", "warn", "mute")


def normalize_punishment(value: object, default: str = "mute") -> str:
    """Return a safe AutoMod punishment.

    Legacy values such as ``Kick`` and ``Ban`` are downgraded to ``mute`` so an
    old database row can never trigger a member removal after this change.
    """

    punishment = str(value or default).strip().lower()
    if punishment in {"kick", "ban"}:
        return "mute"
    if punishment not in PUNISHMENTS:
        return default
    return punishment
