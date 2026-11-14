import discord
from discord.ext import commands
import aiosqlite
import asyncio
import datetime
import pytz

from utils.antinuke_alerts import send_antinuke_alert

class AntiBan(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.event_limits = {}
        self.cooldowns = {}

    def can_fetch_audit(self, guild_id, event_name, max_requests=5, interval=10, cooldown_duration=300):
        now = datetime.datetime.now()
        self.event_limits.setdefault(guild_id, {}).setdefault(event_name, []).append(now)

        timestamps = self.event_limits[guild_id][event_name]
        timestamps = [t for t in timestamps if (now - t).total_seconds() <= interval]
        self.event_limits[guild_id][event_name] = timestamps

        if guild_id in self.cooldowns and event_name in self.cooldowns[guild_id]:
            if (now - self.cooldowns[guild_id][event_name]).total_seconds() < cooldown_duration:
                return False
            del self.cooldowns[guild_id][event_name]

        if len(timestamps) > max_requests:
            self.cooldowns.setdefault(guild_id, {})[event_name] = now
            return False
        return True

    async def fetch_audit_logs(self, guild, action, target_id):
        if not guild.me.guild_permissions.view_audit_log:
            return None
        try:
            async for entry in guild.audit_logs(action=action, limit=5):
                if entry.target.id == target_id:
                    now = datetime.datetime.now(pytz.utc)
                    if (now - entry.created_at).total_seconds() * 1000 >= 3600000:
                        return None
                    return entry
        except Exception:
            pass
        return None

    @commands.Cog.listener()
    async def on_member_ban(self, guild, user):
        async with aiosqlite.connect('db/anti.db') as db:
            async with db.execute("SELECT status FROM antinuke WHERE guild_id = ?", (guild.id,)) as cursor:
                antinuke_status = await cursor.fetchone()
            if not antinuke_status or not antinuke_status[0]:
                return


            entry = await self.fetch_audit_logs(guild, discord.AuditLogAction.ban, user.id)
            if not entry:
                return

            executor = entry.user
            if executor.id in {guild.owner_id, self.bot.user.id}:
                return

            async with db.execute("SELECT ban FROM whitelisted_users WHERE guild_id = ? AND user_id = ?", (guild.id, executor.id)) as cursor:
                whitelist_status = await cursor.fetchone()
            if whitelist_status and whitelist_status[0]:
                return

            await self.alert_executor(guild, executor, user)

    async def alert_executor(self, guild, executor, user):
        await send_antinuke_alert(
            self.bot,
            guild,
            "Unauthorized member ban",
            "A member was banned by a user who is not whitelisted for bans.",
            executor=executor,
            fields=[("Banned member", f"{user.mention} (`{user.id}`)")],
        )
