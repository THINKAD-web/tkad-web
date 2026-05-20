import { getVapidPublicKey, isWebPushConfigured } from "@/lib/web-push";
import { json } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isWebPushConfigured()) {
    return json({ configured: false, publicKey: null });
  }
  return json({ configured: true, publicKey: getVapidPublicKey() });
}
