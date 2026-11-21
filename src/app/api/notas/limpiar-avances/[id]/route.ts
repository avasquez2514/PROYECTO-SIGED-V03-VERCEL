import { pool } from "@/lib/db";
import { conAuth, errorMensaje, esUuid, responder } from "@/lib/auth";

/** PATCH /api/notas/limpiar-avances/:id (id = plantilla) — vacía solo nota_avances. */
export const PATCH = conAuth<{ id: string }>(async (_req, sesion, { id }) => {
  if (!esUuid(id)) return errorMensaje("ID de plantilla inválido", 400);

  const result = await pool.query(
    `UPDATE plantillas_base SET nota_avances = NULL
     WHERE id = $1
       AND EXISTS (SELECT 1 FROM notas_despacho_rel r WHERE r.plantilla_id = $1 AND r.usuario_id = $2)`,
    [id, sesion.id]
  );
  if (result.rowCount === 0) return errorMensaje("Plantilla no encontrada", 404);
  return responder({ mensaje: "Nota de avances eliminada correctamente" });
});

