import { pool, transaccion } from "@/lib/db";
import { conAuth, errorMensaje, esUuid, leerJson, responder } from "@/lib/auth";

const tieneRelacion = async (usuarioId: string, plantillaId: string) =>
  (
    await pool.query("SELECT 1 FROM notas_despacho_rel WHERE usuario_id = $1 AND plantilla_id = $2", [
      usuarioId,
      plantillaId,
    ])
  ).rows.length > 0;

/**
 * PUT /api/notas/plantilla/:id — modifica una plantilla del usuario.
 * Solo se actualizan los campos enviados (antes los omitidos se borraban a NULL).
 */
export const PUT = conAuth<{ id: string }>(async (req, sesion, { id }) => {
  if (!esUuid(id)) return errorMensaje("ID de plantilla inválido", 400);
  if (!(await tieneRelacion(sesion.id, id))) return errorMensaje("Plantilla no encontrada", 404);

  const b = await leerJson<Record<string, string | undefined>>(req);

  const result = await pool.query(
    `UPDATE plantillas_base SET
       novedad      = COALESCE($1, novedad),
       nota_publica = COALESCE($2, nota_publica),
       nota_interna = COALESCE($3, nota_interna),
       nota_avances = COALESCE($4, nota_avances),
       plantilla    = COALESCE($5, plantilla)
     WHERE id = $6`,
    [b.novedad ?? null, b.nota_publica ?? null, b.nota_interna ?? null, b.nota_avances ?? null, b.plantilla ?? null, id]
  );

  return responder({
    mensaje: "Plantilla actualizada correctamente",
    filas_afectadas: result.rowCount,
    plantilla_id: id,
  });
});

/**
 * DELETE /api/notas/plantilla/:id — quita la plantilla al usuario; si nadie más la usa, se elimina.
 * (Antes se borraba para TODOS los usuarios.)
 */
export const DELETE = conAuth<{ id: string }>(async (_req, sesion, { id }) => {
  if (!esUuid(id)) return errorMensaje("ID de plantilla inválido", 400);

  const resultado = await transaccion(async (client) => {
    const plantilla = await client.query("SELECT novedad FROM plantillas_base WHERE id = $1", [id]);
    if (plantilla.rows.length === 0) return null;

    const rel = await client.query(
      "DELETE FROM notas_despacho_rel WHERE plantilla_id = $1 AND usuario_id = $2",
      [id, sesion.id]
    );
    if (rel.rowCount === 0) return null;

    await client.query(
      `DELETE FROM plantillas_base pb
       WHERE pb.id = $1 AND NOT EXISTS (SELECT 1 FROM notas_despacho_rel r WHERE r.plantilla_id = pb.id)`,
      [id]
    );
    return { nombre: plantilla.rows[0].novedad, relaciones: rel.rowCount };
  });

  if (!resultado) return errorMensaje("Plantilla no encontrada", 404);
  return responder({
    mensaje: "Plantilla eliminada completamente",
    plantilla_nombre: resultado.nombre,
    relaciones_eliminadas: resultado.relaciones,
  });
});

