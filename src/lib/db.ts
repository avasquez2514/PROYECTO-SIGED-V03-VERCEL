import { Pool } from "pg";

/**
 * Pool de PostgreSQL (Supabase) compartido.
 * - En serverless (Vercel) cada instancia usa 1 sola conexión para no agotar el pooler.
 * - En desarrollo se guarda en `globalThis` para sobrevivir al hot-reload.
 */
const globalForPg = globalThis as unknown as { _pgPool?: Pool };

export const pool: Pool =
  globalForPg._pgPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: process.env.NODE_ENV === "production" ? 1 : 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") globalForPg._pgPool = pool;

/** Ejecuta `fn` dentro de una transacción (COMMIT/ROLLBACK automático). */
export async function transaccion<T>(
  fn: (client: import("pg").PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await fn(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    client.release();
  }
}

