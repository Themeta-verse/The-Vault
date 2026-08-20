import { URL } from "node:url";

export function assertStagingTarget(environment = process.env) {
  const stagingUrl = environment.STAGING_DATABASE_URL;
  if (!stagingUrl) throw new Error("STAGING_DATABASE_URL is required");
  if (environment.DATABASE_URL && stagingUrl === environment.DATABASE_URL) {
    throw new Error("STAGING_DATABASE_URL must never equal DATABASE_URL");
  }
  if ((environment.DEPLOYMENT_ENV ?? "").toLowerCase() !== "staging") {
    throw new Error("DEPLOYMENT_ENV must be explicitly set to staging");
  }
  const target = new URL(stagingUrl);
  if (!target.protocol.startsWith("mysql")) {
    throw new Error("STAGING_DATABASE_URL must use a MySQL-compatible URL");
  }
  if (!target.pathname || target.pathname === "/") {
    throw new Error("STAGING_DATABASE_URL must include a database name");
  }
  return target;
}

if (import.meta.url === new URL(process.argv[1], "file:").href) {
  const target = assertStagingTarget();
  console.log(
    JSON.stringify({
      status: "ready",
      databaseHost: target.hostname,
      databaseName: target.pathname.slice(1),
    })
  );
}
