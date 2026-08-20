import { sql } from "drizzle-orm";
import { getDb } from "../db";

export type HealthStatus = {
  application: "healthy";
  database: "healthy" | "unavailable";
  requiredServices: "not_configured";
  timestamp: string;
};

/**
 * Performs the smallest useful readiness check: the process is running and its
 * configured database can execute a query. It intentionally does not touch
 * user state or call optional provider services such as AI or object storage.
 */
export async function getHealthStatus(): Promise<HealthStatus> {
  const timestamp = new Date().toISOString();
  const db = await getDb();
  if (!db)
    return {
      application: "healthy",
      database: "unavailable",
      requiredServices: "not_configured",
      timestamp,
    };

  try {
    await db.execute(sql`SELECT 1`);
    return {
      application: "healthy",
      database: "healthy",
      requiredServices: "not_configured",
      timestamp,
    };
  } catch {
    console.warn(
      JSON.stringify({
        level: "warn",
        event: "health_database_probe_failed",
        timestamp,
      })
    );
    return {
      application: "healthy",
      database: "unavailable",
      requiredServices: "not_configured",
      timestamp,
    };
  }
}
