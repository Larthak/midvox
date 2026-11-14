import type { Metadata } from "next";
import { Database, Eye, Lock, RefreshCw, ShieldCheck, UserCheck } from "lucide-react";
import { LegalPage } from "@/components/public/legal-page";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Privacy — ${BRAND_NAME}`,
  description: `What ${BRAND_NAME} stores, why it is stored, and how to remove it.`,
};

export default function PrivacyPage() {
  return (
    <LegalPage
      eyebrow="Privacy"
      title="Privacy policy"
      intro={`This page explains what ${BRAND_NAME} stores when you sign in or use the bot, why we store it, and the choices you have.`}
      updated="15 November 2026"
      sections={[
        {
          title: "What we collect",
          icon: Eye,
          body: [
            "When you sign in with Discord, we receive your Discord user ID, username, avatar, and the list of servers you belong to. We use the server list only to work out which servers you are allowed to manage.",
            "When you change a setting, we store that configuration against the server it belongs to. Depending on the modules you enable, the bot may also store feature data such as invite counts, levels and XP, ticket records, reaction-role mappings, and logging settings.",
          ],
        },
        {
          title: "How we use it",
          icon: Database,
          body: [
            "We use this data to sign you in, show the servers you can manage, apply the settings you save, and run the bot features you enable.",
            "We also use it to protect the service: rate limiting, abuse prevention, and checking that a request comes from an account with permission to make it.",
          ],
        },
        {
          title: "Discord sign-in",
          icon: UserCheck,
          body: [
            "Discord sign-in uses OAuth with the identify and guilds scopes. The OAuth access token is used on the server to confirm which servers you can manage. It is kept in your server-side session and is never sent to the browser.",
            "Your dashboard session is stored in a signed, HTTP-only cookie. Signing out clears that session. You can also remove the app's access at any time in your Discord account settings.",
          ],
        },
        {
          title: "Bot owner sessions",
          icon: Lock,
          body: [
            "The bot owner can connect the bot's own Discord, YouTube, or Instagram account from a restricted screen. Those saved sessions are encrypted and can only be managed by the bot owner. They are not used for any other purpose.",
          ],
        },
        {
          title: "Sharing and retention",
          icon: ShieldCheck,
          body: [
            "We do not sell your data. Data is shared only with the infrastructure needed to run the service, such as our hosting provider and the Discord API, or where required by law.",
            "Server configuration is kept while the bot remains in that server. Removing the bot stops new processing, but existing records may remain until they are deleted. Short-lived backups may keep copies for a limited period.",
          ],
        },
        {
          title: "Your choices",
          icon: RefreshCw,
          body: [
            "You can change or disable modules from the dashboard, sign out at any time, or remove the bot from your server.",
            `To request a copy or deletion of stored server data, contact the ${BRAND_NAME} team through the Discord server where you use the bot. We may need to verify that you manage the server before acting on the request.`,
          ],
        },
      ]}
    />
  );
}
