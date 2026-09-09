import assert from "node:assert/strict";
import test from "node:test";
import {
  ADMIN_REPORT_CLICK_PATHS,
  ADMIN_REPORTS_HUB_PATH,
  buildAdminCampaignsReportPath,
  buildAdminReportsHubLandingPath,
  buildAdminReportsHubPath,
  parseAdminCampaignsReportQuery,
  parseAdminReportHubType,
} from "@/lib/admin-reports-hub";

test("parseAdminReportHubType accepts aliases", () => {
  assert.equal(parseAdminReportHubType("proposal"), "proposal");
  assert.equal(parseAdminReportHubType("campaign"), "campaign");
  assert.equal(parseAdminReportHubType("performance"), "campaign");
  assert.equal(parseAdminReportHubType("trend"), "trend");
  assert.equal(parseAdminReportHubType("nope"), null);
  assert.equal(parseAdminReportHubType(null), null);
});

test("dashboard cards land on hub step 2 for the chosen type", () => {
  assert.equal(
    buildAdminReportsHubLandingPath("campaign"),
    "/admin/reports?type=campaign&step=2",
  );
  assert.equal(
    buildAdminReportsHubLandingPath("trend"),
    "/admin/reports?type=trend&step=2",
  );
  assert.equal(
    buildAdminReportsHubLandingPath("proposal"),
    "/admin/reports?type=proposal&step=2",
  );
  assert.ok(buildAdminReportsHubPath().startsWith(ADMIN_REPORTS_HUB_PATH));
});

test("campaigns 3-button deep-link keeps selected + preview", () => {
  assert.equal(
    buildAdminCampaignsReportPath("camp-1"),
    "/admin/campaigns?selected=camp-1&report=1",
  );
  const q = new URLSearchParams("selected=camp-1&report=1");
  assert.deepEqual(parseAdminCampaignsReportQuery(q), {
    selectedId: "camp-1",
    openPreview: true,
  });
});

test("hub cuts dashboard click paths to 1", () => {
  assert.ok(
    ADMIN_REPORT_CLICK_PATHS.after.campaignFromDashboard <
      ADMIN_REPORT_CLICK_PATHS.before.campaignFromDashboard,
  );
  assert.equal(ADMIN_REPORT_CLICK_PATHS.after.campaignFromDashboard, 1);
  assert.equal(ADMIN_REPORT_CLICK_PATHS.after.proposalFromDashboard, 1);
  assert.equal(ADMIN_REPORT_CLICK_PATHS.after.hubFromSidebar, 1);
});
