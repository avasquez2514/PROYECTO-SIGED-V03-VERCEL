import { randomUUID } from "crypto";
import { transaccion } from "@/lib/db";
import { conAuth, errorMensaje, leerJson, responder } from "@/lib/auth";

/** POST /api/notas — crea una plantilla/nota personalizada y la asigna al usuario del token. */
export const POST = conAuth(async (req, sesion) => {
  const body = await leerJson<{
    novedad?: string;
    nota_publica?: string;
    nota_interna?: string;
    nota_avances?: string;
    plantilla?: string;
  }>(req);

  const novedad = body.novedad?.trim();
  if (!novedad) return errorMensaje("Se requiere novedad como mínimo", 400);

  if (novedad.toUpperCase() === "AVANCE") {
    return errorMensaje("El nombre 'AVANCE' no es válido para una plantilla base. Use un nombre descriptivo.", 400);
  }

  const plantillaId = randomUUID();
  const relacionId = randomUUID();

  await transaccion(async (client) => {
    await client.query(
      `INSERT INTO plantillas_base (id, novedad, nota_publica, nota_interna, nota_avances, plantilla)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [plantillaId, novedad, body.nota_publica ?? "", body.nota_interna ?? "", body.nota_avances ?? "", body.plantilla ?? ""]
    );
    await client.query(
      "INSERT INTO notas_despacho_rel (id, usuario_id, plantilla_id, creado_en) VALUES ($1,$2,$3,NOW())",
      [relacionId, sesion.id, plantillaId]
    );
  });

  return responder({ mensaje: "Nota personalizada creada exitosamente", id: relacionId, plantilla_id: plantillaId }, 201);
});

