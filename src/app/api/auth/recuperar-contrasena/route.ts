import { pool } from "@/lib/db";
import {
  errorMensaje,
  hashearContrasena,
  leerJson,
  responder,
  sinAuth,
  verificarContrasena,
} from "@/lib/auth";

/**
 * Recuperar contraseña: ahora EXIGE la contraseña actual (antes cualquiera podía
 * cambiar la contraseña de cualquier correo solo conociendo el email).
 */
export const PUT = sinAuth(async (req) => {
  const { email, actual, nueva } = await leerJson<{ email?: string; actual?: string; nueva?: string }>(req);

  if (!email || !actual || !nueva) {
    return errorMensaje("Correo, contraseña actual y nueva contraseña son obligatorios", 400);
  }
  if (nueva.length < 6) return errorMensaje("La nueva contraseña debe tener al menos 6 caracteres", 400);

  const resultado = await pool.query(
    'SELECT id, "contraseña" AS hash FROM usuarios WHERE LOWER(email) = $1',
    [email.trim().toLowerCase()]
  );
  const usuario = resultado.rows[0];

  const { valida } = await verificarContrasena(usuario?.hash ?? null, actual);
  // Mismo mensaje exista o no el correo (evita enumerar usuarios)
  if (!usuario || !valida) return errorMensaje("Correo o contraseña actual incorrectos", 401);

  await pool.query('UPDATE usuarios SET "contraseña" = $1 WHERE id = $2', [
    await hashearContrasena(nueva),
    usuario.id,
  ]);
  return responder({ mensaje: "Contraseña cambiada correctamente" });
});

