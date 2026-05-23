/**
 * Cursor SDK 로컬 에이전트 — Cursor 에디터와 동일한 rules/MCP/plugins 로드.
 *
 * 사용:
 *   npm run cursor:prompt -- "이 프로젝트 구조를 한 줄로 요약해줘"
 *   npm run cursor:agent -- "버그 찾아줘"
 *
 * 환경 변수 (선택):
 *   CURSOR_AGENT_MODEL=composer-2.5 | auto
 *   CURSOR_SETTING_SOURCES=project,user,team,plugins,all
 *   CURSOR_AGENT_MINIMAL=1          # rules/MCP/plugins 미로드 (CI용)
 */
import { config } from "dotenv";
import { resolve } from "path";
import { fileURLToPath } from "url";
import {
  Agent,
  CursorAgentError,
  type AgentOptions,
  type SettingSource,
} from "@cursor/sdk";

const root = resolve(fileURLToPath(new URL(".", import.meta.url)), "..");
config({ path: resolve(root, ".env") });
config({ path: resolve(root, ".env.local"), override: true });

const VALID_SETTING_SOURCES = new Set<SettingSource>([
  "project",
  "user",
  "team",
  "mdm",
  "plugins",
  "all",
]);

function requireApiKey(): string {
  const apiKey = process.env.CURSOR_API_KEY?.trim();
  if (!apiKey) {
    console.error("[cursor-agent] CURSOR_API_KEY 가 .env.local 에 없습니다.");
    process.exit(1);
  }
  return apiKey;
}

function requirePrompt(): string {
  const prompt = process.argv.slice(2).join(" ").trim();
  if (!prompt) {
    console.error(`
사용:
  npm run cursor:prompt -- "한 번 실행할 프롬프트"
  npm run cursor:agent -- "스트리밍으로 실행할 프롬프트"

에디터와 동일한 rules/MCP/plugins:
  기본값 settingSources=["all"] (CURSOR_AGENT_MINIMAL=1 로 끄기)
`);
    process.exit(1);
  }
  return prompt;
}

function parseSettingSources(): SettingSource[] {
  if (process.env.CURSOR_AGENT_MINIMAL === "1") return [];

  const raw = process.env.CURSOR_SETTING_SOURCES?.trim();
  if (!raw) return ["all"];

  const sources = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean) as SettingSource[];

  for (const source of sources) {
    if (!VALID_SETTING_SOURCES.has(source)) {
      console.error(
        `[cursor-agent] invalid CURSOR_SETTING_SOURCES entry: ${source}`,
      );
      process.exit(1);
    }
  }

  return sources.length > 0 ? sources : ["all"];
}

function buildAgentOptions(apiKey: string): AgentOptions {
  const settingSources = parseSettingSources();
  const modelId = process.env.CURSOR_AGENT_MODEL?.trim() || "composer-2.5";

  if (settingSources.length > 0) {
    console.error(
      `[cursor-agent] editor parity: settingSources=${JSON.stringify(settingSources)} model=${modelId}`,
    );
  } else {
    console.error("[cursor-agent] minimal mode: inline config only");
  }

  return {
    apiKey,
    model: { id: modelId },
    local: {
      cwd: root,
      settingSources,
    },
  };
}

function handleStartupError(err: unknown): never {
  if (err instanceof CursorAgentError) {
    console.error(
      `[cursor-agent] startup failed: ${err.message} (retryable=${err.isRetryable})`,
    );
    process.exit(1);
  }
  throw err;
}

function handleRunError(status: string, runId?: string): never {
  console.error(
    `[cursor-agent] run failed: status=${status}${runId ? ` id=${runId}` : ""}`,
  );
  process.exit(2);
}

const mode = process.env.CURSOR_AGENT_MODE ?? "prompt";
const apiKey = requireApiKey();
const prompt = requirePrompt();
const agentOptions = buildAgentOptions(apiKey);

if (mode === "agent") {
  try {
    await using agent = await Agent.create(agentOptions);

    const run = await agent.send(prompt);
    console.error(`[cursor-agent] agent=${agent.agentId} run=${run.id}`);

    for await (const event of run.stream()) {
      if (event.type !== "assistant") continue;
      for (const block of event.message.content) {
        if (block.type === "text") process.stdout.write(block.text);
      }
    }

    const result = await run.wait();
    if (result.status === "error") handleRunError(result.status, result.id);
    if (!process.stdout.writableEnded) process.stdout.write("\n");
  } catch (err) {
    handleStartupError(err);
  }
} else {
  try {
    const result = await Agent.prompt(prompt, agentOptions);

    if (result.status === "error") handleRunError(result.status, result.id);
    console.log(result.result ?? "");
  } catch (err) {
    handleStartupError(err);
  }
}
