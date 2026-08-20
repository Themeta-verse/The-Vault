import { spawnSync } from "node:child_process";
import { assertStagingTarget } from "./preflight.mts";

const target = assertStagingTarget();
const result = spawnSync("pnpm", ["drizzle-kit", "migrate"], {
  stdio: "inherit",
  env: {
    ...process.env,
    DATABASE_URL: target.toString(),
    DEPLOYMENT_ENV: "staging",
  },
});

if (result.status !== 0) process.exit(result.status ?? 1);
