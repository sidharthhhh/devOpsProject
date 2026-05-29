import * as mysql from "mysql2/promise";
import { Pool } from "mysql2/promise";
import * as fs from "fs/promises";
import * as path from "path";
import { Config } from "../config";

export function createPool(config: Config): Pool {
  return mysql.createPool({
    host: config.mysqlHost,
    port: config.mysqlPort,
    user: config.mysqlUser,
    password: config.mysqlPassword,
    database: config.mysqlDatabase,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
  });
}

export async function runMigrations(pool: Pool): Promise<void> {
  const migrationPath = path.join(__dirname, "migrations", "001_init.sql");
  const sql = await fs.readFile(migrationPath, "utf-8");

  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  for (const statement of statements) {
    try {
      await pool.execute(statement);
    } catch (err: any) {
      // Ignore "already exists" errors (tables, indexes, etc.)
      if (err.errno === 1061 || err.errno === 1050) {
        continue;
      }
      throw err;
    }
  }

  console.log("Migrations completed successfully");
}

export type { Pool };
