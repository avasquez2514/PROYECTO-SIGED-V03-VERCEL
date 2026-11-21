import { pool, transaccion } from "@/lib/db";
import { conAuth, errorMensaje, esUuid, responder } from "@/lib/auth";

/** GET /api/notas/:usuario_id — notas del usuario (solo las propias). */
export const GET = conAuth<{ id: string }>(async (_req, sesion, { id }) => {
  if (id !== sesion.id) return errorMensaje("No autorizado para ver las notas de otro usuario", 403);

  const result = await pool.query(
    `SELECT ndr.id, ndr.plantilla_id, pb.novedad, pb.nota_publica, pb.nota_interna,
            pb.nota_avances, pb.plantilla, ndr.creado_en
     FROM notas_despacho_rel ndr
     INNER JOIN plantillas_base pb ON ndr.plantilla_id = pb.id
     WHERE ndr.usuario_id = $1
     ORDER BY ndr.creado_en DESC`,
    [sesion.id]
  );
  return responder(result.rows);
});

/** DELETE /api/notas/:id — quita la nota (relación) del usuario; borra la plantilla si queda huérfana. */
export const DELETE = conAuth<{ id: string }>(async (_req, sesion, { id }) => {
  if (!esUuid(id)) return errorMensaje("ID de nota inválido", 400);

  const resultado = await transaccion(async (client) => {
    const rel = await client.query(
      `DELETE FROM notas_despacho_rel WHERE id = $1 AND usuario_id = $2 RETURNING plantilla_id`,
      [id, sesion.id]
    );
    if (rel.rowCount === 0) return null;

    const plantillaId = rel.rows[0].plantilla_id;
    const borrada = await client.query(
      `DELETE FROM plantillas_base pb
       WHERE pb.id = $1
         AND NOT EXISTS (SELECT 1 FROM notas_despacho_rel r WHERE r.plantilla_id = pb.id)
       RETURNING novedad`,
      [plantillaId]
    );
    const nombre = borrada.rows[0]?.novedad ?? (
      await client.query("SELECT novedad FROM plantillas_base WHERE id = $1", [plantillaId])
    ).rows[0]?.novedad;

    return { eliminada: (borrada.rowCount ?? 0) > 0, nombre };
  });

  if (!resultado) return errorMensaje("Nota no encontrada", 404);
  return responder({
    mensaje: "Nota eliminada correctamente",
    plantilla_eliminada: resultado.eliminada,
    plantilla_nombre: resultado.nombre,
  });
});

