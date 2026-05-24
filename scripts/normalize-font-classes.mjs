/**
 * Normalize font-mono misuse → font-display (EN labels) or remove (general UI).
 * Keeps font-mono in code/API contexts only.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

const KEEP_MONO_FILES = [
  "developers/page.tsx",
  "media-json-edit-client.tsx",
  "admin-medias-import-client.tsx",
  "markdown-body.tsx",
  "my-api-keys-page-client.tsx",
];

const KEEP_MONO_HINTS = [
  /<pre[\s>]/,
  /<code[\s>]/,
  /developers-docs/,
  /hljs/,
  /language-/,
  /`\$\{/,
];

function walk(dir, acc = []) {
  for (const name of readdirSync(dir)) {
    if (name === "node_modules") continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, acc);
    else if (/\.(tsx|ts)$/.test(name)) acc.push(full);
  }
  return acc;
}

function shouldKeepMonoFile(file) {
  return KEEP_MONO_FILES.some((hint) => file.includes(hint));
}

function shouldKeepMonoAt(content, index) {
  const window = content.slice(Math.max(0, index - 220), index + 220);
  return KEEP_MONO_HINTS.some((re) => re.test(window));
}

function normalize(content, file) {
  let changed = false;
  let out = content;

  const replacements = [
    [
      /font-mono font-bold uppercase tracking-\[0\.18em\]/g,
      "font-display font-bold uppercase tracking-[0.18em]",
    ],
    [
      /font-mono font-bold uppercase tracking-\[0\.2em\]/g,
      "font-display font-medium uppercase tracking-[0.2em]",
    ],
    [
      /font-mono font-bold uppercase tracking-\[0\.22em\]/g,
      "font-display font-medium uppercase tracking-[0.22em]",
    ],
    [
      /font-mono text-\[10px\] font-bold uppercase/g,
      "font-display text-xs font-medium uppercase",
    ],
    [
      /font-mono text-\[11px\] font-bold uppercase/g,
      "font-display text-xs font-medium uppercase",
    ],
    [
      /font-mono text-\[10px\] uppercase/g,
      "font-display text-xs font-medium uppercase",
    ],
    [
      /font-mono text-\[11px\] uppercase/g,
      "font-display text-xs font-medium uppercase",
    ],
    [
      /font-mono text-xs font-bold uppercase/g,
      "font-display text-xs font-medium uppercase",
    ],
    [
      /font-mono text-sm font-bold uppercase/g,
      "font-display text-sm font-medium uppercase",
    ],
    [
      /font-mono text-\[12px\] font-bold uppercase/g,
      "font-display text-xs font-medium uppercase",
    ],
    [
      /font-mono text-\[13px\] font-bold uppercase/g,
      "font-display text-xs font-medium uppercase",
    ],
    [
      /font-mono text-lg font-bold uppercase/g,
      "font-display text-lg font-bold uppercase",
    ],
    [
      /font-mono text-xl font-bold uppercase/g,
      "font-display text-xl font-bold uppercase",
    ],
    [
      /font-mono text-2xl font-bold uppercase/g,
      "font-display text-2xl font-bold uppercase",
    ],
    [
      /font-mono text-3xl font-bold uppercase/g,
      "font-display text-3xl font-bold uppercase",
    ],
    [
      /font-mono text-4xl font-bold uppercase/g,
      "font-display text-4xl font-bold uppercase",
    ],
    [
      /font-mono([^"']*)tracking-\[0\./g,
      (match) => match.replace("font-mono", "font-display"),
    ],
  ];

  for (const [from, to] of replacements) {
    const next = out.replace(from, to);
    if (next !== out) {
      out = next;
      changed = true;
    }
  }

  if (!shouldKeepMonoFile(file)) {
    out = out.replace(/font-mono/g, (match, offset) => {
      if (shouldKeepMonoAt(out, offset)) return match;
      const slice = out.slice(offset, offset + 140);
      if (/uppercase|tracking-\[0\./.test(slice)) {
        changed = true;
        return "font-display";
      }
      if (/tabular-nums/.test(slice)) {
        changed = true;
        return "tabular-nums";
      }
      changed = true;
      return "";
    });
    out = out.replace(/\s{2,}/g, " ");
    out = out.replace(/className=" /g, 'className="');
    out = out.replace(/ class="/g, ' class="');
    out = out.replace(/"\s+"/g, '" "');
  }

  return { content: out, changed: changed && out !== content };
}

const dirs = ["app", "components", "lib"].map((d) => join(ROOT, d));
const files = dirs.flatMap((d) => walk(d));

let touched = 0;
for (const file of files) {
  const raw = readFileSync(file, "utf8");
  if (!raw.includes("font-mono")) continue;
  const { content, changed } = normalize(raw, file);
  if (changed) {
    writeFileSync(file, content, "utf8");
    touched++;
    console.log(`  ${relative(ROOT, file)}`);
  }
}

console.log(`\nNormalized ${touched} files.`);
