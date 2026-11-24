import { randomUUID } from "crypto";
import type { PoolClient } from "pg";

/**
 * Condición SQL para identificar contenido "base" (compartido) y no el creado por un
 * usuario concreto: un registro personalizado solo tiene UNA relación; los base tienen
 * ninguna o varias. Evita que un usuario nuevo reciba las notas/aplicativos privados de otros.
 */
export const EMAIL_APLICATIVOS_DEFECTO = "anderzon.0077@gmail.com";

export const BASE_PLANTILLAS = `(SELECT COUNT(*) FROM notas_despacho_rel r WHERE r.plantilla_id = pb.id) <> 1`;
export const BASE_APLICATIVOS = `(
  (SELECT COUNT(*) FROM aplicativos_rel r WHERE r.aplicativo_base_id = ab.id) <> 1
  OR EXISTS (
    SELECT 1 FROM aplicativos_rel r
    INNER JOIN usuarios u ON u.id = r.usuario_id
    WHERE r.aplicativo_base_id = ab.id AND LOWER(u.email) = '${EMAIL_APLICATIVOS_DEFECTO}'
  )
)`;

const APLICATIVOS_DEFECTO = [
  { nombre: "Gmail", url: "https://mail.google.com", categoria: "Correo" },
  { nombre: "Google Drive", url: "https://drive.google.com", categoria: "Almacenamiento" },
  { nombre: "Google Calendar", url: "https://calendar.google.com", categoria: "Calendario" },
  { nombre: "Microsoft Office", url: "https://office.com", categoria: "Productividad" },
  { nombre: "WhatsApp Web", url: "https://web.whatsapp.com", categoria: "Comunicación" },
];

const PLANTILLAS_DEFECTO = [
  { novedad: "Bienvenida", plantilla: "Plantilla de bienvenida para nuevos usuarios" },
  { novedad: "Nota General", plantilla: "Plantilla general para uso diario" },
  { novedad: "Recordatorio", plantilla: "Plantilla para recordatorios importantes" },
];

/** Crea el catálogo base si la tabla está vacía. */
async function asegurarCatalogos(client: PoolClient) {
  const apps = await client.query("SELECT COUNT(*)::int AS n FROM aplicativos_base");
  if (apps.rows[0].n === 0) {
    for (const a of APLICATIVOS_DEFECTO) {
      await client.query(
        "INSERT INTO aplicativos_base (id, nombre, url, categoria) VALUES ($1,$2,$3,$4)",
        [randomUUID(), a.nombre, a.url, a.categoria]
      );
    }
  }
  const plantillas = await client.query("SELECT COUNT(*)::int AS n FROM plantillas_base");
  if (plantillas.rows[0].n === 0) {
    for (const p of PLANTILLAS_DEFECTO) {
      await client.query(
        `INSERT INTO plantillas_base (id, novedad, nota_publica, nota_interna, nota_avances, plantilla)
         VALUES ($1,$2,'...','...','...',$3)`,
        [randomUUID(), p.novedad, p.plantilla]
      );
    }
  }
}

/** Asigna a un usuario el contenido base que aún no tenga (idempotente). */
export async function asignarContenidoPorDefecto(client: PoolClient, usuarioId: string) {
  await asegurarCatalogos(client);

  await client.query(
    `INSERT INTO notas_despacho_rel (id, usuario_id, plantilla_id, creado_en)
     SELECT gen_random_uuid(), $1, pb.id, NOW()
     FROM plantillas_base pb
     WHERE ${BASE_PLANTILLAS}
       AND UPPER(pb.novedad) <> 'AVANCE'
       AND NOT EXISTS (SELECT 1 FROM notas_despacho_rel x WHERE x.usuario_id = $1 AND x.plantilla_id = pb.id)`,
    [usuarioId]
  );

  // Si existe el usuario de referencia (anderzon.0077@gmail.com) con aplicativos,
  // asignamos exactamente sus aplicativos como predeterminados para el nuevo usuario.
  const adminRes = await client.query(
    `SELECT u.id,
            (SELECT COUNT(*)::int FROM aplicativos_rel ar WHERE ar.usuario_id = u.id) AS total_apps
     FROM usuarios u
     WHERE LOWER(u.email) = $1
     LIMIT 1`,
    [EMAIL_APLICATIVOS_DEFECTO]
  );

  const admin = adminRes.rows[0];
  if (admin && admin.id !== usuarioId && admin.total_apps > 0) {
    await client.query(
      `INSERT INTO aplicativos_rel (id, usuario_id, aplicativo_base_id, creado_en)
       SELECT gen_random_uuid(), $1, ar.aplicativo_base_id, NOW()
       FROM aplicativos_rel ar
       WHERE ar.usuario_id = $2
         AND NOT EXISTS (
           SELECT 1 FROM aplicativos_rel x
           WHERE x.usuario_id = $1 AND x.aplicativo_base_id = ar.aplicativo_base_id
         )`,
      [usuarioId, admin.id]
    );
  } else {
    await client.query(
      `INSERT INTO aplicativos_rel (id, usuario_id, aplicativo_base_id, creado_en)
       SELECT gen_random_uuid(), $1, ab.id, NOW()
       FROM aplicativos_base ab
       WHERE ${BASE_APLICATIVOS}
         AND NOT EXISTS (SELECT 1 FROM aplicativos_rel x WHERE x.usuario_id = $1 AND x.aplicativo_base_id = ab.id)`,
      [usuarioId]
    );
  }
}

