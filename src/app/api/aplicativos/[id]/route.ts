import { randomUUID } from "crypto";
import { transaccion } from "@/lib/db";
import { conAuth, errorMensaje, esUuid, leerJson, responder } from "@/lib/auth";

/**
 * PUT /api/aplicativos/:id (id = relación) — edita un aplicativo del usuario.
 * (Esta ruta no existía en el backend aunque el botón "Editar" la llamaba.)
 * Si el aplicativo base lo comparten otros usuarios, se crea una copia propia para no alterarles el suyo.
 */
export const PUT = conAuth<{ id: string }>(async (req, sesion, { id }) => {
  if (!esUuid(id)) return errorMensaje("ID de aplicativo inválido", 400);

  const { nombre, url, categoria } = await leerJson<{ nombre?: string; url?: string; categoria?: string }>(req);
  if (!nombre?.trim()) return errorMensaje("Se requiere nombre", 400);

  const ok = await transaccion(async (client) => {
    const rel = await client.query(
      `SELECT aplicativo_base_id,
              (SELECT COUNT(*)::int FROM aplicativos_rel r WHERE r.aplicativo_base_id = ar.aplicativo_base_id) AS usuarios
       FROM aplicativos_rel ar WHERE ar.id = $1 AND ar.usuario_id = $2`,
      [id, sesion.id]
    );
    if (rel.rows.length === 0) return false;

    const { aplicativo_base_id, usuarios } = rel.rows[0];
    if (usuarios <= 1) {
      await client.query("UPDATE aplicativos_base SET nombre=$1, url=$2, categoria=$3 WHERE id=$4", [
        nombre.trim(), url ?? "", categoria || "Personalizado", aplicativo_base_id,
      ]);
    } else {
      const nuevoId = randomUUID();
      await client.query("INSERT INTO aplicativos_base (id, nombre, url, categoria) VALUES ($1,$2,$3,$4)", [
        nuevoId, nombre.trim(), url ?? "", categoria || "Personalizado",
      ]);
      await client.query("UPDATE aplicativos_rel SET aplicativo_base_id = $1 WHERE id = $2", [nuevoId, id]);
    }
    return true;
  });

  if (!ok) return errorMensaje("Aplicativo no encontrado para este usuario", 404);
  return responder({ mensaje: "Aplicativo actualizado correctamente" });
});

/** DELETE /api/aplicativos/:id (id = relación) — quita el aplicativo al usuario; borra el base si queda huérfano. */
export const DELETE = conAuth<{ id: string }>(async (_req, sesion, { id }) => {
  if (!esUuid(id)) return errorMensaje("ID de aplicativo inválido", 400);

  const resultado = await transaccion(async (client) => {
    const rel = await client.query(
      `DELETE FROM aplicativos_rel WHERE id = $1 AND usuario_id = $2 RETURNING aplicativo_base_id`,
      [id, sesion.id]
    );
    if (rel.rowCount === 0) return null;

    const baseId = rel.rows[0].aplicativo_base_id;
    const nombre = (await client.query("SELECT nombre FROM aplicativos_base WHERE id = $1", [baseId])).rows[0]?.nombre;
    const borrado = await client.query(
      `DELETE FROM aplicativos_base ab
       WHERE ab.id = $1 AND NOT EXISTS (SELECT 1 FROM aplicativos_rel r WHERE r.aplicativo_base_id = ab.id)`,
      [baseId]
    );
    return { eliminado: (borrado.rowCount ?? 0) > 0, nombre };
  });

  if (!resultado) return errorMensaje("Aplicativo no encontrado para este usuario", 404);
  return responder({
    mensaje: "Aplicativo eliminado correctamente",
    aplicativo_eliminado: resultado.eliminado,
    aplicativo_nombre: resultado.nombre,
  });
});

