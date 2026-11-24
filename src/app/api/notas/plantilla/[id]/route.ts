import { randomUUID } from "crypto";
import { pool, transaccion } from "@/lib/db";
import { conAuth, errorMensaje, esUuid, leerJson, responder } from "@/lib/auth";

/**
 * PUT /api/notas/plantilla/:id — modifica una plantilla del usuario.
 * Si la plantilla base la comparten otros usuarios, crea una copia propia para no alterar la de los demás.
 */
export const PUT = conAuth<{ id: string }>(async (req, sesion, { id }) => {
  if (!esUuid(id)) return errorMensaje("ID de plantilla inválido", 400);

  const b = await leerJson<Record<string, string | undefined>>(req);

  const plantillaFinalId = await transaccion(async (client) => {
    const rel = await client.query(
      `SELECT ndr.id AS rel_id, pb.novedad, pb.nota_publica, pb.nota_interna, pb.nota_avances, pb.plantilla,
              (SELECT COUNT(*)::int FROM notas_despacho_rel r WHERE r.plantilla_id = ndr.plantilla_id) AS usuarios
       FROM notas_despacho_rel ndr
       INNER JOIN plantillas_base pb ON pb.id = ndr.plantilla_id
       WHERE ndr.plantilla_id = $1 AND ndr.usuario_id = $2`,
      [id, sesion.id]
    );
    if (rel.rows.length === 0) return null;

    const row = rel.rows[0];
    if (row.usuarios <= 1) {
      await client.query(
        `UPDATE plantillas_base SET
           novedad      = COALESCE($1, novedad),
           nota_publica = COALESCE($2, nota_publica),
           nota_interna = COALESCE($3, nota_interna),
           nota_avances = COALESCE($4, nota_avances),
           plantilla    = COALESCE($5, plantilla)
         WHERE id = $6`,
        [b.novedad ?? null, b.nota_publica ?? null, b.nota_interna ?? null, b.nota_avances ?? null, b.plantilla ?? null, id]
      );
      return id;
    }

    const nuevoId = randomUUID();
    await client.query(
      `INSERT INTO plantillas_base (id, novedad, nota_publica, nota_interna, nota_avances, plantilla)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        nuevoId,
        b.novedad ?? row.novedad,
        b.nota_publica ?? row.nota_publica,
        b.nota_interna ?? row.nota_interna,
        b.nota_avances ?? row.nota_avances,
        b.plantilla ?? row.plantilla,
      ]
    );
    await client.query("UPDATE notas_despacho_rel SET plantilla_id = $1 WHERE id = $2", [nuevoId, row.rel_id]);
    return nuevoId;
  });

  if (!plantillaFinalId) return errorMensaje("Plantilla no encontrada", 404);

  return responder({
    mensaje: "Plantilla actualizada correctamente",
    plantilla_id: plantillaFinalId,
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

