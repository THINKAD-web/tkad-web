/**
 * Shared helpers for campaign builder browser verification scripts.
 */

/** Wait until loadReport finished — edits before this can be wiped or mis-saved. */
export async function waitForBuilderReady(page, { timeoutMs = 60_000 } = {}) {
  await page
    .locator('[data-testid="campaign-builder-track"]')
    .waitFor({ state: "visible", timeout: timeoutMs });

  const id = new URL(page.url()).searchParams.get("id");
  if (id) {
    await page
      .locator('[data-testid="campaign-builder-loading"]')
      .waitFor({ state: "visible", timeout: 10_000 })
      .catch(() => {});
  }

  await page
    .locator('[data-testid="campaign-builder-loading"]')
    .waitFor({ state: "detached", timeout: timeoutMs });

  await page
    .locator('[data-testid="campaign-builder-track"][data-builder-ready="true"]')
    .waitFor({ state: "attached", timeout: timeoutMs });

  if (id) {
    await page.waitForFunction(
      () => {
        const titleInput = document.querySelector(
          '[data-testid="campaign-builder-track"] label input',
        );
        return Boolean(titleInput?.value?.trim());
      },
      { timeout: timeoutMs },
    );
  }
}

/**
 * Click save and wait for API + client state. URL ?id= can lag on Preview;
 * prefer response JSON id, then UI "id:" span, then URL param.
 */
export async function clickSaveAndWaitForReportId(page, { timeoutMs = 15_000 } = {}) {
  const saveResponsePromise = page.waitForResponse(
    (res) => {
      const method = res.request().method();
      if (method !== "POST" && method !== "PATCH") return false;
      return /\/api\/admin\/campaign-builder\/reports(\?|$)/.test(res.url());
    },
    { timeout: timeoutMs },
  );

  await page
    .locator('[data-testid="campaign-builder-track"]')
    .getByRole("button", { name: /저장/ })
    .click();

  let api = { status: null, body: "", id: null, error: null };
  try {
    const res = await saveResponsePromise;
    const body = await res.text();
    let json = null;
    try {
      json = body ? JSON.parse(body) : null;
    } catch {
      /* raw body kept */
    }
    api = {
      status: res.status(),
      body,
      id: json?.id ?? null,
      error: json?.error ?? null,
      details: json?.details ?? null,
    };
  } catch (e) {
    api.error = e instanceof Error ? e.message : String(e);
  }

  const deadline = Date.now() + timeoutMs;
  let urlId = null;
  let uiId = null;
  while (Date.now() < deadline) {
    urlId = new URL(page.url()).searchParams.get("id");
    if (urlId) break;

    const idSpan = page
      .locator('[data-testid="campaign-builder-track"]')
      .locator("span")
      .filter({ hasText: /^id:/ });
    if (await idSpan.count()) {
      const text = (await idSpan.first().textContent()) ?? "";
      const match = text.match(/id:\s*(\S+)/);
      if (match?.[1]) {
        uiId = match[1];
        break;
      }
    }
    await page.waitForTimeout(250);
  }

  const reportId = api.id ?? urlId ?? uiId;
  const apiOk =
    api.status === 201 || api.status === 200 || (api.status === null && Boolean(reportId));

  return {
    ok: Boolean(reportId) && apiOk,
    reportId,
    api,
    urlId,
    uiId,
  };
}

/** Fill a KPI card label and wait until React state reflects the value. */
export async function fillKpiLabel(page, cardId, text) {
  const input = page
    .getByTestId(`builder-kpi-card-${cardId}`)
    .locator('input[type="text"]');
  await input.scrollIntoViewIfNeeded();
  await input.click({ clickCount: 3 });
  await input.fill("");
  await input.fill(text);
  if (
    (await input.inputValue()) !== text
  ) {
    await input.evaluate((el, value) => {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLInputElement.prototype,
        "value",
      )?.set;
      setter?.call(el, value);
      el.dispatchEvent(new Event("input", { bubbles: true }));
      el.dispatchEvent(new Event("change", { bubbles: true }));
    }, text);
  }
  await input.waitFor({ state: "visible", timeout: 10_000 });
  await page.waitForFunction(
    ([testId, expected]) => {
      const el = document.querySelector(`[data-testid="${testId}"] input[type="text"]`);
      return el?.value === expected;
    },
    [`builder-kpi-card-${cardId}`, text],
    { timeout: 10_000 },
  );
}

export async function goToPreview(page, base, reportId) {
  await page.getByTestId("campaign-builder-go-preview").click();
  await page.waitForTimeout(800);
  if (!page.url().includes("step=3") && reportId) {
    await page.goto(
      `${base}/ko/admin/reports?type=builder&step=3&id=${encodeURIComponent(reportId)}`,
      { waitUntil: "domcontentloaded", timeout: 120_000 },
    );
  }
  await waitForBuilderReady(page);
  await page.waitForSelector('[data-testid="campaign-builder-report-preview"]', {
    timeout: 60_000,
  });
  await page.waitForSelector('[data-testid="builder-preview-kpi"]', {
    timeout: 60_000,
  });
}
