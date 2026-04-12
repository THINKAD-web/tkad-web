import ContactPage from "./contact-client";

/**
 * Bypass ISR cache — always serve fresh content.
 * The layout sets revalidate=3600 which can cause stale cached pages
 * to persist after deployments. force-dynamic ensures every request
 * gets the latest server-rendered HTML.
 */
export const dynamic = "force-dynamic";

export default function ContactPageWrapper() {
  return <ContactPage />;
}
