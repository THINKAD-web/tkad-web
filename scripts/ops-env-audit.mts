import { runOpsEnvCheck } from "../lib/ops-env-check";

const result = runOpsEnvCheck();
console.log(JSON.stringify(result, null, 2));
if (result.missingRequired.length > 0) {
  process.exitCode = 1;
}
