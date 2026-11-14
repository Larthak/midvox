import discord
from discord.ext import commands
import aiosqlite
import asyncio
import datetime
import pytz

from utils.antinuke_alerts import send_antinuke_alert

class AntiKick(commands.Cog):
    def __init__(self, bot):
        self.bot = bot
        self.event_limits = {}
        self.cooldowns = {}

    async def is_blacklisted_guild(self, guild_id):
        async with aiosqlite.connect('db/block.db') as block_db:
            cursor = await block_db.execute("SELECT 1 FROM guild_blacklist WHERE guild_id = ?", (str(guild_id),))
            return await cursor.fetchone() is not None

    async def fetch_audit_logs(self, guild, action, target_id):
        if not guild.me.guild_permissions.view_audit_log:
            return None
        try:
            async for entry in guild.audit_logs(action=action, limit=5):
                if entry.target.id == target_id:
                    now = datetime.datetime.now(pytz.utc)
                    created_at = entry.created_at
                    difference = (now - created_at).total_seconds() * 1000
                    if difference >= 3600000:
                        return None
                    return entry
        except Exception:
            pass
        return None

    def can_fetch_audit(self, guild_id, event_name, max_requests=6, interval=10, cooldown_duration=300):
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

    @commands.Cog.listener()
    async def on_member_remove(self, member):
        if await self.is_blacklisted_guild(member.guild.id):
            return

        async with aiosqlite.connect('db/anti.db') as db:
            async with db.execute("SELECT status FROM antinuke WHERE guild_id = ?", (member.guild.id,)) as cursor:
                antinuke_status = await cursor.fetchone()
            if not antinuke_status or not antinuke_status[0]:
                return


        log_entry = await self.fetch_audit_logs(member.guild, discord.AuditLogAction.kick, member.id)
        if log_entry is None:
            return

        executor = log_entry.user
        if executor.id in {member.guild.owner_id, self.bot.user.id}:
            return

        async with aiosqlite.connect('db/anti.db') as db:
            async with db.execute("SELECT owner_id FROM extraowners WHERE guild_id = ? AND owner_id = ?",
                                  (member.guild.id, executor.id)) as cursor:
                extraowner_status = await cursor.fetchone()
            if extraowner_status:
                return

            async with db.execute("SELECT kick FROM whitelisted_users WHERE guild_id = ? AND user_id = ?",
                                  (member.guild.id, executor.id)) as cursor:
                whitelist_status = await cursor.fetchone()
            if whitelist_status and whitelist_status[0]:
                return

        await self.alert_executor(member.guild, executor, member)
        await asyncio.sleep(2)

    async def alert_executor(self, guild, executor, member):
        await send_antinuke_alert(
            self.bot,
            guild,
            "Unauthorized member kick",
            "A member was removed by a user who is not whitelisted for kicks.",
            executor=executor,
            fields=[("Removed member", f"{member.mention} (`{member.id}`)")],
        )
