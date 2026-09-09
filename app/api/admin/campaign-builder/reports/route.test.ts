import assert from "node:assert/strict";
import { mock, test, beforeEach, afterEach } from "node:test";
import { NextRequest } from "next/server";
import type { CampaignBuilderPayload } from "@/lib/admin-campaign-builder/schemas";
import { CAMPAIGN_BUILDER_PAYLOAD_VERSION } from "@/lib/admin-campaign-builder/schemas";

const validPayload: CampaignBuilderPayload = {
  version: CAMPAIGN_BUILDER_PAYLOAD_VERSION,
  mode: "digital",
  documentType: "proposal",
  title: "API 테스트 리포트",
  digitalLines: [{ slug: "ig-awareness-reach", budgetWon: 1_000_000 }],
  oohLines: [],
  customLines: [],
};

type StoredReport = {
  id: string;
  title: string;
  mode: string;
  payload: unknown;
  createdByAdmin: string;
  createdAt: Date;
  updatedAt: Date;
};

let authed = true;
let adminUser = "admin";
const store = new Map<string, StoredReport>();
let seq = 0;

function resetStore() {
  store.clear();
  seq = 0;
  authed = true;
  adminUser = "admin";
}

function makeDb() {
  return {
    adminCampaignBuilderReport: {
      findMany: async ({
        orderBy,
        select,
      }: {
        orderBy?: { updatedAt: "desc" };
        select?: Record<string, boolean>;
      }) => {
        void orderBy;
        void select;
        return [...store.values()].sort(
          (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime(),
        );
      },
      create: async ({
        data,
      }: {
        data: {
          title: string;
          mode: string;
          payload: unknown;
          createdByAdmin: string;
        };
      }) => {
        seq += 1;
        const now = new Date();
        const row: StoredReport = {
          id: `report-${seq}`,
          title: data.title,
          mode: data.mode,
          payload: data.payload,
          createdByAdmin: data.createdByAdmin,
          createdAt: now,
          updatedAt: now,
        };
        store.set(row.id, row);
        return row;
      },
    },
  };
}

mock.module("@/lib/admin-guard", {
  namedExports: {
    assertAdminDb: () =>
      authed
        ? null
        : Response.json({ error: "Unauthorized" }, { status: 401 }),
    json: (data: unknown, status = 200) =>
      Response.json(data, {
        status,
        headers: { "Cache-Control": "no-store, private" },
      }),
    adminDbQueryFailed: () =>
      Response.json(
        { error: "database_error", code: "DATABASE_QUERY_FAILED" },
        { status: 503 },
      ),
  },
});

mock.module("@/lib/admin-session", {
  namedExports: {
    getExpectedAdminUsername: () => adminUser,
  },
});

mock.module("@/lib/prisma", {
  namedExports: {
    getPrisma: () => makeDb(),
    isDatabaseConfigured: () => true,
  },
});

const { GET, POST } = await import("./route.ts");

function req(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

beforeEach(() => resetStore());
afterEach(() => resetStore());

test("POST — creates report with server-side createdByAdmin", async () => {
  const res = await POST(
    req("http://localhost:3000/api/admin/campaign-builder/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    }),
  );
  assert.equal(res.status, 201);
  const body = (await res.json()) as {
    id: string;
    createdByAdmin: string;
    title: string;
  };
  assert.equal(body.createdByAdmin, "admin");
  assert.equal(body.title, validPayload.title);
  assert.ok(body.id.startsWith("report-"));
});

test("GET — lists report summaries without full payload", async () => {
  await POST(
    req("http://localhost:3000/api/admin/campaign-builder/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    }),
  );

  const res = await GET(
    req("http://localhost:3000/api/admin/campaign-builder/reports"),
  );
  assert.equal(res.status, 200);
  const body = (await res.json()) as {
    reports: Array<{
      id: string;
      title: string;
      documentType: string;
      createdByAdmin: string;
      payload?: unknown;
    }>;
  };
  assert.equal(body.reports.length, 1);
  assert.equal(body.reports[0]?.documentType, "proposal");
  assert.equal(body.reports[0]?.createdByAdmin, "admin");
  assert.equal("payload" in (body.reports[0] ?? {}), false);
});

test("POST — invalid payload returns 400 with flatten details", async () => {
  const res = await POST(
    req("http://localhost:3000/api/admin/campaign-builder/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...validPayload, title: "" }),
    }),
  );
  assert.equal(res.status, 400);
  const body = (await res.json()) as { error: string; details: unknown };
  assert.equal(body.error, "Validation failed");
  assert.ok(body.details);
});

test("GET — unauthorized returns 401", async () => {
  authed = false;
  const res = await GET(
    req("http://localhost:3000/api/admin/campaign-builder/reports"),
  );
  assert.equal(res.status, 401);
  const body = (await res.json()) as { error: string };
  assert.equal(body.error, "Unauthorized");
});
