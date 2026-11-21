import { pool } from "@/lib/db";
import { conAuth, errorMensaje, responder } from "@/lib/auth";

/** GET /api/notas/avances/:usuario_id — solo notas con contenido de avances (del propio usuario). */
export const GET = conAuth<{ usuario_id: string }>(async (_req, sesion, { usuario_id }) => {
  if (usuario_id !== sesion.id) return errorMensaje("No autorizado para ver las notas de otro usuario", 403);

  const result = await pool.query(
    `SELECT ndr.id, ndr.plantilla_id, pb.novedad, pb.nota_avances, ndr.creado_en
     FROM notas_despacho_rel ndr
     INNER JOIN plantillas_base pb ON ndr.plantilla_id = pb.id
     WHERE ndr.usuario_id = $1
       AND pb.nota_avances IS NOT NULL
       AND TRIM(pb.nota_avances) <> ''
     ORDER BY ndr.creado_en DESC`,
    [sesion.id]
  );
  return responder(result.rows);
});

