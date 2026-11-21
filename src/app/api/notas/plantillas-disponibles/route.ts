import { pool } from "@/lib/db";
import { BASE_PLANTILLAS } from "@/lib/defaults";
import { conAuth, responder } from "@/lib/auth";

/** GET /api/notas/plantillas-disponibles — catálogo base (no incluye notas privadas de otros usuarios). */
export const GET = conAuth(async () => {
  const result = await pool.query(
    `SELECT pb.id, pb.novedad, pb.nota_publica, pb.nota_interna, pb.nota_avances, pb.plantilla
     FROM plantillas_base pb
     WHERE UPPER(pb.novedad) <> 'AVANCE' AND ${BASE_PLANTILLAS}
     ORDER BY pb.novedad ASC`
  );
  return responder(result.rows);
});

