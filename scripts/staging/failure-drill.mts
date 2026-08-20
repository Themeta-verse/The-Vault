import mysql from "mysql2/promise";
import { assertStagingTarget } from "./preflight.mts";

const target = assertStagingTarget();
const connection = await mysql.createConnection(target.toString());
const table = `vault_failure_drill_${Date.now()}`;

try {
  await connection.query(
    `CREATE TEMPORARY TABLE ${table} (id INT PRIMARY KEY)`
  );
  await connection.beginTransaction();
  await connection.query(`INSERT INTO ${table} (id) VALUES (1)`);
  await connection.rollback();
  const [rows] = await connection.query<{ count: number }[]>(
    `SELECT COUNT(*) AS count FROM ${table}`
  );
  if (rows[0]?.count !== 0) {
    throw new Error("Rollback drill failed: temporary write persisted");
  }
  console.log(
    JSON.stringify({ status: "passed", drill: "transaction-rollback" })
  );
} finally {
  await connection.end();
}
