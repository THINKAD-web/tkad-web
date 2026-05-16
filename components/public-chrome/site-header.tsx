import { getNavContentStatus } from "@/lib/nav-content-status";
import { HeaderBrutal } from "@/components/public-chrome/header-brutal";

/** Server wrapper — nav badges reflect DB content availability. */
export async function SiteHeader() {
  const contentStatus = await getNavContentStatus();
  return <HeaderBrutal contentStatus={contentStatus} />;
}
