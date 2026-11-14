import discord
from utils.emoji import CROSS, EMOTE, TICK, ZSAFE, ZSETTINGS
from discord.ext import commands
from discord.ui import LayoutView, TextDisplay, Separator, Container, Button, ActionRow
import aiosqlite
from utils.Tools import *
from utils.cv2 import CV2, build_container
from utils.config import *


ANTINUKE_BOT_PERMISSIONS = (
  "view_audit_log",
  "manage_guild",
  "manage_channels",
  "manage_roles",
  "manage_webhooks",
  "manage_messages",
  "moderate_members",
)


def _missing_antinuke_permissions(guild):
  return [
    name.replace("_", " ").title()
    for name in ANTINUKE_BOT_PERMISSIONS
    if not getattr(guild.me.guild_permissions, name, False)
  ]


class Antinuke(commands.Cog):
  def __init__(self, bot):
    self.bot = bot
    self.bot.loop.create_task(self.initialize_db())

  async def initialize_db(self):
    self.db = await aiosqlite.connect('db/anti.db')
    await self.db.execute('''
        CREATE TABLE IF NOT EXISTS antinuke (
            guild_id INTEGER PRIMARY KEY,
            status BOOLEAN
        )
    ''')
    await self.db.commit()


  async def enable_limit_settings(self, guild_id):
    default_limits = DEFAULT_LIMITS
    for action, limit in default_limits.items():
      await self.db.execute('INSERT OR REPLACE INTO limit_settings (guild_id, action_type, action_limit, time_window) VALUES (?, ?, ?, ?)', (guild_id, action, limit, TIME_WINDOW))
      await self.db.commit()

  async def disable_limit_settings(self, guild_id):
    await self.db.execute('DELETE FROM limit_settings WHERE guild_id = ?', (guild_id,))
    await self.db.commit()


  @commands.hybrid_command(name='antinuke', aliases=['antiwizz', 'anti'], help="Enables/Disables Anti-Nuke Module in the server")

  @blacklist_check()
  @ignore_check()
  @commands.cooldown(1, 4, commands.BucketType.user)
  @commands.max_concurrency(1, per=commands.BucketType.default, wait=False)
  @commands.guild_only()
  @commands.has_permissions(manage_guild=True)
  async def antinuke(self, ctx, option: str = None):
    guild_id = ctx.guild.id
    pre=ctx.prefix

    async with self.db.execute('SELECT status FROM antinuke WHERE guild_id = ?', (guild_id,)) as cursor:
      row = await cursor.fetchone()

    async with self.db.execute(
            "SELECT owner_id FROM extraowners WHERE guild_id = ? AND owner_id = ?",
            (ctx.guild.id, ctx.author.id)
        ) as cursor:
            check = await cursor.fetchone()

    is_owner = ctx.author.id == ctx.guild.owner_id
    if not is_owner and not check:
      view = CV2(f"{CROSS} Access Denied", "Only Server Owner or Extra Owner can Run this Command!")
      return await ctx.send(view=view)

    is_activated = row[0] if row else False

    if option is None:
      view = CV2(
        f"{ZSAFE} {BRAND_NAME} Security",
        "**Antinuke Defense Mode** — Detect harmful admin actions, alert your team, and repair damaged server resources.",
        "**Core Functionalities**\n"
        "• Alerts you to unauthorized bans, kicks, and destructive admin actions.\n"
        "• Automatic recovery of deleted channels, roles, webhooks, and changed settings.\n"
        "• Whitelist protection for trusted users.\n"
        "• Live audit-log monitoring with no automatic member removal.",
        "**Configuration Panel**\n"
        f"{TICK} Enable Protection: `antinuke enable`\n"
        f"{CROSS} Disable Protection: `antinuke disable`"
      )
      await ctx.send(view=view)

    elif option.lower() == 'enable':
      if is_activated:
        view = CV2(
          f"Security Settings For {ctx.guild.name}",
          f"Your server __**already has Antinuke enabled.**__\n\nCurrent Status: {TICK} Enabled\nTo Disable use `antinuke disable`"
        )
        await ctx.send(view=view)
      else:

        setup_view = CV2(f"Antinuke Setup {EMOTE}", f"{TICK} | Initializing Quick Setup!")
        setup_message = await ctx.send(view=setup_view)


        missing_permissions = _missing_antinuke_permissions(ctx.guild)
        if missing_permissions:
          view = CV2(f"Antinuke Setup {EMOTE}",
            f"{TICK} | Initializing Quick Setup!\n"
            f"{CROSS} | **MidVox is missing these bot permissions:** {', '.join(missing_permissions)}.\n"
            "Grant them to my role in Server Settings > Roles, then run this command again.")
          await setup_message.edit(view=view)
          return

        dangerous_roles_above = [
          role for role in ctx.guild.roles
          if role != ctx.guild.me.top_role
          and role.position >= ctx.guild.me.top_role.position
          and (
            role.permissions.administrator
            or role.permissions.ban_members
            or role.permissions.kick_members
            or role.permissions.manage_guild
            or role.permissions.manage_channels
            or role.permissions.manage_roles
            or role.permissions.manage_webhooks
          )
        ]
        if dangerous_roles_above:
          view = CV2(
            f"Antinuke Setup {EMOTE}",
            f"{CROSS} Move my existing role above every admin/mod role, then run this command again."
          )
          await setup_message.edit(view=view)
          return

        view = CV2(
          f"Antinuke Setup {EMOTE}",
          f"{TICK} Required bot permissions verified.\n"
          f"{TICK} Role hierarchy verified.\n"
          f"{TICK} Enabling detection, alerting, and recovery modules..."
        )
        await setup_message.edit(view=view)

        await self.db.execute('INSERT OR REPLACE INTO antinuke (guild_id, status) VALUES (?, ?)', (guild_id, True))
        await self.db.commit()

        await setup_message.delete()

        modules = (
          f"{TICK} **Anti Ban**\n"
          f"{TICK} **Anti Kick**\n"
          f"{TICK} **Anti Bot**\n"
          f"{TICK} **Anti Channel Create**\n"
          f"{TICK} **Anti Channel Delete**\n"
          f"{TICK} **Anti Channel Update**\n"
          f"{TICK} **Anti Everyone/Here**\n"
          f"{TICK} **Anti Role Create**\n"
          f"{TICK} **Anti Role Delete**\n"
          f"{TICK} **Anti Role Update**\n"
          f"{TICK} **Anti Member Update**\n"
          f"{TICK} **Anti Guild Update**\n"
          f"{TICK} **Anti Integration**\n"
          f"{TICK} **Anti Webhook Create**\n"
          f"{TICK} **Anti Webhook Delete**\n"
          f"{TICK} **Anti Webhook Update**\n"
          f"{TICK} **Anti Prune**\n"
          f"{TICK} **Auto Recovery**"
        )

        punishment_btn = Button(label="Show Alert Behavior", style=discord.ButtonStyle.secondary)
        punishment_btn.callback = self._show_punishment

        result_view = LayoutView(timeout=None)
        result_view.add_item(
          build_container(
            TextDisplay(f"**{ZSETTINGS} Security Settings For {ctx.guild.name}**"),
            Separator(visible=True),
            TextDisplay("Tip: Give my role View Audit Log, Manage Server, Manage Channels, Manage Roles, Manage Webhooks, Manage Messages, and Moderate Members, then place it above the roles it protects."),
            Separator(visible=True),
            TextDisplay(f"**Modules Enabled**\n{modules}"),
            Separator(visible=True),
            TextDisplay(f"Successfully Enabled Antinuke | Powered by {BRAND_NAME} Development™"),
            ActionRow(punishment_btn)
          )
        )

        await ctx.send(view=result_view)

    elif option.lower() == 'disable':
      if not is_activated:
        view = CV2(
          f"Security Settings For {ctx.guild.name}",
          f"Uhh, looks like your server hasn't enabled Antinuke.\n\nCurrent Status: {CROSS} Disabled\n\nTo Enable use `antinuke enable`"
        )
      else:
        await self.db.execute('DELETE FROM antinuke WHERE guild_id = ?', (guild_id,))
        await self.db.commit()
        view = CV2(
          f"Security Settings For {ctx.guild.name}",
          f"Successfully disabled Antinuke for this server.\n\nCurrent Status: {CROSS} Disabled\n\nTo Enable use `antinuke enable`"
        )
      await ctx.send(view=view)
    else:
      view = CV2(f"{CROSS} Error", "Invalid option. Please use `enable` or `disable`.")
      await ctx.send(view=view)

  async def _show_punishment(self, interaction: discord.Interaction):
    view = CV2(
      "Anti-Nuke Alert Behavior",
      "**Anti-Nuke never bans, kicks, or unbans members.**\n\n"
      "**Anti Ban / Anti Kick:** Alert only\n"
      "**Anti Bot:** Alert only\n"
      "**Anti Channel Create/Delete/Update:** Alert and repair when possible\n"
      "**Anti Everyone/Here:** Remove the message and apply a 1 hour timeout\n"
      "**Anti Role Create/Delete/Update:** Alert and repair when possible\n"
      "**Anti Member Update:** Alert and remove the dangerous role when possible\n"
      "**Anti Guild Update:** Alert and revert settings when possible\n"
      "**Anti Integration:** Alert and clear unauthorized integrations when possible\n"
      "**Anti Webhook Create/Delete/Update:** Alert and remove the webhook when possible\n"
      "**Anti Prune:** Alert only\n"
      "**Auto Recovery:** Restore damaged channels, roles, webhooks, and settings",
      "Note: Member updates are flagged only when the role contains dangerous permissions such as Ban Members, Kick Members, Administrator, Manage Guild, Manage Channels, Manage Roles, Manage Webhooks, or Mention Everyone. Review the audit log and whitelist when an alert fires."
    )
    await interaction.response.send_message(view=view, ephemeral=True)
