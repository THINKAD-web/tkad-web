#!/usr/bin/env bash
# STEP3d HTTP export verification — dev server on :3010 required
set -euo pipefail
cd "$(dirname "$0")/.."

BASE="${BASE:-http://localhost:3010}"
OUT_DIR="${OUT_DIR:-/tmp/step3d-http-export}"
mkdir -p "$OUT_DIR"

eval "$(node --import tsx -e "
import { config } from 'dotenv';
config({ path: '.env.local' });
import { getExpectedAdminUsername, getExpectedAdminPassword, ADMIN_SESSION_COOKIE, createAdminSessionToken } from './lib/admin-session.ts';

const BASE = process.env.BASE ?? 'http://localhost:3010';
const login = await fetch(BASE + '/api/admin/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: getExpectedAdminUsername(), password: getExpectedAdminPassword() }),
});
const setCookie = login.headers.get('set-cookie') ?? '';
let token = setCookie.match(/tkad_admin_session=([^;]+)/)?.[1];
if (!token) token = createAdminSessionToken() ?? '';
const cookieHeader = ADMIN_SESSION_COOKIE + '=' + token;
const create = await fetch(BASE + '/api/admin/campaign-builder/reports', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Cookie: cookieHeader },
  body: JSON.stringify({ version: 1, mode: 'digital', documentType: 'proposal', title: 'STEP3d HTTP export', digitalLines: [{ slug: 'ig-awareness-reach', budgetWon: 1000000 }], oohLines: [], customLines: [] }),
});
const created = await create.json();
console.log('export COOKIE=\"' + cookieHeader + '\"');
console.log('export REPORT_ID=\"' + created.id + '\"');
console.log('export BASE=\"' + BASE + '\"');
")"

echo "=== 1. format=pdf ==="
curl -s -D - "$BASE/api/admin/campaign-builder/reports/$REPORT_ID/export?format=pdf&style=brand" \
  -H "Cookie: $COOKIE" -o "$OUT_DIR/step3d-http-export.pdf" | tee "$OUT_DIR/pdf-headers.txt"
wc -c "$OUT_DIR/step3d-http-export.pdf"
file "$OUT_DIR/step3d-http-export.pdf" || true
echo ""

echo "=== 2. format=pptx ==="
curl -s -D - "$BASE/api/admin/campaign-builder/reports/$REPORT_ID/export?format=pptx&style=brand" \
  -H "Cookie: $COOKIE" -o "$OUT_DIR/step3d-http-export.pptx" | tee "$OUT_DIR/pptx-headers.txt"
wc -c "$OUT_DIR/step3d-http-export.pptx"
file "$OUT_DIR/step3d-http-export.pptx" || true
echo ""

echo "=== 3. format=xml ==="
curl -i "$BASE/api/admin/campaign-builder/reports/$REPORT_ID/export?format=xml" -H "Cookie: $COOKIE"
echo ""

echo "=== 4. no auth ==="
curl -i "$BASE/api/admin/campaign-builder/reports/$REPORT_ID/export?format=pdf"
echo ""

echo "=== 5. missing id ==="
curl -i "$BASE/api/admin/campaign-builder/reports/does-not-exist-step3d/export?format=pdf" -H "Cookie: $COOKIE"
