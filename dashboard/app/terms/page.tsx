import type { Metadata } from "next";
import { CircleAlert, FileCheck2, Gauge, ShieldCheck, UserCheck, Wrench } from "lucide-react";
import { LegalPage } from "@/components/public/legal-page";
import { BRAND_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: `Terms — ${BRAND_NAME}`,
  description: `The rules for using ${BRAND_NAME} in your Discord server.`,
};

export default function TermsPage() {
  return (
    <LegalPage
      eyebrow="Terms"
      title="Terms of service"
      intro={`These terms cover your use of the ${BRAND_NAME} bot and dashboard. By adding the bot or signing in, you agree to them.`}
      updated="15 November 2026"
      sections={[
        {
          title: "Using the service",
          icon: FileCheck2,
          body: [
            `You may use ${BRAND_NAME} only in Discord servers where you have permission to add bots and change settings. You are responsible for the configuration you save and for making sure it follows Discord's Terms of Service and Community Guidelines.`,
            "You must be old enough to use Discord under the laws that apply to you.",
          ],
        },
        {
          title: "Acceptable use",
          icon: CircleAlert,
          body: [
            "Do not use the bot or dashboard to harass people, break the law, run raids, distribute malware, or evade Discord or MidVox access controls.",
            "Do not attempt to access another server's settings, probe the API for vulnerabilities, scrape data at scale, or interfere with the service. We may rate-limit or block traffic that threatens availability.",
          ],
        },
        {
          title: "Dashboard access",
          icon: UserCheck,
          body: [
            "Dashboard access is limited to accounts on the administrator allowlist and to people who can manage at least one server. Server pages are checked again against your Discord permissions.",
            "Keep your Discord account secure. Actions taken through your signed-in session are treated as your actions. Bot-owner screens are restricted to the bot owner and must not be shared.",
          ],
        },
        {
          title: "Availability and changes",
          icon: Wrench,
          body: [
            `The service is provided as is. Features depend on Discord's API and on our hosting, so we cannot promise uninterrupted availability. We may change, limit, or retire features when needed for security or maintenance.`,
            "We may suspend access to protect the service, other servers, or other users. Where practical, we will explain why.",
          ],
        },
        {
          title: "Liability",
          icon: Gauge,
          body: [
            `To the extent permitted by law, ${BRAND_NAME} is not liable for indirect or consequential loss, lost data, or lost revenue arising from use of the service. Keep your own record of important settings.`,
            "Nothing in these terms limits rights you have under mandatory consumer law.",
          ],
        },
        {
          title: "Changes to these terms",
          icon: ShieldCheck,
          body: [
            "We may update these terms as the product changes. The date at the top of this page shows when it was last revised. Continuing to use the service after a change means you accept the updated terms.",
            `If you do not agree with a change, remove the bot from your server and stop using the dashboard. Questions can be raised in the Discord server where you use ${BRAND_NAME}.`,
          ],
        },
      ]}
    />
  );
}
