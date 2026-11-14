import OwnerLoginBrowser from "@/components/dashboard/owner-login-browser";
import { requireBotOwner } from "@/lib/dashboard-access";

export default async function YouTubeLogin() {
  await requireBotOwner();
  return <OwnerLoginBrowser service="youtube" />;
}
