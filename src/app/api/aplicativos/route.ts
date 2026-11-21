import { randomUUID } from "crypto";
import { pool, transaccion } from "@/lib/db";
import { conAuth, errorMensaje, leerJson, responder } from "@/lib/auth";

/** GET /api/aplicativos — aplicativos del usuario autenticado. */
export const GET = conAuth(async (_req, sesion) => {
  const resultado = await pool.query(
    `SELECT ar.id, ab.nombre, ab.url, ab.categoria, ar.creado_en
     FROM aplicativos_rel ar
     INNER JOIN aplicativos_base ab ON ar.aplicativo_base_id = ab.id
     WHERE ar.usuario_id = $1
     ORDER BY ar.creado_en DESC`,
    [sesion.id]
  );
  return responder(resultado.rows);
});

/** POST /api/aplicativos — crea un aplicativo personalizado y lo asigna al usuario. */
export const POST = conAuth(async (req, sesion) => {
  const { nombre, url, categoria } = await leerJson<{ nombre?: string; url?: string; categoria?: string }>(req);
  if (!nombre?.trim()) return errorMensaje("Se requiere nombre como mínimo", 400);

  const aplicativoId = randomUUID();
  const relacionId = randomUUID();

  await transaccion(async (client) => {
    await client.query(
      "INSERT INTO aplicativos_base (id, nombre, url, categoria) VALUES ($1,$2,$3,$4)",
      [aplicativoId, nombre.trim(), url ?? "", categoria || "Personalizado"]
    );
    await client.query(
      "INSERT INTO aplicativos_rel (id, usuario_id, aplicativo_base_id, creado_en) VALUES ($1,$2,$3,NOW())",
      [relacionId, sesion.id, aplicativoId]
    );
  });

  return responder(
    { mensaje: "Aplicativo personalizado creado exitosamente", id: relacionId, aplicativo_base_id: aplicativoId },
    201
  );
});

