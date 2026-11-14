import OwnerLoginBrowser from "@/components/dashboard/owner-login-browser";
import { requireBotOwner } from "@/lib/dashboard-access";

export default async function InstagramLogin() {
  await requireBotOwner();
  return <OwnerLoginBrowser service="instagram" />;
}
