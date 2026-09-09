import assert from "node:assert/strict";
import { mock, test, beforeEach, afterEach } from "node:test";
import { NextRequest } from "next/server";
import type { CampaignBuilderPayload } from "@/lib/admin-campaign-builder/schemas";
import { CAMPAIGN_BUILDER_PAYLOAD_VERSION } from "@/lib/admin-campaign-builder/schemas";

const validPayload: CampaignBuilderPayload = {
  version: CAMPAIGN_BUILDER_PAYLOAD_VERSION,
  mode: "digital",
  documentType: "proposal",
  title: "단건 API 테스트",
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

function resetStore() {
  store.clear();
  authed = true;
  adminUser = "admin";
}

function seedReport(
  id: string,
  overrides?: Partial<Pick<StoredReport, "createdByAdmin" | "title">>,
) {
  const now = new Date();
  store.set(id, {
    id,
    title: overrides?.title ?? validPayload.title,
    mode: validPayload.mode,
    payload: validPayload,
    createdByAdmin: overrides?.createdByAdmin ?? "admin",
    createdAt: now,
    updatedAt: now,
  });
}

function makeDb() {
  return {
    adminCampaignBuilderReport: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        store.get(where.id) ?? null,
      update: async ({
        where,
        data,
      }: {
        where: { id: string };
        data: { title: string; mode: string; payload: unknown };
      }) => {
        const existing = store.get(where.id);
        if (!existing) throw new Error("not found");
        const updated: StoredReport = {
          ...existing,
          title: data.title,
          mode: data.mode,
          payload: data.payload,
          updatedAt: new Date(),
        };
        store.set(where.id, updated);
        return updated;
      },
      delete: async ({ where }: { where: { id: string } }) => {
        store.delete(where.id);
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

const { GET, PATCH, DELETE } = await import("./route.ts");

function req(url: string, init?: RequestInit) {
  return new NextRequest(new URL(url, "http://localhost:3000"), init);
}

beforeEach(() => resetStore());
afterEach(() => resetStore());

test("GET — returns full payload for existing id", async () => {
  seedReport("report-1");
  const res = await GET(
    req("http://localhost:3000/api/admin/campaign-builder/reports/report-1"),
    { params: Promise.resolve({ id: "report-1" }) },
  );
  assert.equal(res.status, 200);
  const body = (await res.json()) as { id: string; payload: CampaignBuilderPayload };
  assert.equal(body.id, "report-1");
  assert.equal(body.payload.title, validPayload.title);
});

test("GET — missing id returns 404", async () => {
  const res = await GET(
    req("http://localhost:3000/api/admin/campaign-builder/reports/missing"),
    { params: Promise.resolve({ id: "missing" }) },
  );
  assert.equal(res.status, 404);
});

test("PATCH — author can overwrite payload", async () => {
  seedReport("report-1");
  const nextPayload: CampaignBuilderPayload = {
    ...validPayload,
    title: "수정된 제목",
  };
  const res = await PATCH(
    req("http://localhost:3000/api/admin/campaign-builder/reports/report-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(nextPayload),
    }),
    { params: Promise.resolve({ id: "report-1" }) },
  );
  assert.equal(res.status, 200);
  const body = (await res.json()) as { title: string; payload: CampaignBuilderPayload };
  assert.equal(body.title, "수정된 제목");
  assert.equal(body.payload.title, "수정된 제목");
});

test("PATCH — non-author returns 403", async () => {
  seedReport("report-1", { createdByAdmin: "other-admin" });
  const res = await PATCH(
    req("http://localhost:3000/api/admin/campaign-builder/reports/report-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    }),
    { params: Promise.resolve({ id: "report-1" }) },
  );
  assert.equal(res.status, 403);
  const body = (await res.json()) as { error: string };
  assert.equal(body.error, "Forbidden");
});

test("DELETE — author can hard delete", async () => {
  seedReport("report-1");
  const res = await DELETE(
    req("http://localhost:3000/api/admin/campaign-builder/reports/report-1", {
      method: "DELETE",
    }),
    { params: Promise.resolve({ id: "report-1" }) },
  );
  assert.equal(res.status, 200);
  const body = (await res.json()) as { ok: boolean };
  assert.equal(body.ok, true);
  assert.equal(store.has("report-1"), false);
});

test("DELETE — non-author returns 403", async () => {
  seedReport("report-1", { createdByAdmin: "other-admin" });
  const res = await DELETE(
    req("http://localhost:3000/api/admin/campaign-builder/reports/report-1", {
      method: "DELETE",
    }),
    { params: Promise.resolve({ id: "report-1" }) },
  );
  assert.equal(res.status, 403);
});

test("PATCH — unauthorized returns 401", async () => {
  authed = false;
  seedReport("report-1");
  const res = await PATCH(
    req("http://localhost:3000/api/admin/campaign-builder/reports/report-1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validPayload),
    }),
    { params: Promise.resolve({ id: "report-1" }) },
  );
  assert.equal(res.status, 401);
});
