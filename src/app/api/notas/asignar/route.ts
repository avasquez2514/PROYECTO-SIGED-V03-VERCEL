import { randomUUID } from "crypto";
import { pool } from "@/lib/db";
import { BASE_PLANTILLAS } from "@/lib/defaults";
import { conAuth, errorMensaje, esUuid, leerJson, responder } from "@/lib/auth";

/** POST /api/notas/asignar — asigna al usuario una plantilla base existente. */
export const POST = conAuth(async (req, sesion) => {
  const { plantilla_id } = await leerJson<{ plantilla_id?: string }>(req);
  if (!esUuid(plantilla_id)) return errorMensaje("Se requiere un plantilla_id válido", 400);

  // Solo se pueden asignar plantillas base (o las que el usuario ya tenga), no notas privadas ajenas.
  const plantilla = await pool.query(
    `SELECT 1 FROM plantillas_base pb WHERE pb.id = $1 AND ${BASE_PLANTILLAS}`,
    [plantilla_id]
  );
  if (plantilla.rows.length === 0) return errorMensaje("Plantilla base no encontrada", 404);

  const existe = await pool.query(
    "SELECT 1 FROM notas_despacho_rel WHERE usuario_id = $1 AND plantilla_id = $2",
    [sesion.id, plantilla_id]
  );
  if (existe.rows.length > 0) return errorMensaje("La nota ya está agregada para este usuario", 409);

  const id = randomUUID();
  await pool.query(
    "INSERT INTO notas_despacho_rel (id, usuario_id, plantilla_id, creado_en) VALUES ($1,$2,$3,NOW())",
    [id, sesion.id, plantilla_id]
  );
  return responder({ mensaje: "Nota asignada exitosamente", id }, 201);
});

