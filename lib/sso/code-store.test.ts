import assert from "node:assert/strict";
import { test } from "node:test";
import {
  consumeSsoCode,
  createSsoCodeValue,
  putSsoCode,
  resetSsoCodeStoreForTests,
} from "@/lib/sso/code-store";

test("sso code store: one-time consume (legacy payload without accessLevel)", async () => {
  resetSsoCodeStoreForTests();
  const code = createSsoCodeValue();
  await putSsoCode(code, {
    userId: "user_1",
    email: "a@example.com",
    state: "state_abc12345",
  });

  const first = await consumeSsoCode(code);
  assert.deepEqual(first, {
    userId: "user_1",
    email: "a@example.com",
    state: "state_abc12345",
  });
  assert.equal(first?.accessLevel, undefined);

  const second = await consumeSsoCode(code);
  assert.equal(second, null);
});

test("sso code store: accessLevel is preserved through put→consume", async () => {
  resetSsoCodeStoreForTests();
  const code = createSsoCodeValue();
  await putSsoCode(code, {
    userId: "user_pro",
    email: "pro@example.com",
    state: "state_pro_level1",
    accessLevel: "PRO",
  });

  const got = await consumeSsoCode(code);
  assert.deepEqual(got, {
    userId: "user_pro",
    email: "pro@example.com",
    state: "state_pro_level1",
    accessLevel: "PRO",
  });
});

test("sso code store: expired code fails", async () => {
  resetSsoCodeStoreForTests();
  const code = createSsoCodeValue();
  await putSsoCode(
    code,
    { userId: "user_2", email: "b@example.com", state: "state_xyz98765" },
    1,
  );
  await new Promise((r) => setTimeout(r, 1100));
  const got = await consumeSsoCode(code);
  assert.equal(got, null);
});

test("sso code store: createSsoCodeValue is unique-ish", () => {
  const a = createSsoCodeValue();
  const b = createSsoCodeValue();
  assert.notEqual(a, b);
  assert.ok(a.length >= 32);
});
