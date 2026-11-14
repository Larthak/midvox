"""Shared Anti-Nuke alert delivery.

Anti-Nuke is detection and recovery only: it must never ban, kick, or unban a
member. This module centralises the notification path so every detector reports
suspicious activity to a server log channel, the system channel, or the server
owner without taking punitive action.
"""

from __future__ import annotations

import logging
from typing import Iterable, Optional

import discord

logger = logging.getLogger(__name__)

ALERT_COLOR = 0xE0A33E


def _alert_embed(
    title: str,
    description: str,
    executor: Optional[discord.abc.User] = None,
    fields: Optional[Iterable[tuple[str, str]]] = None,
) -> discord.Embed:
    embed = discord.Embed(
        title=f"🛡️ Anti-Nuke alert • {title}",
        description=description,
        color=ALERT_COLOR,
        timestamp=discord.utils.utcnow(),
    )
    if executor is not None:
        embed.add_field(
            name="Detected actor",
            value=f"{executor.mention} (`{executor.id}`)",
            inline=False,
        )
    for name, value in fields or ():
        embed.add_field(name=name, value=value, inline=False)
    embed.set_footer(text="No member was banned, kicked, or unbanned. Review the audit log.")
    return embed


async def send_antinuke_alert(
    bot: discord.Client,
    guild: discord.Guild,
    title: str,
    description: str,
    *,
    executor: Optional[discord.abc.User] = None,
    fields: Optional[Iterable[tuple[str, str]]] = None,
) -> bool:
    """Deliver an Anti-Nuke alert without removing any member.

    Preferred destination is the configured ``system_events`` logging channel,
    followed by the guild system channel and finally the guild owner's DMs.
    Returns ``True`` when at least one message was sent.
    """

    embed = _alert_embed(title, description, executor, fields)

    channel: Optional[discord.abc.Messageable] = None

    try:
        logging_cog = bot.get_cog("Logging")
        config = None
        if logging_cog is not None and hasattr(logging_cog, "_get_log_config"):
            config = await logging_cog._get_log_config(guild.id)
        if config:
            channel_id = (config.get("log_channels") or {}).get("system_events")
            if channel_id:
                candidate = guild.get_channel(int(channel_id))
                if candidate is not None:
                    channel = candidate
    except Exception:
        logger.debug("Could not resolve the Anti-Nuke logging channel", exc_info=True)

    if channel is None:
        channel = guild.system_channel

    if channel is not None:
        try:
            permissions = channel.permissions_for(guild.me)
            if permissions.send_messages and permissions.embed_links:
                await channel.send(embed=embed, allowed_mentions=discord.AllowedMentions.none())
                return True
        except Exception:
            logger.debug("Could not send Anti-Nuke alert to a guild channel", exc_info=True)

    try:
        owner = guild.owner
        if owner is not None:
            await owner.send(embed=embed)
            return True
    except Exception:
        logger.debug("Could not DM the guild owner an Anti-Nuke alert", exc_info=True)

    return False
