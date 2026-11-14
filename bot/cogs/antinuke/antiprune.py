import discord
from discord.ext import commands
import aiosqlite
import datetime
import asyncio
import pytz

from utils.antinuke_alerts import send_antinuke_alert

class AntiPrune(commands.Cog):
    def __init__(self, bot):
        self.bot = bot

    async def fetch_audit_logs(self, guild, action):
        try:
            async for entry in guild.audit_logs(action=action, limit=5):
                now = datetime.datetime.now(pytz.utc)
                created_at = entry.created_at
                difference = (now - created_at).total_seconds() * 1000

                if difference >= 3600000:
                    return  None

                return entry

        except Exception:
            pass
        return None

    @commands.Cog.listener()
    async def on_member_remove(self, member):
        guild = member.guild
        async with aiosqlite.connect('db/anti.db') as db:
            async with db.execute("SELECT status FROM antinuke WHERE guild_id = ?", (guild.id,)) as cursor:
                antinuke_status = await cursor.fetchone()

            if not antinuke_status or not antinuke_status[0]:
                return

            log_entry = await self.fetch_audit_logs(guild, discord.AuditLogAction.member_prune)
            if log_entry is None:
                return

            executor = log_entry.user


            if executor.id in {guild.owner_id, self.bot.user.id}:
                return

            async with db.execute("SELECT prune FROM whitelisted_users WHERE guild_id = ? AND user_id = ?", (guild.id, executor.id)) as cursor:
                whitelist_status = await cursor.fetchone()

            if whitelist_status and whitelist_status[0]:
                return

            async with db.execute("SELECT owner_id FROM extraowners WHERE guild_id = ? AND owner_id = ?", (guild.id, executor.id)) as cursor:
                extra_owner_status = await cursor.fetchone()

            if extra_owner_status:
                return

            await self.alert_executor(guild, executor)

    async def alert_executor(self, guild, executor):
        await send_antinuke_alert(
            self.bot,
            guild,
            "Unauthorized member prune",
            "A member prune was performed by a user who is not whitelisted for pruning.",
            executor=executor,
        )
