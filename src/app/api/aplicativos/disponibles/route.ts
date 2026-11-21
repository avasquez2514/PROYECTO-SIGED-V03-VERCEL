import { pool } from "@/lib/db";
import { BASE_APLICATIVOS } from "@/lib/defaults";
import { conAuth, responder } from "@/lib/auth";

/** GET /api/aplicativos/disponibles — catálogo base (sin aplicativos privados de otros usuarios). */
export const GET = conAuth(async () => {
  const resultado = await pool.query(
    `SELECT ab.id, ab.nombre, ab.url, ab.categoria
     FROM aplicativos_base ab
     WHERE ${BASE_APLICATIVOS}
     ORDER BY ab.categoria ASC, ab.nombre ASC`
  );
  return responder(resultado.rows);
});

