import { randomUUID } from "crypto";
import { pool } from "@/lib/db";
import { BASE_APLICATIVOS } from "@/lib/defaults";
import { conAuth, errorMensaje, esUuid, leerJson, responder } from "@/lib/auth";

/** POST /api/aplicativos/asignar — asigna un aplicativo base existente al usuario. */
export const POST = conAuth(async (req, sesion) => {
  const { aplicativo_base_id } = await leerJson<{ aplicativo_base_id?: string }>(req);
  if (!esUuid(aplicativo_base_id)) return errorMensaje("Se requiere un aplicativo_base_id válido", 400);

  const base = await pool.query(`SELECT 1 FROM aplicativos_base ab WHERE ab.id = $1 AND ${BASE_APLICATIVOS}`, [
    aplicativo_base_id,
  ]);
  if (base.rows.length === 0) return errorMensaje("Aplicativo base no encontrado", 404);

  const existe = await pool.query(
    "SELECT 1 FROM aplicativos_rel WHERE usuario_id = $1 AND aplicativo_base_id = $2",
    [sesion.id, aplicativo_base_id]
  );
  if (existe.rows.length > 0) return errorMensaje("El aplicativo ya está agregado para este usuario", 409);

  const id = randomUUID();
  await pool.query(
    "INSERT INTO aplicativos_rel (id, usuario_id, aplicativo_base_id, creado_en) VALUES ($1,$2,$3,NOW())",
    [id, sesion.id, aplicativo_base_id]
  );
  return responder({ mensaje: "Aplicativo asignado exitosamente", id }, 201);
});

