#!/usr/bin/env node
/**
 * Nav Phase1 polish — network desc + targets SubTabs removal.
 */
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = process.cwd();
const outDir = path.join(root, "scripts/.verify-nav-phase1-polish");
fs.mkdirSync(outDir, { recursive: true });

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const ko = JSON.parse(read("messages/ko.json"));
const en = JSON.parse(read("messages/en.json"));
const targetsPage = read("app/[locale]/(site)/media/targets/page.tsx");
const navData = read("lib/navigation/public-nav-data.ts");

const fail = [];

const koNet = ko.nav.items["media-network"];
const enNet = en.nav.items["media-network"];

if (koNet.label !== "네트워크 매체") {
  fail.push(`KO label changed unexpectedly: ${koNet.label}`);
}
if (!/매체 목록의 네트워크 모드/.test(koNet.desc)) {
  fail.push(`KO desc missing catalog-mode copy: ${koNet.desc}`);
}
if (!/Network mode in the media catalog/i.test(enNet.desc)) {
  fail.push(`EN desc missing catalog-mode copy: ${enNet.desc}`);
}
if (!/href:\s*"\/media\?features=network"/.test(navData)) {
  fail.push("media-network href removed from public-nav-data");
}
if (/SubTabsBar/.test(targetsPage)) {
  fail.push("targets page still mounts SubTabsBar");
}
if (!/href=\"\/media\"/.test(targetsPage) || !/매체 검색으로/.test(targetsPage)) {
  fail.push("targets page missing /media reverse link");
}
if (!/MediaCampaignTargetsGrid/.test(targetsPage)) {
  fail.push("targets grid removed — regression");
}

const report = {
  ok: fail.length === 0,
  fail,
  koNetworkDesc: koNet.desc,
  enNetworkDesc: enNet.desc,
  targetsHasSubTabs: /SubTabsBar/.test(targetsPage),
  targetsHasBackLink: /매체 검색으로/.test(targetsPage),
};

fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (fail.length) process.exit(1);
